import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";

// Same OpenAI-mocking pattern as analysis.service.unit.test.ts (see that
// file for why `vi.hoisted` + a real constructor function are needed here).
// This is the one external dependency worth mocking even in a system test:
// it keeps the suite fast, free and deterministic while every other layer
// (HTTP routing, auth, ownership checks, Postgres reads/writes, caching)
// still runs for real.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

import { app, cleanupUser, registerAndLogin } from "./testUtils";

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

describe("Document analysis system flow", () => {
  let userA: Awaited<ReturnType<typeof registerAndLogin>>;
  let userB: Awaited<ReturnType<typeof registerAndLogin>>;
  let documentId: number;

  const SAMPLE_LEASE = `RESIDENTIAL LEASE AGREEMENT. The Landlord may terminate this lease at any
time with 24 hours notice. The security deposit is non-refundable under any
circumstances. The Tenant waives all rights to approach any court of law.`;

  beforeAll(async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(AI_RESPONSE) } }],
    });

    userA = await registerAndLogin("analysis-owner");
    userB = await registerAndLogin("analysis-intruder");

    const doc = await request(app)
      .post("/api/v1/documents/text")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: SAMPLE_LEASE });
    documentId = doc.body.data.document.id;
  });

  afterAll(async () => {
    await cleanupUser(userA.email);
    await cleanupUser(userB.email);
  });

  it("rejects a run with no documentId", async () => {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects analyzing a document that does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId: 999999999 });
    expect(res.status).toBe(404);
  });

  it("rejects analyzing another user's document (IDOR guard)", async () => {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ documentId });
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("runs a fresh analysis and derives the correct risk score", async () => {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });

    expect(res.status).toBe(200);
    expect(res.body.data.cached).toBe(false);
    expect(res.body.data.analysis.riskLevel).toBe("High");
    // Deterministic, server-side derivation (see riskScoreForLevel): High -> 90.
    expect(res.body.data.analysis.riskScore).toBe(90);
    expect(res.body.data.analysis.clauses).toEqual(AI_RESPONSE.clauses);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("returns the cached analysis on a second run without calling the AI again", async () => {
    const firstRunId = (
      await request(app)
        .post("/api/v1/analysis/run")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ documentId })
    ).body.data.analysis.id;

    mockCreate.mockClear();

    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ documentId });

    expect(res.status).toBe(200);
    expect(res.body.data.cached).toBe(true);
    expect(res.body.data.analysis.id).toBe(firstRunId);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("marks the document as completed with the AI-derived title and type", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.body.data.document.status).toBe("completed");
    expect(res.body.data.document.documentType).toBe("Rental Agreement");
  });
});
