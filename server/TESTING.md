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
  database** (and, for the analysis flow, a **real BullMQ queue, a real
  worker and a real separate Redis database**). Only `openai` is mocked
  (see `analysis.system.test.ts`) — kept deterministic, free and fast;
  every other layer (routing, auth middleware, ownership checks, the queue,
  the worker, Prisma reads/writes, caching) runs for real.

## One-time setup

1. Copy `server/.env.test.example` to `server/.env.test` and fill in your
   local Postgres credentials. Use a **different database name** than your
   dev database (e.g. suffix it `_test`) — `setupEnv.ts` refuses to run if
   the configured `DATABASE_URL` doesn't contain `_test`, as a guard against
   accidentally wiping real data. The default `REDIS_URL` in the example
   file points at logical DB index 1 (your dev queue normally runs on index
   0 of the same local Redis) — leave it as-is unless you have a reason not
   to. **Leave `MSG91_AUTH_KEY`/`MSG91_TEMPLATE_ID` as empty strings** —
   don't delete the lines. `env.ts`'s own fallback `dotenv.config()` call
   fills in anything `.env.test` doesn't set from your real `server/.env`,
   and this genuinely happened once during development: the OTP system
   test called the live MSG91 API with real prod credentials because these
   two lines were simply missing. `setupEnv.ts` now refuses to run any
   test at all if either key comes out non-empty.
2. Create and migrate that test database:
   ```bash
   npm run test:db:setup
   ```
   Safe to re-run any time (creates the DB only if missing, then applies
   any new migrations). Redis needs no setup — BullMQ creates whatever keys
   it needs on first use. `npm run test:redis:flush` clears accumulated job
   history in the test Redis database if you ever want a clean slate (it
   refuses to run against anything that isn't a non-zero logical DB index,
   as a guard against flushing a real one by mistake).

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
  de-duplication, the rate limiter's per-user key generator, the
  OCR-routing decision in `analysis.textExtraction.ts` (when a PDF's text
  layer is trusted vs. when OCR kicks in, image vs. PDF), the background
  worker's pure job logic (`processAnalysisJob`) and its retry/failure
  bookkeeping (`analysisJobProcessor` — only marks a document `failed` on
  the truly final attempt or an unrecoverable error), the queue's
  per-document job-dedup, and the `/analysis/run` controller's branching
  (cached / already-processing / failed-without-retry / start-new-job).
  Also: the generic `validate` middleware itself (parses & replaces
  body/params/query, formats the first Zod issue into a friendly `400`),
  `idParamSchema`/`phoneSchema`, and every `*.schema.ts` (user, otp,
  document, analysis, legal-agent) — the actual accept/reject rules for
  every field on every newly-validated route.
- **System**: register → login → protected-route flow; document
  create/read/rename/delete; the **IDOR ownership guard** on documents and
  on analysis (a real historical bug in this codebase — one user could
  previously read/analyze another user's document; these tests pin that
  fix in place); baseline routing (`/health`, 404 handling, an
  unauthenticated request being rejected); and the full **background
  analysis pipeline** against a real queue/worker/Redis — enqueue → poll →
  complete, the caching behavior (a later call returns the same row
  instead of re-billing OpenAI), two concurrent requests for the same
  fresh document only running the AI once, a **genuine BullMQ retry**
  (a transient failure followed by real exponential backoff, then
  success), and a permanently-failing document landing on `failed` after
  exactly the configured number of attempts — with a later poll reporting
  it, not silently re-enqueueing forever.

  **A bug this caught**: an early version of the retry/failure bookkeeping
  had `job.attemptsMade` off by one (it counts attempts completed *before*
  the current one, not the current attempt number — undocumented, easy to
  get wrong). A permanently-failing job never actually reached `failed` in
  the database. A hand-mocked unit test's fake job object had accidentally
  encoded the same wrong assumption and passed anyway; only the real
  end-to-end system test — driving an actual BullMQ retry/backoff cycle
  against a real queue — exposed it. Fixed, and the unit test's fake job
  values corrected to match verified-real BullMQ behavior.

  These system tests are the slowest in the suite (the retry/backoff tests
  wait through real, if short, delays — tens of seconds total) — a
  deliberate trade-off for proving the retry behavior actually works, not
  just that the code compiles around the right shape.

  Also: a full OTP send → wrong-code → resend-cooldown → verify → account
  creation flow (`otp.system.test.ts`, real HTTP calls, no mocking needed —
  dev mode logs instead of calling the real SMS API); input-validation
  `400`s across auth, documents, analysis and the Legal Assistant's
  non-AI-calling endpoints (conversation create/rename/attach — proven
  against the real routes; malformed input never reaches user.service.ts,
  document.service.ts, etc., and a non-numeric `:id` that used to reach
  Prisma unguarded now gets a clean `400`).

## Known gaps (not covered yet)

The Legal Assistant's AI-calling endpoints (`sendMessage`'s actual
streamed answer, voice transcription) and Connect Advocate
(WebRTC/Realtime) are not system-tested yet — they need heavier mocking
(streaming responses, OpenAI Realtime, WebSocket signalling) that didn't
fit this pass. The *validation* on `sendMessage` (rejecting empty content
before any AI call happens) is covered; the success path isn't. Worth a
follow-up branch.

OCR itself (`tesseract.js` actually recognizing text, `pdf-to-img`
actually rasterizing a PDF page) is **not exercised by the automated
suite** — real OCR takes several real seconds per page, which would slow
every test run down for a check that mocking already covers at the
decision-logic level (`analysis.textExtraction.unit.test.ts`). It was
verified working for real, manually, twice: a standalone script
recognizing text from a real PDF page, and a full live run through the
actual app (register → upload a photographed "eviction notice" PNG →
real OCR → real OpenAI analysis correctly summarizing the photographed
content) — see server README Phase 25's Result section.
