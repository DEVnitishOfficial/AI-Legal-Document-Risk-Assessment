import { describe, it, expect } from "vitest";
import { keyByUser } from "./rateLimit.middleware";

describe("keyByUser", () => {
  it("keys an authenticated request by the user's id", () => {
    const req = { user: { id: 42 }, ip: "203.0.113.5" };
    expect(keyByUser(req)).toBe("42");
  });

  it("returns a string even when the id is numeric", () => {
    const req = { user: { id: 1 }, ip: "10.0.0.1" };
    expect(typeof keyByUser(req)).toBe("string");
  });

  it("falls back to the request IP when there is no authenticated user", () => {
    const req = { user: undefined, ip: "203.0.113.5" };
    expect(keyByUser(req)).toBe("203.0.113.5");
  });

  it("normalizes an IPv6 loopback address via ipKeyGenerator instead of comparing it raw", () => {
    const req = { user: undefined, ip: "::1" };
    // express-rate-limit v8's ipKeyGenerator normalizes IPv6 addresses (e.g.
    // by subnet); the exact output is its concern, but it must not throw
    // and must not just be the raw, unnormalized "::1" string, which is the
    // real bug this key generator was written to avoid (see the comment in
    // rateLimit.middleware.ts).
    expect(() => keyByUser(req)).not.toThrow();
    expect(typeof keyByUser(req)).toBe("string");
  });

  it("prefers the user id over the IP when both are present", () => {
    const req = { user: { id: 7 }, ip: "203.0.113.5" };
    expect(keyByUser(req)).toBe("7");
  });
});
