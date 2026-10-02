import pino from "pino";
import { env } from "./env";

const isDevelopment = env.NODE_ENV === "development";

// One structured logger for the whole app, replacing the ~80 scattered
// console.log/console.error calls this codebase had. Pretty-printed and
// colorized in development (easy to read while working); plain JSON
// everywhere else (production, test) — JSON is what you actually want once
// logs are going to a file or a log aggregator instead of a terminal.
//
// Secrets are never logged: this mirrors a rule this codebase already
// followed by hand (see auth.middleware.ts's own comment about never
// logging the Authorization header/token) — now enforced in one place via
// `redact` instead of trusting every call site to remember it.
// pino's redact `*` wildcard matches exactly one level of nesting at that
// position — it is NOT a recursive "this field at any depth" match (a real
// mistake made while building this: `*.password` alone silently left a
// top-level `{ password: ... }` log completely unredacted; caught by
// logger.unit.test.ts actually asserting on the serialized output, not by
// type-checking or by the redact option merely being present). Every
// sensitive field is therefore listed at both the top level and one level
// of nesting, which covers how this codebase's log calls are actually
// shaped (`logger.error({ err, ...})`, `logger.info({ user: {...} }, ...)`).
const SENSITIVE_FIELDS = ["password", "token", "code", "codeHash"];
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  ...SENSITIVE_FIELDS,
  ...SENSITIVE_FIELDS.map((f) => `*.${f}`),
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACT_PATHS,
    censor: "[redacted]",
  },
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : {}),
});
