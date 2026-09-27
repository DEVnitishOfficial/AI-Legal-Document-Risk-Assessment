import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./analysis.repository", () => ({ getDocumentById: vi.fn() }));
vi.mock("../document/document.repository", () => ({ markDocumentProcessing: vi.fn() }));
vi.mock("./analysis.queue", () => ({ enqueueAnalysis: vi.fn() }));

import * as analysisRepo from "./analysis.repository";
import * as documentRepo from "../document/document.repository";
import * as analysisQueue from "./analysis.queue";
import { runAnalysis } from "./analysis.controller";

const mockedGetDoc = vi.mocked(analysisRepo.getDocumentById);
const mockedMarkProcessing = vi.mocked(documentRepo.markDocumentProcessing);
const mockedEnqueue = vi.mocked(analysisQueue.enqueueAnalysis);

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAnalysis controller", () => {
  it("400s when documentId is missing", async () => {
    const req: any = { body: {}, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(mockedGetDoc).not.toHaveBeenCalled();
  });

  it("404s when the document does not exist", async () => {
    mockedGetDoc.mockResolvedValue(null as any);
    const req: any = { body: { documentId: 1 }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it("403s on another user's document without ever enqueueing a job (IDOR guard)", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, userId: 999, analysis: null, status: "pending" } as any);
    const req: any = { body: { documentId: 1 }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });

  it("returns the cached analysis immediately without touching the queue", async () => {
    mockedGetDoc.mockResolvedValue({
      id: 1,
      userId: 1,
      analysis: { id: 9, riskLevel: "High" },
      status: "completed",
    } as any);
    const req: any = { body: { documentId: 1 }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { analysis: { id: 9, riskLevel: "High" }, cached: true },
    });
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });

  it("reports 'queued' without enqueueing again when a job is already processing", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, userId: 1, analysis: null, status: "processing" } as any);
    const req: any = { body: { documentId: 1 }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { status: "queued" } });
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });

  it("starts a job for a never-analyzed ('pending') document", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, userId: 1, analysis: null, status: "pending" } as any);
    const req: any = { body: { documentId: 1 }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(mockedMarkProcessing).toHaveBeenCalledWith(1);
    expect(mockedEnqueue).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it("reports failure without re-enqueueing a failed document on a plain poll (no retry flag)", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, userId: 1, analysis: null, status: "failed" } as any);
    const req: any = { body: { documentId: 1 }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { failed: true, message: expect.any(String) },
    });
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });

  it("retries a failed document when the client explicitly asks (retry: true)", async () => {
    mockedGetDoc.mockResolvedValue({ id: 1, userId: 1, analysis: null, status: "failed" } as any);
    const req: any = { body: { documentId: 1, retry: true }, user: { id: 1 } };
    const res = makeRes();
    const next = vi.fn();

    await runAnalysis(req, res, next);

    expect(mockedMarkProcessing).toHaveBeenCalledWith(1);
    expect(mockedEnqueue).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(202);
  });
});
