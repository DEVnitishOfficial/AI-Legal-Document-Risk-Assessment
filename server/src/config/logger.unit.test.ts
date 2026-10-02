import { describe, it, expect } from "vitest";
import pino from "pino";

// Builds a logger with this project's exact redact rules but writing to an
// in-memory sink instead of stdout, so the test can assert on the real
// serialized JSON — not just that a `redact` option is present, which
// would not have caught the actual bug this test is written against (see
// logger.ts's comment): `*.password` alone looked correct but silently
// left a top-level `{ password: ... }` log entirely unredacted, because
// pino's `*` wildcard matches exactly one level of nesting, not "this
// field at any depth". Re-implemented here (not imported from logger.ts)
// so the test exercises the redact *rules* independent of environment
// setup (env.ts, LOG_LEVEL, pino-pretty) that logger.ts also depends on.
const SENSITIVE_FIELDS = ["password", "token", "code", "codeHash"];
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  ...SENSITIVE_FIELDS,
  ...SENSITIVE_FIELDS.map((f) => `*.${f}`),
];

const makeLogger = () => {
  const lines: string[] = [];
  const sink = { write: (chunk: string) => lines.push(chunk) };
  const logger = pino({ redact: { paths: REDACT_PATHS, censor: "[redacted]" } }, sink as any);
  return { logger, lastLog: () => JSON.parse(lines[lines.length - 1]) };
};

describe("logger redaction", () => {
  it("redacts a top-level password field", () => {
    const { logger, lastLog } = makeLogger();
    logger.info({ password: "hunter2" }, "user data");
    expect(lastLog().password).toBe("[redacted]");
  });

  it("redacts a password nested one level deep", () => {
    const { logger, lastLog } = makeLogger();
    logger.info({ user: { password: "hunter2" } }, "user data");
    expect(lastLog().user.password).toBe("[redacted]");
  });

  it("redacts a top-level JWT/session token", () => {
    const { logger, lastLog } = makeLogger();
    logger.info({ token: "eyJhbGciOi..." }, "login result");
    expect(lastLog().token).toBe("[redacted]");
  });

  it("redacts a top-level OTP code and codeHash", () => {
    const { logger, lastLog } = makeLogger();
    logger.info({ code: "123456", codeHash: "$2b$10$..." }, "otp");
    const line = lastLog();
    expect(line.code).toBe("[redacted]");
    expect(line.codeHash).toBe("[redacted]");
  });

  it("redacts the Authorization header if a req object is ever logged", () => {
    const { logger, lastLog } = makeLogger();
    logger.info({ req: { headers: { authorization: "Bearer secret-token" } } }, "request");
    expect(lastLog().req.headers.authorization).toBe("[redacted]");
  });

  it("leaves non-sensitive fields untouched", () => {
    const { logger, lastLog } = makeLogger();
    logger.info({ documentId: 42, status: "processing" }, "job update");
    const line = lastLog();
    expect(line.documentId).toBe(42);
    expect(line.status).toBe("processing");
  });
});
