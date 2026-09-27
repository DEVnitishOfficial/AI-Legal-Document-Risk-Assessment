import { describe, it, expect } from "vitest";
import { registerBodySchema, loginBodySchema } from "./user.schema";

describe("registerBodySchema", () => {
  const valid = { name: "Alice", email: "alice@example.com", password: "SuperSecret1" };

  it("accepts a valid registration", () => {
    expect(registerBodySchema.parse(valid)).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      password: "SuperSecret1",
    });
  });

  it("accepts an optional, valid phone number", () => {
    const result = registerBodySchema.parse({ ...valid, phone: "9876543210" });
    expect(result.phone).toBe("9876543210");
  });

  it("accepts registration with no phone at all", () => {
    const result = registerBodySchema.parse(valid);
    expect(result.phone).toBeUndefined();
  });

  it("rejects a missing/empty name", () => {
    expect(() => registerBodySchema.parse({ ...valid, name: "" })).toThrow();
  });

  it("rejects a malformed email", () => {
    expect(() => registerBodySchema.parse({ ...valid, email: "not-an-email" })).toThrow();
  });

  it("rejects a password under 8 characters", () => {
    expect(() => registerBodySchema.parse({ ...valid, password: "short1" })).toThrow();
  });

  it("rejects a malformed optional phone number", () => {
    expect(() => registerBodySchema.parse({ ...valid, phone: "123" })).toThrow();
  });

  it("trims whitespace from name and email", () => {
    const result = registerBodySchema.parse({ ...valid, name: "  Alice  ", email: "  alice@example.com  " });
    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
  });
});

describe("loginBodySchema", () => {
  it("accepts a valid email + non-empty password", () => {
    expect(loginBodySchema.parse({ email: "a@b.com", password: "anything" })).toEqual({
      email: "a@b.com",
      password: "anything",
    });
  });

  it("rejects a malformed email", () => {
    expect(() => loginBodySchema.parse({ email: "nope", password: "x" })).toThrow();
  });

  it("rejects an empty password", () => {
    expect(() => loginBodySchema.parse({ email: "a@b.com", password: "" })).toThrow();
  });

  it("does not enforce an 8-character minimum on login (only on registration)", () => {
    // A login attempt with a short password must still reach the service
    // (which reports "wrong password"), not be rejected as a shape error.
    expect(loginBodySchema.parse({ email: "a@b.com", password: "abc" })).toBeTruthy();
  });
});
