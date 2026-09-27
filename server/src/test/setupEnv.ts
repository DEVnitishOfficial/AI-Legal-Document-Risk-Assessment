// Loaded by vitest (see vitest.config.ts's `setupFiles`) before any test
// file's own imports run. This must win the race against `src/config/env.ts`,
// which calls plain `dotenv.config()` (loading server/.env) the first time
// anything imports it — dotenv never overwrites a variable that is already
// set in process.env, so as long as *this* file sets the test values first,
// env.ts's later call is a no-op for every key we set here, and the app
// boots against the test database instead of your real dev database.
import dotenv from "dotenv";
import path from "path";

process.env.NODE_ENV = "test";

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

if (!process.env.DATABASE_URL?.includes("_test")) {
  // Fail loud rather than silently running system tests against (and
  // writing/deleting rows in) a real database.
  throw new Error(
    "server/.env.test's DATABASE_URL does not look like a test database " +
      '(expected the database name to contain "_test"). Refusing to run ' +
      "tests — see server/.env.test.example."
  );
}

if (process.env.MSG91_AUTH_KEY || process.env.MSG91_TEMPLATE_ID) {
  // Real near-miss during development: .env.test originally didn't set
  // these at all, so env.ts's own fallback dotenv.config() call picked up
  // the *real* MSG91 credentials from server/.env, and otp.system.test.ts
  // genuinely called the live MSG91 API. .env.test must set both to an
  // empty string (not omit them) to keep otp.service.ts's isDevMode path
  // active — see the comment there.
  throw new Error(
    "server/.env.test has MSG91_AUTH_KEY/MSG91_TEMPLATE_ID set (or they " +
      "leaked in from server/.env). Refusing to run tests — a real OTP " +
      "test would send a live SMS. Set both to an empty string in .env.test."
  );
}
