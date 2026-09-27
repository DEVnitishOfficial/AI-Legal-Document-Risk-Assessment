import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, cleanupUser, registerAndLogin } from "./testUtils";

// This file covers the new input-validation layer on the legal-agent
// routes, against the real app and a real test database. It deliberately
// does NOT exercise the AI-calling endpoints' success path (sendMessage,
// voice-messages) — those need the full RAG/streaming/OpenAI pipeline
// mocked, which is out of scope for a validation-layer change and is
// tracked as a known gap in TESTING.md. What's tested here (conversation
// create/update/attach, and the rejection of bad input before any AI call
// happens) needs no mocking at all: those handlers never touch OpenAI.
describe("Legal Assistant input validation", () => {
  let user: Awaited<ReturnType<typeof registerAndLogin>>;
  let otherUser: Awaited<ReturnType<typeof registerAndLogin>>;
  let conversationId: number;
  let documentId: number;

  beforeAll(async () => {
    user = await registerAndLogin("legal-agent-validation");
    otherUser = await registerAndLogin("legal-agent-validation-intruder");

    const doc = await request(app)
      .post("/api/v1/documents/text")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "x".repeat(60) });
    documentId = doc.body.data.document.id;
  });

  afterAll(async () => {
    await cleanupUser(user.email);
    await cleanupUser(otherUser.email);
  });

  describe("POST /legal-agent/conversations", () => {
    it("rejects an unauthenticated request", async () => {
      const res = await request(app).post("/api/v1/legal-agent/conversations").send({});
      expect(res.status).toBe(401);
    });

    it("defaults to English when language is omitted", async () => {
      const res = await request(app)
        .post("/api/v1/legal-agent/conversations")
        .set("Authorization", `Bearer ${user.token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.conversation.language).toBe("en");
      conversationId = res.body.data.conversation.id;
    });

    it("accepts Hindi", async () => {
      const res = await request(app)
        .post("/api/v1/legal-agent/conversations")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ language: "hi" });

      expect(res.status).toBe(201);
      expect(res.body.data.conversation.language).toBe("hi");
    });

    it("rejects an unrecognized language instead of silently defaulting", async () => {
      const res = await request(app)
        .post("/api/v1/legal-agent/conversations")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ language: "fr" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET/PATCH/DELETE /legal-agent/conversations/:id", () => {
    it("400s on a non-numeric conversation id instead of a raw 500", async () => {
      const res = await request(app)
        .get("/api/v1/legal-agent/conversations/not-a-number")
        .set("Authorization", `Bearer ${user.token}`);
      expect(res.status).toBe(400);
    });

    it("blocks a different user from reading the conversation (IDOR guard)", async () => {
      const res = await request(app)
        .get(`/api/v1/legal-agent/conversations/${conversationId}`)
        .set("Authorization", `Bearer ${otherUser.token}`);
      expect(res.status).toBe(403);
    });

    it("rejects a rename update with neither title nor language", async () => {
      const res = await request(app)
        .patch(`/api/v1/legal-agent/conversations/${conversationId}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("rejects an empty title", async () => {
      const res = await request(app)
        .patch(`/api/v1/legal-agent/conversations/${conversationId}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ title: "   " });
      expect(res.status).toBe(400);
    });

    it("applies a valid rename", async () => {
      const res = await request(app)
        .patch(`/api/v1/legal-agent/conversations/${conversationId}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ title: "My Rental Question" });
      expect(res.status).toBe(200);
      expect(res.body.data.conversation.title).toBe("My Rental Question");
    });
  });

  describe("POST /legal-agent/conversations/:id/documents", () => {
    it("rejects a missing documentId", async () => {
      const res = await request(app)
        .post(`/api/v1/legal-agent/conversations/${conversationId}/documents`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("attaches a real, owned document", async () => {
      const res = await request(app)
        .post(`/api/v1/legal-agent/conversations/${conversationId}/documents`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ documentId });
      expect(res.status).toBe(201);
    });
  });

  describe("POST /legal-agent/conversations/:id/messages", () => {
    it("rejects empty content before any AI call is made", async () => {
      const res = await request(app)
        .post(`/api/v1/legal-agent/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ content: "   " });
      expect(res.status).toBe(400);
    });

    it("rejects missing content", async () => {
      const res = await request(app)
        .post(`/api/v1/legal-agent/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
