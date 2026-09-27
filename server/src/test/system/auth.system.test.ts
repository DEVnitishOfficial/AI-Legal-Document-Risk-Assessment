import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app, cleanupUser, uniqueEmail, TEST_PASSWORD } from "./testUtils";

// Full register -> login -> protected-route flow against the real Express
// app and a real (dedicated test) Postgres database — no mocks in this file.
describe("Auth system flow", () => {
  const email = uniqueEmail("auth-flow");

  afterAll(async () => {
    await cleanupUser(email);
  });

  it("registers a new user and never returns the password hash", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send({ name: "Auth Flow User", email, password: TEST_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("refuses a second registration with the same email", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send({ name: "Duplicate", email, password: TEST_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("refuses login with the wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email, password: "definitely-wrong" });

    expect(res.status).toBe(401);
  });

  it("refuses login for an email that was never registered", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: uniqueEmail("never-registered"), password: TEST_PASSWORD });

    expect(res.status).toBe(404);
  });

  it("logs in with correct credentials and returns a usable token", async () => {
    const res = await request(app).post("/api/v1/users/login").send({ email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it("refuses a protected route with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });

  it("refuses a protected route with a garbage token", async () => {
    const res = await request(app).get("/api/v1/users/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("accepts a protected route with a valid token and returns the right user", async () => {
    const login = await request(app).post("/api/v1/users/login").send({ email, password: TEST_PASSWORD });
    const token = login.body.data.token;

    const res = await request(app).get("/api/v1/users/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty("password");
  });
});
