import { describe, it, expect, vi, beforeEach } from "vitest";

// The OpenAI client is constructed once at module load inside
// analysis.service.ts (`const client = new OpenAI(...)`), so the mock
// factory needs a `create` fn it can hand back on every `new OpenAI()` call
// while still letting each test configure what it returns. `vi.hoisted`
// is the documented way to share a variable with a `vi.mock` factory,
// since `vi.mock` calls are hoisted above regular imports/declarations.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("openai", () => ({
  // A plain arrow function can't be called with `new`; OpenAI's constructor
  // requires a real constructor-capable function. Returning an object from
  // it makes `new OpenAI(...)` yield that object per normal JS semantics.
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

import { analyzeDocument } from "./analysis.service";

const respondWith = (content: string) => {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyzeDocument", () => {
  it("normalizes a well-formed AI response", async () => {
    respondWith(
      JSON.stringify({
        title: "Rental Agreement - 42 MG Road",
        documentType: "Rental Agreement",
        summary: "A lease with several landlord-favoring clauses.",
        clauses: ["Security deposit", "Termination notice"],
        riskLevel: "High",
        riskItems: [
          {
            clause: "24-hour termination notice",
            severity: "High",
            category: "Termination",
            explanation: "The landlord can end the lease almost without warning.",
          },
        ],
      })
    );

    const result = await analyzeDocument("some lease text");

    expect(result.title).toBe("Rental Agreement - 42 MG Road");
    expect(result.documentType).toBe("Rental Agreement");
    expect(result.riskLevel).toBe("High");
    expect(result.clauses).toEqual(["Security deposit", "Termination notice"]);
    expect(result.riskItems).toHaveLength(1);
    expect(result.riskItems[0].severity).toBe("High");
  });

  it("strips ```json code-fence wrapping before parsing", async () => {
    respondWith('```json\n{"riskLevel": "Low", "summary": "ok", "clauses": [], "riskItems": []}\n```');

    const result = await analyzeDocument("text");
    expect(result.riskLevel).toBe("Low");
  });

  it("truncates an overly long title to 120 characters", async () => {
    const longTitle = "A".repeat(200);
    respondWith(JSON.stringify({ title: longTitle, riskLevel: "Low", clauses: [], riskItems: [] }));

    const result = await analyzeDocument("text");
    expect(result.title?.length).toBe(120);
  });

  it("falls back to null title when the AI omits it", async () => {
    respondWith(JSON.stringify({ riskLevel: "Low", clauses: [], riskItems: [] }));
    const result = await analyzeDocument("text");
    expect(result.title).toBeNull();
  });

  it("defaults an invalid documentType to 'Other'", async () => {
    respondWith(
      JSON.stringify({ documentType: "Something Made Up", riskLevel: "Medium", clauses: [], riskItems: [] })
    );
    const result = await analyzeDocument("text");
    expect(result.documentType).toBe("Other");
  });

  it("defaults an invalid riskLevel to 'Medium' instead of trusting the model", async () => {
    respondWith(JSON.stringify({ riskLevel: "Catastrophic", clauses: [], riskItems: [] }));
    const result = await analyzeDocument("text");
    expect(result.riskLevel).toBe("Medium");
  });

  it("drops non-string entries from clauses", async () => {
    respondWith(
      JSON.stringify({ riskLevel: "Low", clauses: ["real clause", 42, null, "another"], riskItems: [] })
    );
    const result = await analyzeDocument("text");
    expect(result.clauses).toEqual(["real clause", "another"]);
  });

  it("drops riskItems missing a clause or explanation, and defaults their severity/category", async () => {
    respondWith(
      JSON.stringify({
        riskLevel: "Medium",
        clauses: [],
        riskItems: [
          { clause: "Has both fields", explanation: "explained", severity: "Bogus", category: "Bogus" },
          { clause: "Missing explanation only" },
          { explanation: "Missing clause only" },
          null,
        ],
      })
    );

    const result = await analyzeDocument("text");
    expect(result.riskItems).toHaveLength(1);
    expect(result.riskItems[0].clause).toBe("Has both fields");
    // Invalid severity/category values fall back to safe defaults rather
    // than propagating whatever the model invented.
    expect(result.riskItems[0].severity).toBe("Medium");
    expect(result.riskItems[0].category).toBe("Other");
  });

  it("throws a clean error when the AI response is not valid JSON", async () => {
    respondWith("this is not json at all {{{");
    await expect(analyzeDocument("text")).rejects.toThrow("Invalid AI response format");
  });

  it("treats an empty response body as an empty object rather than crashing", async () => {
    respondWith("");
    const result = await analyzeDocument("text");
    // Every field should fall back to its safe default.
    expect(result.title).toBeNull();
    expect(result.documentType).toBe("Other");
    expect(result.riskLevel).toBe("Medium");
    expect(result.clauses).toEqual([]);
    expect(result.riskItems).toEqual([]);
  });
});
