import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken } from "./jwt";
import { env } from "../../config/env";

describe("generateToken", () => {
  it("produces a token that verifies with the configured secret", () => {
    const token = generateToken({ id: 1, email: "user@example.com" });
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe("user@example.com");
  });

  it("rejects verification with the wrong secret", () => {
    const token = generateToken({ id: 1, email: "user@example.com" });
    expect(() => jwt.verify(token, "a-completely-different-secret")).toThrow();
  });

  it("sets an expiry roughly 7 days out", () => {
    const token = generateToken({ id: 42 });
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    const sevenDaysSeconds = 7 * 24 * 60 * 60;
    const actual = (decoded.exp ?? 0) - (decoded.iat ?? 0);
    // Allow a small margin instead of pinning the exact second.
    expect(actual).toBeGreaterThan(sevenDaysSeconds - 5);
    expect(actual).toBeLessThan(sevenDaysSeconds + 5);
  });

  it("round-trips arbitrary payload shapes", () => {
    const token = generateToken({ id: 7, email: "a@b.com", role: "ADMIN" });
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.role).toBe("ADMIN");
  });
});
