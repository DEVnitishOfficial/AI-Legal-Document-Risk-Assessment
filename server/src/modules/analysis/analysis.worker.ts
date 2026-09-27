import { Job, UnrecoverableError, Worker } from "bullmq";
import { redisConnection } from "../../config/redis";
import { ANALYSIS_QUEUE_NAME, AnalysisJobData } from "./analysis.queue";
import { getDocumentById, createAnalysis } from "./analysis.repository";
import { markDocumentAnalyzed, markDocumentFailed } from "../document/document.repository";
import { analyzeDocument } from "./analysis.service";
import { riskScoreForLevel } from "./analysis.riskScore";
import { extractDocumentText, MIN_USABLE_TEXT_LENGTH } from "./analysis.textExtraction";

// How many analyses can run at once. Caps both the OpenAI request rate (a
// runaway burst of uploads can't turn into a wall of simultaneous API
// calls/costs) and local CPU load from OCR, which is genuinely heavy.
const ANALYSIS_CONCURRENCY = 3;

/**
 * Does the actual work for one document: extract text (falling back to OCR
 * when needed), send it to the AI, and persist the result. Exported
 * separately from the BullMQ wiring below so it can be unit tested by
 * calling it directly, with no real queue/Redis involved.
 *
 * Returns quietly (does nothing) if the document was deleted or already
 * analyzed by the time this runs — both are "nothing to do", not failures.
 */
export const processAnalysisJob = async (data: AnalysisJobData) => {
  const { documentId } = data;

  const doc = await getDocumentById(documentId);
  if (!doc) {
    console.log(`Analysis job for document ${documentId}: document no longer exists, skipping.`);
    return;
  }
  if (doc.analysis) {
    console.log(`Analysis job for document ${documentId}: already analyzed, skipping.`);
    return;
  }

  let extracted;
  try {
    extracted = await extractDocumentText(doc);
  } catch (err: any) {
    // A file we genuinely can't read (corrupt PDF, unreadable image) will
    // never succeed on retry — fail it once, not three times.
    throw new UnrecoverableError(`Could not read this document's content: ${err?.message ?? err}`);
  }

  if (!extracted.text || extracted.text.trim().length < MIN_USABLE_TEXT_LENGTH) {
    throw new UnrecoverableError(
      "No readable text could be found in this document, even after OCR."
    );
  }

  // From here on, a failure (OpenAI network blip, rate limit, malformed
  // response) is genuinely worth retrying — let it propagate as a normal
  // Error so BullMQ's backoff applies.
  const aiResult = await analyzeDocument(extracted.text);

  const saved = await createAnalysis(documentId, {
    summary: aiResult.summary,
    riskLevel: aiResult.riskLevel,
    riskScore: riskScoreForLevel(aiResult.riskLevel),
    clauses: aiResult.clauses,
    riskItems: aiResult.riskItems,
  });

  await markDocumentAnalyzed(documentId, aiResult.title, aiResult.documentType);

  return saved;
};

/**
 * The function actually registered with BullMQ. Wraps processAnalysisJob
 * with the DB bookkeeping for a failure: only flips the document to
 * "failed" once nothing more will be retried (an UnrecoverableError, or the
 * last configured attempt) — not on every transient retry in between,
 * which would otherwise flicker a client's polling view between
 * "processing" and "failed" while a retry is still pending.
 */
export const analysisJobProcessor = async (job: Job<AnalysisJobData>) => {
  try {
    return await processAnalysisJob(job.data);
  } catch (err) {
    const maxAttempts = job.opts.attempts ?? 1;
    // `job.attemptsMade` counts attempts completed *before* this one (0 on
    // the first attempt, 1 on the second, ...), not the current attempt
    // number — confirmed empirically against a real BullMQ job, since this
    // is easy to get off-by-one on. The attempt this catch block is
    // handling is therefore attemptsMade + 1.
    const isFinalAttempt = err instanceof UnrecoverableError || job.attemptsMade + 1 >= maxAttempts;

    if (isFinalAttempt) {
      await markDocumentFailed(job.data.documentId).catch((markErr) =>
        console.error(`Could not mark document ${job.data.documentId} as failed:`, markErr)
      );
    }

    throw err;
  }
};

let worker: Worker<AnalysisJobData> | null = null;

export const startAnalysisWorker = (): Worker<AnalysisJobData> => {
  if (worker) return worker;

  worker = new Worker<AnalysisJobData>(ANALYSIS_QUEUE_NAME, analysisJobProcessor, {
    connection: redisConnection,
    concurrency: ANALYSIS_CONCURRENCY,
  });

  worker.on("failed", (job, err) => {
    console.error(`Analysis job for document ${job?.data.documentId} failed:`, err.message);
  });

  console.log(`📄 Document analysis worker started (concurrency ${ANALYSIS_CONCURRENCY})`);
  return worker;
};

export const shutdownAnalysisWorker = async (): Promise<void> => {
  await worker?.close();
  worker = null;
};
