import { describe, it, expect } from "vitest";
import { riskScoreForLevel } from "./analysis.riskScore";

describe("riskScoreForLevel", () => {
  it("maps Low to 30", () => {
    expect(riskScoreForLevel("Low")).toBe(30);
  });

  it("maps Medium to 60", () => {
    expect(riskScoreForLevel("Medium")).toBe(60);
  });

  it("maps High to 90", () => {
    expect(riskScoreForLevel("High")).toBe(90);
  });

  it("defaults unknown/garbage levels to 60 rather than throwing", () => {
    expect(riskScoreForLevel("Severe")).toBe(60);
    expect(riskScoreForLevel("")).toBe(60);
    expect(riskScoreForLevel(undefined as unknown as string)).toBe(60);
  });

  it("is case-sensitive (matches the AI prompt's exact casing contract)", () => {
    expect(riskScoreForLevel("low")).toBe(60); // falls through to the default, not 30
  });
});
