import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app, prisma } from "./testUtils";

// No mocking needed: with no MSG91 credentials configured (server/.env.test
// deliberately has none), otp.sms.ts logs instead of calling a real SMS
// API and the send response includes `devCode` — this exercises the real
// send -> verify -> account-creation flow end-to-end.
const uniquePhone = () => "9" + String(Date.now()).slice(-9);

describe("OTP login/registration flow", () => {
  const phone = uniquePhone();
  let realCode: string;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone } });
  });

  it("400s a malformed phone number on send", async () => {
    const res = await request(app).post("/api/v1/auth/otp/send").send({ phone: "123" });
    expect(res.status).toBe(400);
  });

  it("sends a code for a valid phone number", async () => {
    const res = await request(app).post("/api/v1/auth/otp/send").send({ phone });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.devCode).toBe("string");
    realCode = res.body.data.devCode;
  });

  it("400s a code that isn't 6 digits on verify", async () => {
    const res = await request(app).post("/api/v1/auth/otp/verify").send({ phone, code: "123" });
    expect(res.status).toBe(400);
  });

  it("401s a well-formed but wrong code (without consuming the real one)", async () => {
    const res = await request(app).post("/api/v1/auth/otp/verify").send({ phone, code: "000000" });
    expect(res.status).toBe(401);
  });

  it("30s resend cooldown: a second /send right after the first is rejected", async () => {
    const res = await request(app).post("/api/v1/auth/otp/send").send({ phone });
    expect(res.status).toBe(429);
  });

  it("verifies the real code (from the single earlier send) and creates/logs in the account", async () => {
    const verify = await request(app).post("/api/v1/auth/otp/verify").send({ phone, code: realCode });
    expect(verify.status).toBe(200);
    expect(typeof verify.body.data.token).toBe("string");
    expect(verify.body.data.user.phone).toBe(phone);
    expect(verify.body.data.user).not.toHaveProperty("password");
  });

  it("rejects the same code a second time (already consumed)", async () => {
    const res = await request(app).post("/api/v1/auth/otp/verify").send({ phone, code: realCode });
    expect(res.status).toBe(400);
  });
});
