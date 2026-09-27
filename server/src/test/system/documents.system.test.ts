import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, cleanupUser, registerAndLogin } from "./testUtils";

// Document CRUD plus the ownership (IDOR) guard, against the real app and a
// real test database. Two independent users are used throughout to prove
// one user can never read, rename or delete another user's document — this
// exact gap was a real bug in this codebase's history (see server/README.md).
describe("Document CRUD and ownership", () => {
  let userA: Awaited<ReturnType<typeof registerAndLogin>>;
  let userB: Awaited<ReturnType<typeof registerAndLogin>>;
  let documentId: number;

  const SAMPLE_LEASE = `RESIDENTIAL LEASE AGREEMENT. The Landlord may terminate this lease at any
time with 24 hours notice. The security deposit is non-refundable under any
circumstances. The Tenant waives all rights to approach any court of law.`;

  beforeAll(async () => {
    userA = await registerAndLogin("docs-owner");
    userB = await registerAndLogin("docs-intruder");
  });

  afterAll(async () => {
    await cleanupUser(userA.email);
    await cleanupUser(userB.email);
  });

  it("rejects pasted text under the 50-character minimum", async () => {
    const res = await request(app)
      .post("/api/v1/documents/text")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "too short" });

    expect(res.status).toBe(400);
  });

  it("rejects an unauthenticated request outright", async () => {
    const res = await request(app).post("/api/v1/documents/text").send({ content: SAMPLE_LEASE });
    expect(res.status).toBe(401);
  });

  it("creates a text document for the authenticated user", async () => {
    const res = await request(app)
      .post("/api/v1/documents/text")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: SAMPLE_LEASE });

    expect(res.status).toBe(201);
    expect(res.body.data.document.userId).toBe(userA.userId);
    documentId = res.body.data.document.id;
    expect(typeof documentId).toBe("number");
  });

  it("lets the owner read their own document", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.document.id).toBe(documentId);
  });

  it("blocks a different user from reading it (403, not a leaked 404)", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(res.status).toBe(403);
  });

  it("blocks a different user from renaming it", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Hijacked title" });

    expect(res.status).toBe(403);
  });

  it("lets the owner rename it", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ title: "My Lease" });

    expect(res.status).toBe(200);
    expect(res.body.data.document.title).toBe("My Lease");
  });

  it("rejects renaming to an empty title", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ title: "   " });

    expect(res.status).toBe(400);
  });

  it("blocks a different user from deleting it", async () => {
    const res = await request(app)
      .delete(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a document id that does not exist", async () => {
    const res = await request(app)
      .get("/api/v1/documents/999999999")
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.status).toBe(404);
  });

  it("lets the owner delete it, after which it is gone for good", async () => {
    const del = await request(app)
      .delete(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(del.status).toBe(200);

    const getAfter = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(getAfter.status).toBe(404);
  });

  it("lists only the requesting user's own documents", async () => {
    const create = await request(app)
      .post("/api/v1/documents/text")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: SAMPLE_LEASE });
    const ownDocId = create.body.data.document.id;

    const listA = await request(app)
      .get("/api/v1/documents/get-documents")
      .set("Authorization", `Bearer ${userA.token}`);
    const listB = await request(app)
      .get("/api/v1/documents/get-documents")
      .set("Authorization", `Bearer ${userB.token}`);

    expect(listA.status).toBe(200);
    expect(listA.body.data.some((d: any) => d.id === ownDocId)).toBe(true);
    expect(listB.body.data.some((d: any) => d.id === ownDocId)).toBe(false);
  });
});

// document.schema.ts + common.schema.ts's idParamSchema, exercised against
// the real routes. Before the params validator existed, a non-numeric :id
// became NaN and reached Prisma unguarded on the GET routes — an unhandled
// Prisma validation error (a raw 500), not a clean 400.
describe("Document input validation", () => {
  let user: Awaited<ReturnType<typeof registerAndLogin>>;
  let docId: number;

  beforeAll(async () => {
    user = await registerAndLogin("docs-validation");
    const create = await request(app)
      .post("/api/v1/documents/text")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "x".repeat(60) });
    docId = create.body.data.document.id;
  });

  afterAll(async () => {
    await cleanupUser(user.email);
  });

  it("400s a non-numeric :id on GET instead of a raw 500", async () => {
    const res = await request(app)
      .get("/api/v1/documents/not-a-number")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });

  it("400s a non-numeric :id on PATCH", async () => {
    const res = await request(app)
      .patch("/api/v1/documents/not-a-number")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ title: "New title" });
    expect(res.status).toBe(400);
  });

  it("400s a non-numeric :id on DELETE", async () => {
    const res = await request(app)
      .delete("/api/v1/documents/not-a-number")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });

  it("400s a non-boolean isFavorite", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ isFavorite: "yes" });
    expect(res.status).toBe(400);
  });

  it("400s an update with neither title nor isFavorite", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("accepts a valid isFavorite toggle", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ isFavorite: true });
    expect(res.status).toBe(200);
    expect(res.body.data.document.isFavorite).toBe(true);
  });
});
