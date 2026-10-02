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

// helmet's own defaults, confirmed present on a real response — plus the
// one deliberate override this app needs: advocate photos are loaded
// cross-origin by the client (a different port in dev), and helmet's
// default same-origin resource policy would make the browser block that.
describe("Security headers (helmet)", () => {
  it("sets baseline hardening headers on a normal API response", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    // Never the framework's identity leaking in a header.
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("overrides the resource policy to cross-origin so the client can load static assets", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("applies the same headers to the static advocate-photos route", async () => {
    // No photo needs to exist for this — helmet's headers are set on every
    // response by this middleware regardless of what express.static finds.
    const res = await request(app).get("/uploads/advocates/does-not-exist.png");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
