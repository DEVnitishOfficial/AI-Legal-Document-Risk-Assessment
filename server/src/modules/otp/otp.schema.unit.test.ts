import { describe, it, expect } from "vitest";
import { sendOtpBodySchema, verifyOtpBodySchema } from "./otp.schema";

describe("sendOtpBodySchema", () => {
  it("accepts a valid phone number", () => {
    expect(sendOtpBodySchema.parse({ phone: "9876543210" })).toEqual({ phone: "9876543210" });
  });

  it("rejects a malformed phone number", () => {
    expect(() => sendOtpBodySchema.parse({ phone: "123" })).toThrow();
  });

  it("rejects a missing phone number", () => {
    expect(() => sendOtpBodySchema.parse({})).toThrow();
  });
});

describe("verifyOtpBodySchema", () => {
  it("accepts a valid phone + 6-digit code", () => {
    expect(verifyOtpBodySchema.parse({ phone: "9876543210", code: "123456" })).toEqual({
      phone: "9876543210",
      code: "123456",
    });
  });

  it("rejects a code that isn't exactly 6 digits", () => {
    expect(() => verifyOtpBodySchema.parse({ phone: "9876543210", code: "12345" })).toThrow();
    expect(() => verifyOtpBodySchema.parse({ phone: "9876543210", code: "1234567" })).toThrow();
  });

  it("rejects a non-numeric code", () => {
    expect(() => verifyOtpBodySchema.parse({ phone: "9876543210", code: "abcdef" })).toThrow();
  });

  it("rejects a missing code", () => {
    expect(() => verifyOtpBodySchema.parse({ phone: "9876543210" })).toThrow();
  });
});
