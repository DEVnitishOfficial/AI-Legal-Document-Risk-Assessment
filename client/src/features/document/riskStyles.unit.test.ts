import { describe, it, expect } from "vitest";
import { RISK_LEVEL_BADGE } from "./riskStyles";

describe("RISK_LEVEL_BADGE", () => {
  it("defines a badge class for every risk level the API can return", () => {
    expect(Object.keys(RISK_LEVEL_BADGE).sort()).toEqual(["High", "Low", "Medium"]);
  });

  it("gives each level a distinct class string, so a Medium chip can never look like High", () => {
    const values = Object.values(RISK_LEVEL_BADGE);
    expect(new Set(values).size).toBe(values.length);
  });

  it("includes both a light and a dark-mode class for every level", () => {
    for (const classes of Object.values(RISK_LEVEL_BADGE)) {
      expect(classes).toMatch(/\bbg-risk-\w+-bg\b/);
      expect(classes).toMatch(/dark:bg-risk-\w+-bg-dark\b/);
    }
  });
});
