import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnrecoverableError } from "bullmq";

vi.mock("./analysis.repository", () => ({
  getDocumentById: vi.fn(),
  createAnalysis: vi.fn(),
}));
vi.mock("../document/document.repository", () => ({
  markDocumentAnalyzed: vi.fn(),
  markDocumentFailed: vi.fn(),
}));
vi.mock("./analysis.service", () => ({ analyzeDocument: vi.fn() }));
vi.mock("./analysis.textExtraction", () => ({
  extractDocumentText: vi.fn(),
  MIN_USABLE_TEXT_LENGTH: 50,
}));

import * as analysisRepo from "./analysis.repository";
import * as documentRepo from "../document/document.repository";
import { analyzeDocument } from "./analysis.service";
import { extractDocumentText } from "./analysis.textExtraction";
import { processAnalysisJob, analysisJobProcessor } from "./analysis.worker";

const mockedGetDoc = vi.mocked(analysisRepo.getDocumentById);
const mockedCreateAnalysis = vi.mocked(analysisRepo.createAnalysis);
const mockedMarkAnalyzed = vi.mocked(documentRepo.markDocumentAnalyzed);
const mockedMarkFailed = vi.mocked(documentRepo.markDocumentFailed);
const mockedAnalyze = vi.mocked(analyzeDocument);
const mockedExtract = vi.mocked(extractDocumentText);

beforeEach(() => {
  vi.clearAllMocks();
  // Baseline: the real repository functions are always `async` (always
  // return a genuine Promise, even resolving to undefined). A bare
  // `vi.fn()` returns `undefined` itself, which breaks
  // analysisJobProcessor's `markDocumentFailed(...).catch(...)` chaining —
  // set a resolved-Promise default here so only the return *value* needs
  // overriding per test, not its Promise-ness.
  mockedMarkFailed.mockResolvedValue(undefined as any);
  mockedMarkAnalyzed.mockResolvedValue(undefined as any);
});

describe("processAnalysisJob", () => {
  it("does nothing when the document was deleted before the job ran", async () => {
    mockedGetDoc.mockResolvedValue(null as any);
    await processAnalysisJob({ documentId: 1 });
    expect(mockedExtract).not.toHaveBeenCalled();
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("does nothing when the document was already analyzed (duplicate/late job)", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: { id: 9 } } as any);
    await processAnalysisJob({ documentId: 1 });
    expect(mockedExtract).not.toHaveBeenCalled();
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("throws UnrecoverableError when extraction itself fails (corrupt file)", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: "x.pdf", content: null } as any);
    mockedExtract.mockRejectedValue(new Error("bad pdf"));

    await expect(processAnalysisJob({ documentId: 1 })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("throws UnrecoverableError when no usable text is found even after OCR", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: "x.pdf", content: null } as any);
    mockedExtract.mockResolvedValue({ text: "too short", usedOcr: true });

    await expect(processAnalysisJob({ documentId: 1 })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("lets a genuine AI-call error propagate as a normal (retryable) Error", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: null, content: "x".repeat(60) } as any);
    mockedExtract.mockResolvedValue({ text: "x".repeat(60), usedOcr: false });
    mockedAnalyze.mockRejectedValue(new Error("OpenAI request failed"));

    await expect(processAnalysisJob({ documentId: 1 })).rejects.toThrow("OpenAI request failed");
    // Not an UnrecoverableError — this is exactly the case BullMQ should retry.
    await expect(processAnalysisJob({ documentId: 1 })).rejects.not.toBeInstanceOf(UnrecoverableError);
  });

  it("saves the analysis and marks the document analyzed on success", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: null, content: "x".repeat(60) } as any);
    mockedExtract.mockResolvedValue({ text: "x".repeat(60), usedOcr: false });
    mockedAnalyze.mockResolvedValue({
      title: "A Lease",
      documentType: "Rental Agreement",
      summary: "summary",
      clauses: ["c1"],
      riskLevel: "High",
      riskItems: [],
    });
    mockedCreateAnalysis.mockResolvedValue({ id: 5, riskLevel: "High" } as any);

    const result = await processAnalysisJob({ documentId: 1 });

    expect(mockedCreateAnalysis).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ riskLevel: "High", riskScore: 90 })
    );
    expect(mockedMarkAnalyzed).toHaveBeenCalledWith(1, "A Lease", "Rental Agreement");
    expect(result).toEqual({ id: 5, riskLevel: "High" });
  });
});

describe("analysisJobProcessor (BullMQ retry/failure bookkeeping)", () => {
  // `job.attemptsMade` counts attempts completed *before* the one currently
  // running — 0 on the first attempt, 1 on the second, 2 on the third —
  // confirmed against a real BullMQ job (not documented clearly, and easy
  // to get off-by-one on; see the comment in analysisJobProcessor).
  const fakeJob = (overrides: Partial<{ attemptsMade: number; attempts: number }> = {}) =>
    ({
      data: { documentId: 1 },
      attemptsMade: overrides.attemptsMade ?? 0,
      opts: { attempts: overrides.attempts ?? 3 },
    }) as any;

  it("does not mark the document failed on a retryable error before the last attempt", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: null, content: "x".repeat(60) } as any);
    mockedExtract.mockResolvedValue({ text: "x".repeat(60), usedOcr: false });
    mockedAnalyze.mockRejectedValue(new Error("transient failure"));

    // Second of 3 attempts (attemptsMade: 1 -> currently on attempt 2).
    await expect(analysisJobProcessor(fakeJob({ attemptsMade: 1, attempts: 3 }))).rejects.toThrow();
    expect(mockedMarkFailed).not.toHaveBeenCalled();
  });

  it("marks the document failed once the final attempt is reached", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: null, content: "x".repeat(60) } as any);
    mockedExtract.mockResolvedValue({ text: "x".repeat(60), usedOcr: false });
    mockedAnalyze.mockRejectedValue(new Error("still failing"));

    // Third (final) of 3 attempts (attemptsMade: 2 -> currently on attempt 3).
    await expect(analysisJobProcessor(fakeJob({ attemptsMade: 2, attempts: 3 }))).rejects.toThrow();
    expect(mockedMarkFailed).toHaveBeenCalledWith(1);
  });

  it("marks the document failed immediately for an unrecoverable error, even on the first attempt", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: null, content: "" } as any);
    mockedExtract.mockResolvedValue({ text: "", usedOcr: false });

    await expect(analysisJobProcessor(fakeJob({ attemptsMade: 0, attempts: 3 }))).rejects.toBeInstanceOf(
      UnrecoverableError
    );
    expect(mockedMarkFailed).toHaveBeenCalledWith(1);
  });

  it("does not mark the document failed on success", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, analysis: null, filePath: null, content: "x".repeat(60) } as any);
    mockedExtract.mockResolvedValue({ text: "x".repeat(60), usedOcr: false });
    mockedAnalyze.mockResolvedValue({
      title: null,
      documentType: "Other",
      summary: "s",
      clauses: [],
      riskLevel: "Low",
      riskItems: [],
    });
    mockedCreateAnalysis.mockResolvedValue({ id: 1 } as any);

    await analysisJobProcessor(fakeJob());
    expect(mockedMarkFailed).not.toHaveBeenCalled();
  });
});
