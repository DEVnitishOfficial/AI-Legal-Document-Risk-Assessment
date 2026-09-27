# Client Testing

Uses [Vitest](https://vitest.dev) with `jsdom` and
[React Testing Library](https://testing-library.com/react). Config lives in
`vitest.config.ts`, kept separate from `vite.config.ts` (the dev-server
config) so test tooling can never affect `npm run dev` or the production
build.

## Running

```bash
npm test              # everything
npm run test:watch    # watch mode
npm run test:coverage # with a coverage report in coverage/
```

No database or running server needed — everything here is a pure unit or
component test.

## What's covered so far

- **`services/apiError.ts`** — the single place that turns any failure into
  the plain-language message a user sees (see the "Friendly errors" product
  rule this codebase follows): network vs. timeout vs. session-expiry vs.
  per-status-code messages, preferring the server's own message when it sent
  one, and never leaking a raw "Internal Server Error" to the screen.
- **`utils/timeAgo.ts`** — the relative-time formatting used across
  Dashboard/history lists ("just now" / "5 minutes ago" / "yesterday" /
  falling back to a plain date after a week).
- **`features/document/riskStyles.ts`** — the shared risk-badge class
  mapping (High/Medium/Low), sanity-checked so it can't silently lose a
  level or collapse two levels onto the same look.
- **`components/ui/FormError.tsx`** — a component-level test (render,
  re-render with a new message, clear back to empty) for the shared
  inline-error component used across every form in the app.

## Known gaps (not covered yet)

Redux slices/thunks, the streaming chat hook (`useLegalChat`), and full page
components (they pull in Router/Redux/real network calls) aren't tested yet
— worth a follow-up branch once the server-side test patterns settle.
