import { describe, it, expect } from "vitest";
import {
  createConversationBodySchema,
  updateConversationBodySchema,
  sendMessageBodySchema,
  attachDocumentBodySchema,
} from "./legal-agent.schema";

describe("createConversationBodySchema", () => {
  it("defaults language to 'en' when omitted", () => {
    expect(createConversationBodySchema.parse({})).toEqual({ language: "en" });
  });

  it("accepts 'hi'", () => {
    expect(createConversationBodySchema.parse({ language: "hi" })).toEqual({ language: "hi" });
  });

  it("rejects an unrecognized language instead of silently defaulting to 'en'", () => {
    // The old inline `=== "hi" ? "hi" : "en"` pattern silently coerced any
    // other value (a typo, a stale client, "fr") to "en" — this is the
    // real behavior change: such a request is now a 400, not silent.
    expect(() => createConversationBodySchema.parse({ language: "fr" })).toThrow();
  });
});

describe("updateConversationBodySchema", () => {
  it("accepts a title-only update", () => {
    expect(updateConversationBodySchema.parse({ title: "My chat" }).title).toBe("My chat");
  });

  it("accepts a language-only update", () => {
    expect(updateConversationBodySchema.parse({ language: "hi" }).language).toBe("hi");
  });

  it("rejects an update with neither field", () => {
    expect(() => updateConversationBodySchema.parse({})).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() => updateConversationBodySchema.parse({ title: "   " })).toThrow();
  });

  it("rejects a title over 120 characters", () => {
    expect(() => updateConversationBodySchema.parse({ title: "a".repeat(121) })).toThrow();
  });

  it("rejects an invalid language", () => {
    expect(() => updateConversationBodySchema.parse({ language: "fr" })).toThrow();
  });
});

describe("sendMessageBodySchema", () => {
  it("accepts non-empty content", () => {
    expect(sendMessageBodySchema.parse({ content: "What is anticipatory bail?" }).content).toBe(
      "What is anticipatory bail?"
    );
  });

  it("trims content", () => {
    expect(sendMessageBodySchema.parse({ content: "  hello  " }).content).toBe("hello");
  });

  it("rejects empty/whitespace-only content", () => {
    expect(() => sendMessageBodySchema.parse({ content: "   " })).toThrow();
  });

  it("rejects missing content", () => {
    expect(() => sendMessageBodySchema.parse({})).toThrow();
  });
});

describe("attachDocumentBodySchema", () => {
  it("accepts a positive documentId", () => {
    expect(attachDocumentBodySchema.parse({ documentId: 5 })).toEqual({ documentId: 5 });
  });

  it("coerces a numeric-string documentId", () => {
    expect(attachDocumentBodySchema.parse({ documentId: "5" }).documentId).toBe(5);
  });

  it("rejects a missing documentId", () => {
    expect(() => attachDocumentBodySchema.parse({})).toThrow();
  });

  it("rejects a non-positive documentId", () => {
    expect(() => attachDocumentBodySchema.parse({ documentId: 0 })).toThrow();
  });
});
