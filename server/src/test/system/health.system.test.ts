import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./testUtils";

describe("Baseline app wiring", () => {
  it("GET /health reports the server is up", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Server is running");
  });

  it("GET /api/v1 confirms the versioned API root", async () => {
    const res = await request(app).get("/api/v1");
    expect(res.status).toBe(200);
  });

  it("returns a clean 404 JSON body for an unknown route instead of an HTML stack trace", async () => {
    const res = await request(app).get("/api/v1/this-route-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("guards a protected module route (advocates) behind auth", async () => {
    const res = await request(app).get("/api/v1/advocates");
    expect(res.status).toBe(401);
  });
});
