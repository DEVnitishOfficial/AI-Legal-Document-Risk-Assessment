import { describe, it, expect } from "vitest";
import { runAnalysisBodySchema } from "./analysis.schema";

describe("runAnalysisBodySchema", () => {
  it("accepts a bare positive documentId and defaults retry to false", () => {
    expect(runAnalysisBodySchema.parse({ documentId: 42 })).toEqual({ documentId: 42, retry: false });
  });

  it("coerces a numeric-string documentId (as JSON bodies sometimes send)", () => {
    expect(runAnalysisBodySchema.parse({ documentId: "42" }).documentId).toBe(42);
  });

  it("accepts an explicit retry flag", () => {
    expect(runAnalysisBodySchema.parse({ documentId: 1, retry: true }).retry).toBe(true);
  });

  it("rejects a missing documentId", () => {
    expect(() => runAnalysisBodySchema.parse({})).toThrow();
  });

  it("rejects a zero or negative documentId", () => {
    expect(() => runAnalysisBodySchema.parse({ documentId: 0 })).toThrow();
    expect(() => runAnalysisBodySchema.parse({ documentId: -1 })).toThrow();
  });

  it("rejects a non-integer documentId", () => {
    expect(() => runAnalysisBodySchema.parse({ documentId: 1.5 })).toThrow();
  });
});
