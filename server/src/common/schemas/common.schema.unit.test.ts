import { describe, it, expect } from "vitest";
import { idParamSchema, phoneSchema } from "./common.schema";

describe("idParamSchema", () => {
  const schema = idParamSchema();

  it("coerces a numeric string param to a real number", () => {
    expect(schema.parse({ id: "42" })).toEqual({ id: 42 });
  });

  it("rejects a non-numeric id", () => {
    expect(() => schema.parse({ id: "abc" })).toThrow();
  });

  it("rejects a non-integer id", () => {
    expect(() => schema.parse({ id: "3.5" })).toThrow();
  });

  it("rejects zero and negative ids", () => {
    expect(() => schema.parse({ id: "0" })).toThrow();
    expect(() => schema.parse({ id: "-5" })).toThrow();
  });

  it("supports a custom param name", () => {
    const messageIdSchema = idParamSchema("messageId");
    expect(messageIdSchema.parse({ messageId: "7" })).toEqual({ messageId: 7 });
    expect(() => messageIdSchema.parse({ messageId: "x" })).toThrow();
  });
});

describe("phoneSchema", () => {
  it("accepts a plain 10-digit Indian mobile number", () => {
    expect(phoneSchema.parse("9876543210")).toBe("9876543210");
  });

  it("accepts a number with a country code prefix", () => {
    expect(phoneSchema.parse("+919876543210")).toBe("+919876543210");
  });

  it("trims surrounding whitespace before validating", () => {
    expect(phoneSchema.parse("  9876543210  ")).toBe("9876543210");
  });

  it("rejects a number that's too short", () => {
    expect(() => phoneSchema.parse("123")).toThrow();
  });

  it("rejects a number starting with 0", () => {
    expect(() => phoneSchema.parse("0876543210")).toThrow();
  });

  it("rejects letters", () => {
    expect(() => phoneSchema.parse("98765abcde")).toThrow();
  });
});
