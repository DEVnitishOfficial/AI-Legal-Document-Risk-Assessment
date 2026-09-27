import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis";

export const ANALYSIS_QUEUE_NAME = "document-analysis";

export interface AnalysisJobData {
  documentId: number;
}

export const analysisQueue = new Queue<AnalysisJobData>(ANALYSIS_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    // Keep Redis from accumulating job history forever.
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
});

/**
 * Enqueues a background analysis run for a document. A deterministic jobId
 * (one per document) makes this safe to call more than once for the same
 * document while a job is already waiting/active — BullMQ refuses the
 * duplicate rather than running the analysis twice.
 */
export const enqueueAnalysis = async (documentId: number): Promise<void> => {
  await analysisQueue.add("analyze", { documentId }, { jobId: `analysis-${documentId}` });
};
