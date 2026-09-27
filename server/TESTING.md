# Server Testing

Uses [Vitest](https://vitest.dev). Two kinds of tests live side by side, told apart by filename:

- **`*.unit.test.ts`** — pure logic. The repository layer, `openai`, and other
  external dependencies are mocked with `vi.mock`/`vi.hoisted`; nothing here
  touches a real database or network. Runs anywhere, instantly.
- **`*.system.test.ts`** (in `src/test/system/`) — black-box, end-to-end
  tests. They import the real Express `app` (from `src/app.ts`, which is
  exported separately from `server.ts`'s `.listen()` for exactly this
  reason) and drive it with [Supertest](https://github.com/ladjs/supertest)
  over real HTTP-shaped requests, against a **real, separate Postgres
  database**. Only `openai` is mocked (see `analysis.system.test.ts`) — kept
  deterministic, free and fast; every other layer (routing, auth middleware,
  ownership checks, Prisma reads/writes, caching) runs for real.

## One-time setup

1. Copy `server/.env.test.example` to `server/.env.test` and fill in your
   local Postgres credentials. Use a **different database name** than your
   dev database (e.g. suffix it `_test`) — `setupEnv.ts` refuses to run if
   the configured `DATABASE_URL` doesn't contain `_test`, as a guard against
   accidentally wiping real data.
2. Create and migrate that test database:
   ```bash
   npm run test:db:setup
   ```
   Safe to re-run any time (creates the DB only if missing, then applies
   any new migrations).

## Running

```bash
npm test              # everything
npm run test:unit     # only *.unit.test.ts (no DB needed)
npm run test:system   # only *.system.test.ts (needs the test DB from above)
npm run test:coverage # everything, with a coverage report in coverage/
```

Each system test file cleans up the rows it created (`afterAll` deletes its
throwaway users; documents/analyses cascade-delete with them), so the test
database stays empty between runs and tests can run in any order without
interfering with each other.

## What's covered so far

- **Unit**: `AppError`, JWT sign/verify, user registration & login business
  rules (duplicate email/phone, password hashing, wrong-password rejection),
  the deterministic risk-score derivation, the AI response
  parsing/normalization in `analyzeDocument` (malformed JSON, code-fenced
  JSON, invalid enum values, filtered-out malformed risk items), document
  validation rules (title length, empty content, ownership), citation
  de-duplication, and the rate limiter's per-user key generator.
- **System**: register → login → protected-route flow; document
  create/read/rename/delete; the **IDOR ownership guard** on documents and
  on analysis (a real historical bug in this codebase — one user could
  previously read/analyze another user's document; these tests pin that
  fix in place); the full analysis pipeline including the **caching**
  behavior (a second run returns the same row instead of re-billing
  OpenAI); and baseline routing (`/health`, 404 handling, an unauthenticated
  request being rejected).

## Known gaps (not covered yet)

The Legal Assistant chat (SSE streaming), voice transcription, and Connect
Advocate (WebRTC/Realtime) flows are not system-tested yet — they need
heavier mocking (streaming responses, OpenAI Realtime, WebSocket
signalling) that didn't fit this pass. Worth a follow-up branch.
