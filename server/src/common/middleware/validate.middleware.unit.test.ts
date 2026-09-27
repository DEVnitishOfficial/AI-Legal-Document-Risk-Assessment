import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate, zodIssueToMessage } from "./validate.middleware";

const makeReqRes = (overrides: Partial<{ body: any; params: any; query: any }> = {}) => {
  const req: any = { body: {}, params: {}, query: {}, ...overrides };
  const res: any = {};
  const next = vi.fn();
  return { req, res, next };
};

describe("validate middleware", () => {
  it("calls next() with no error when the body matches the schema", () => {
    const schema = z.object({ name: z.string() });
    const { req, res, next } = makeReqRes({ body: { name: "Alice" } });

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("replaces req.body with the parsed (not the raw) value", () => {
    // z.coerce / .trim() / .default() mean "parsed" can genuinely differ
    // from "raw" — downstream code must see the parsed version.
    const schema = z.object({ n: z.coerce.number(), name: z.string().trim() });
    const { req, res, next } = makeReqRes({ body: { n: "42", name: "  Alice  " } });

    validate({ body: schema })(req, res, next);

    expect(req.body).toEqual({ n: 42, name: "Alice" });
    expect(next).toHaveBeenCalledWith();
  });

  it("passes a 400 AppError to next() when the body fails validation", () => {
    const schema = z.object({ email: z.string().email("Enter a valid email address") });
    const { req, res, next } = makeReqRes({ body: { email: "not-an-email" } });

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain("Enter a valid email address");
  });

  it("names the failing field in the error message", () => {
    const schema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });
    const { req, res, next } = makeReqRes({ body: { password: "short" } });

    validate({ body: schema })(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.message).toBe("password: Password must be at least 8 characters");
  });

  it("validates params independently of body", () => {
    const schema = z.object({ id: z.coerce.number().int().positive() });
    const { req, res, next } = makeReqRes({ params: { id: "abc" } });

    validate({ params: schema })(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(req.params).toEqual({ id: "abc" }); // left untouched on failure
  });

  it("validates query independently of body/params", () => {
    const schema = z.object({ after: z.coerce.number().int().optional() });
    const { req, res, next } = makeReqRes({ query: { after: "10" } });

    validate({ query: schema })(req, res, next);

    expect(req.query).toEqual({ after: 10 });
    expect(next).toHaveBeenCalledWith();
  });

  it("stops at the first failing target and never mutates a later one", () => {
    const bodySchema = z.object({ x: z.string() });
    const paramsSchema = z.object({ id: z.coerce.number() });
    const { req, res, next } = makeReqRes({ body: { x: 5 }, params: { id: "42" } });

    validate({ body: bodySchema, params: paramsSchema })(req, res, next);

    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(req.params).toEqual({ id: "42" }); // params never got to run
  });
});

describe("zodIssueToMessage", () => {
  it("prefixes the message with the field path", () => {
    const result = z.object({ name: z.string().min(1, "Name is required") }).safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodIssueToMessage(result.error)).toBe("name: Name is required");
    }
  });

  it("has no field prefix for a top-level (root) issue", () => {
    const result = z
      .object({ a: z.string(), b: z.string() })
      .refine((d) => d.a !== d.b, { message: "a and b must differ" })
      .safeParse({ a: "x", b: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodIssueToMessage(result.error)).toBe("a and b must differ");
    }
  });
});
