import { describe, it, expect } from "vitest";
import { createTextBodySchema, updateDocumentBodySchema } from "./document.schema";

describe("createTextBodySchema", () => {
  it("accepts text at or above the 50-character minimum", () => {
    const content = "x".repeat(50);
    expect(createTextBodySchema.parse({ content }).content).toBe(content);
  });

  it("rejects text under the 50-character minimum", () => {
    expect(() => createTextBodySchema.parse({ content: "too short" })).toThrow();
  });

  it("rejects empty/whitespace-only content (trimmed before the length check)", () => {
    expect(() => createTextBodySchema.parse({ content: " ".repeat(60) })).toThrow();
  });

  it("rejects missing content", () => {
    expect(() => createTextBodySchema.parse({})).toThrow();
  });
});

describe("updateDocumentBodySchema", () => {
  it("accepts a valid title only", () => {
    const result = updateDocumentBodySchema.parse({ title: "My Lease" });
    expect(result.title).toBe("My Lease");
    expect(result.isFavorite).toBeUndefined();
  });

  it("accepts a valid isFavorite only", () => {
    expect(updateDocumentBodySchema.parse({ isFavorite: true })).toEqual({ isFavorite: true });
  });

  it("trims the title", () => {
    expect(updateDocumentBodySchema.parse({ title: "  My Lease  " }).title).toBe("My Lease");
  });

  it("rejects an empty title", () => {
    expect(() => updateDocumentBodySchema.parse({ title: "   " })).toThrow();
  });

  it("rejects a title over 120 characters", () => {
    expect(() => updateDocumentBodySchema.parse({ title: "a".repeat(121) })).toThrow();
  });

  it("rejects a non-boolean isFavorite", () => {
    expect(() => updateDocumentBodySchema.parse({ isFavorite: "yes" })).toThrow();
  });

  it("rejects a request with neither field", () => {
    expect(() => updateDocumentBodySchema.parse({})).toThrow();
  });
});
