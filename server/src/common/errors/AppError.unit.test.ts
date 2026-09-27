import { describe, it, expect } from "vitest";
import { AppError } from "./AppError";

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError("Something went wrong", 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("carries the message and status code it was constructed with", () => {
    const err = new AppError("Document not found", 404);
    expect(err.message).toBe("Document not found");
    expect(err.statusCode).toBe(404);
  });

  it("keeps a distinct statusCode per instance", () => {
    const badRequest = new AppError("Bad request", 400);
    const forbidden = new AppError("Forbidden", 403);
    expect(badRequest.statusCode).toBe(400);
    expect(forbidden.statusCode).toBe(403);
  });

  it("captures a stack trace", () => {
    const err = new AppError("Oops", 500);
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe("string");
  });
});
