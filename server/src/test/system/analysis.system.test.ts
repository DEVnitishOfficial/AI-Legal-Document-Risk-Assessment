import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";

// Same OpenAI-mocking pattern as analysis.service.unit.test.ts (see that
// file for why `vi.hoisted` + a real constructor function are needed here).
// This is the one external dependency worth mocking even in a system test:
// it keeps the suite fast, free and deterministic while every other layer
// (HTTP routing, auth, ownership checks, the real BullMQ queue, a real
// worker, Redis, and Postgres reads/writes) still runs for real.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

import { app, cleanupUser, registerAndLogin, pollAnalysis } from "./testUtils";
import { startAnalysisWorker, shutdownAnalysisWorker } from "../../modules/analysis/analysis.worker";

const AI_RESPONSE = {
  title: "Residential Lease Agreement",
  documentType: "Rental Agreement",
  summary: "A lease that heavily favors the landlord.",
  clauses: ["24-hour termination notice", "Non-refundable deposit"],
  riskLevel: "High",
  riskItems: [
    {
      clause: "Landlord may terminate with 24 hours notice",
      severity: "High",
      category: "Termination",
      explanation: "Gives the tenant almost no time to respond.",
    },
  ],
};

const SAMPLE_LEASE = `RESIDENTIAL LEASE AGREEMENT. The Landlord may terminate this lease at any
time with 24 hours notice. The security deposit is non-refundable under any
circumstances. The Tenant waives all rights to approach any court of law.`;

const createDocument = async (token: string) => {
  const res = await request(app)
    .post("/api/v1/documents/text")
    .set("Authorization", `Bearer ${token}`)
    .send({ content: SAMPLE_LEASE });
  return res.body.data.document.id as number;
};

describe("Document analysis system flow (real BullMQ queue + worker + Redis + Postgres)", () => {
  let userA: Awaited<ReturnType<typeof registerAndLogin>>;
  let userB: Awaited<ReturnType<typeof registerAndLogin>>;

  beforeAll(async () => {
    startAnalysisWorker();
    userA = await registerAndLogin("analysis-owner");
    userB = await registerAndLogin("analysis-intruder");
  });

  afterAll(async () => {
    await cleanupUser(userA.email);
    await cleanupUser(userB.email);
    await shutdownAnalysisWorker();
  });

  afterEach(() => {
    mockCreate.mockReset();
  });

  it("rejects a run with no documentId", async () => {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects a non-numeric or non-positive documentId (analysis.schema.ts)", async () => {
    const notANumber = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId: "not-a-number" });
    expect(notANumber.status).toBe(400);

    const negative = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId: -1 });
    expect(negative.status).toBe(400);
  });

  it("rejects analyzing a document that does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId: 999999999 });
    expect(res.status).toBe(404);
  });

  it("rejects analyzing another user's document without enqueueing any work (IDOR guard)", async () => {
    const documentId = await createDocument(userA.token);

    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ documentId });

    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("queues then completes a fresh analysis, deriving the correct risk score", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(AI_RESPONSE) } }] });
    const documentId = await createDocument(userA.token);

    const firstResponse = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });

    // The request itself only enqueues — the AI call happens afterwards, in
    // the background, so the very first response must not already contain it.
    expect(firstResponse.status).toBe(202);
    expect(firstResponse.body.data.status).toBe("queued");
    expect(firstResponse.body.data.analysis).toBeUndefined();

    const completed = await pollAnalysis(userA.token, documentId);

    expect(completed.status).toBe(200);
    expect(completed.body.data.analysis.riskLevel).toBe("High");
    // Deterministic, server-side derivation (see analysis.riskScore.ts): High -> 90.
    expect(completed.body.data.analysis.riskScore).toBe(90);
    expect(completed.body.data.analysis.clauses).toEqual(AI_RESPONSE.clauses);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const docRes = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(docRes.body.data.document.status).toBe("completed");
    expect(docRes.body.data.document.documentType).toBe("Rental Agreement");
  }, 20000);

  it("returns the cached analysis on a later call without calling the AI again", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(AI_RESPONSE) } }] });
    const documentId = await createDocument(userA.token);

    const completed = await pollAnalysis(userA.token, documentId);
    const firstRunId = completed.body.data.analysis.id;
    mockCreate.mockClear();

    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });

    expect(res.status).toBe(200);
    expect(res.body.data.cached).toBe(true);
    expect(res.body.data.analysis.id).toBe(firstRunId);
    expect(mockCreate).not.toHaveBeenCalled();
  }, 20000);

  it("does not run the analysis twice for two concurrent requests on the same fresh document", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(AI_RESPONSE) } }] });
    const documentId = await createDocument(userA.token);

    const post = () =>
      request(app).post("/api/v1/analysis/run").set("Authorization", `Bearer ${userA.token}`).send({ documentId });

    // Fired back-to-back, before either has a chance to flip the document's
    // status to "processing" — the queue's deterministic per-document jobId
    // (see analysis.queue.ts) must still prevent a duplicate job.
    const [resA, resB] = await Promise.all([post(), post()]);
    expect([resA.status, resB.status]).toEqual([202, 202]);

    await pollAnalysis(userA.token, documentId);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  }, 20000);

  it("retries a transient AI failure and eventually succeeds", async () => {
    let calls = 0;
    mockCreate.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw new Error("simulated transient network failure");
      return { choices: [{ message: { content: JSON.stringify(AI_RESPONSE) } }] };
    });
    const documentId = await createDocument(userA.token);

    await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });

    // The queue's backoff (analysis.queue.ts: exponential, 5s base) means
    // the retry doesn't happen instantly — poll generously.
    const completed = await pollAnalysis(userA.token, documentId, { timeoutMs: 25000 });

    expect(completed.body.data.analysis.riskLevel).toBe("High");
    expect(calls).toBeGreaterThanOrEqual(2);
  }, 30000);

  it("fails the document (without endless silent retries) when no attempt can ever succeed", async () => {
    mockCreate.mockRejectedValue(new Error("permanently broken"));
    const documentId = await createDocument(userA.token);

    await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });

    const result = await pollAnalysis(userA.token, documentId, { timeoutMs: 30000 });

    expect(result.body.data.failed).toBe(true);
    // 3 configured attempts (analysis.queue.ts's defaultJobOptions).
    expect(mockCreate).toHaveBeenCalledTimes(3);

    // Polling again afterwards must not silently re-enqueue and retry forever.
    mockCreate.mockClear();
    const again = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });
    expect(again.body.data.failed).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  }, 35000);
});
