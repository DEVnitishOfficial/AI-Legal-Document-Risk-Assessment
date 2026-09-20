# 🎨 Frontend Setup & Authentication UI (Phase 1)

---

## 📌 Overview

This phase sets up the **frontend application** using modern technologies and builds the initial UI for authentication and landing page.

---

## ⚙️ Tech Stack

* React + TypeScript (Vite)
* Tailwind CSS
* Redux Toolkit
* React Router
* Lucide Icons

---

## 🏗️ Features Implemented

* Production-grade folder structure
* Routing setup
* Home page (landing UI)
* Login page
* Register page
* Google login UI (frontend only)

---

## 📁 Folder Structure

```
src/
├── components/
├── features/
├── pages/
├── services/
├── app/
├── routes/
```

---

## 🌐 Pages

### ➤ Home Page

* Hero section
* Features section
* Navigation bar

---

### ➤ Login Page

* Email/password login form
* Google login button (UI only)

---

### ➤ Register Page

* User registration form

---

## 🚀 Navigation

```
/           → Home
/login      → Login Page
/register   → Register Page
```

---

## ⚠️ Notes

* Google authentication not implemented yet
* Backend API integration not connected yet

---

## ✅ Result

* Clean UI setup
* Responsive layout
* Production-ready structure

---


# 🔗 Frontend-Backend Integration & Authentication (Phase 2)

---

## 📌 Overview

This phase connects the frontend with backend APIs and implements authentication using JWT and Google OAuth.

---

## 🔑 Features Implemented

* API integration using Axios
* Redux-based authentication state
* Login & Register API integration
* JWT token storage (localStorage)
* Protected routes
* Google login integration (OAuth)

---

## 🌐 API Integration

All API calls are handled using a centralized Axios instance with automatic token injection.

---

## 🔐 Authentication Flow

1. User logs in
2. Backend returns JWT token
3. Token stored in localStorage
4. Token attached to all API requests
5. Protected routes verified

---

## 🔒 Protected Routes

Users must be authenticated to access protected pages like dashboard.

---

## 🔑 Google OAuth

* Implemented using Google Cloud Platform
* Redirect-based login flow
* Backend handles authentication
* Frontend receives authenticated session

---

## ✅ Result

* Frontend fully connected to backend
* Authentication system working
* Google login enabled
* Secure route protection

---

# 🔐 Google OAuth Authentication

---

## 📌 Overview

This feature enables users to log in using their Google account.

---

## 🔑 Flow

1. User clicks "Continue with Google"
2. Redirected to Google login
3. Google returns user profile
4. Backend:

   * Finds or creates user
   * Generates JWT token
5. Redirects to frontend with token

---

## 🌐 Endpoints

```
GET /api/v1/auth/google
GET /api/v1/auth/google/callback
```

---

## Token Handling

* JWT generated after login
* Sent to frontend via redirect URL
* Stored in localStorage

---

## Result

* Google login fully working
* User auto-created if not exists
* JWT authentication integrated

---

# 📄 Document Upload, Paste-Text & Analysis Result Wiring (Phase 3)

---

## 📌 Overview

The Dashboard's upload → AI analysis → result-display pipeline was effectively dead: `Dashboard.tsx` had the call to `POST /analysis/run` commented out, and the document-click handler referenced a `setSelectedDoc` function whose declaration was also commented out (a `ReferenceError` waiting to happen). So documents could be uploaded, but the AI summary/risk result was never fetched or shown, and pasting text under the backend's 50-character minimum surfaced as an opaque `alert("Upload failed ❌")` with no real detail.

---

## 🔑 Fixes

* **`Dashboard.tsx`** — rebuilt the wiring: `runAnalysis(documentId)` now actually calls `POST /analysis/run` and sets the result; `handleUploaded(documentId)` (passed to `UploadPanel`) refreshes the document list and immediately runs analysis on the new document. Fixed the dangling `setSelectedDoc` reference.
* **`UploadPanel.tsx`** — now reports the real backend error message via `react-hot-toast` (`err.response.data.message`) instead of a generic `alert()`; client-side guards prevent submitting an empty file / under-50-char text before hitting the API; disables itself while an analysis is in flight so a second upload can't be started mid-analysis.
* **`ResultPanel.tsx`** — added an `analyzing` loading state ("Analyzing document with AI…") so there's visible feedback while the OpenAI call is in flight, instead of the panel just sitting blank.
* **`DocumentList.tsx`** — was still reading `doc.file_path` / `doc.created_at` (snake_case) from a raw-SQL-era API response; the backend now returns Prisma's camelCase (`filePath` / `createdAt`) after the ORM migration (see `server/README.md` Phase 5), so this was silently broken. Fixed field names, and added a `refreshKey` prop so the list refetches after a new upload instead of only on mount.

---

# 👤 Real User Display, Documents Page & Light/Dark Theme (Phase 4)

---

## 📌 Overview

Three gaps closed in this pass: the sidebar always showed "User" instead of the logged-in name, the sidebar's "Documents" nav link led to a page where clicking a document did nothing visible, and the app was dark-mode-only with no way to switch.

---

## 🔑 Fixes & Features

### Real user name/initial

`state.auth.user` in Redux was only ever set by the `loginUser` thunk — Google OAuth (`OAuthSuccess.tsx`) stored just the token and never fetched the profile, and a page refresh reset Redux state entirely (only `token` survives in localStorage). Fixed:

* `authSlice.ts` — new `fetchCurrentUser` thunk (`GET /users/me`, now returns the real user — see `server/README.md` Phase 7) with an `extraReducers` case setting `state.user`.
* `OAuthSuccess.tsx` — dispatches `fetchCurrentUser()` right after storing the token, before navigating to `/dashboard`.
* `App.tsx` — mount-time bootstrap effect: if a token exists in localStorage but `state.auth.user` is null, dispatch `fetchCurrentUser()`. Covers page refresh for both login methods.

### Documents page gets a real result view

`/documents` previously rendered a bare `DocumentList` whose `onSelect` just set an unused local state — clicking a document did nothing. The list/result/analyze logic from `Dashboard.tsx` was extracted into a shared hook so both pages work identically:

* New `features/document/useDocumentAnalysis.ts` — `selectedId`, `analysis`, `analyzing`, `refreshKey`, `runAnalysis()`, `handleUploaded()`. Also bumps `refreshKey` after a **fresh** (non-cached) analysis completes, so the sidebar list picks up the AI-generated title/type/status without a manual reload — a fresh analysis run updates the parent document's metadata mid-session.
* New `pages/DocumentsPage.tsx` — `DocumentList` + `ResultPanel` side by side, same hook. No upload panel here; Dashboard stays "upload & analyze," this page is "browse & review."
* `App.tsx` — `/documents` now routes to `DocumentsPage`; removed the dead `selectedDoc` state.
* `DocumentList.tsx` — shows the AI-generated `doc.title`/`doc.documentType` (falling back to filename/"Text Document" when not yet analyzed) and a status dot (pending=gray/completed=green/failed=red).
* `ResultPanel.tsx` — renders the new structured `riskItems` (severity + category badges per risky clause, from `server/README.md` Phase 7) instead of a flat bullet list, plus a 0–100 `riskScore` bar under the risk-level badge.

### Light/dark theme

The app (Tailwind v4, CSS-first config, no `tailwind.config.js`) had zero theme infrastructure and ~56 hardcoded dark-only color classes across 9 files. Added:

* `App.css` — `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4's manual dark-mode toggle; this must live in the same file as `@import "tailwindcss"`, not in the otherwise-empty `index.css`).
* New `app/ThemeProvider.tsx` — context managing `theme: 'light' | 'dark'`, initialized from `localStorage.getItem('theme')` falling back to `matchMedia('(prefers-color-scheme: dark)')`, toggles the `dark` class on `<html>`, persists on change.
* New `components/ThemeToggle.tsx` — sun/moon button (`lucide-react`), wired into `main.tsx` (`<ThemeProvider>` wraps `<App/>`).
* Placement: inside `Sidebar.tsx` for authenticated pages; a small fixed top-right toggle on `Home.tsx`, `Login.tsx`, `Register.tsx` for pre-login pages.
* Mechanical pass across `Home`, `Login`, `Register`, `Dashboard`, `DocumentsPage`, `Sidebar`, `DocumentList`, `ResultPanel`, `UploadPanel`, `OAuthSuccess`: every hardcoded dark class got a light default with the original prefixed `dark:` (e.g. `bg-gray-950 text-white` → `bg-white text-gray-900 dark:bg-gray-950 dark:text-white`). Purple accent and risk-level badge colors stay fixed across both themes. `App.tsx`'s `<Toaster>` styling is now computed from `useTheme()` since `react-hot-toast`'s inline style option isn't reactive to CSS classes.

---

# 🩹 Result Panel Scroll Fix

---

## 📌 Overview

On documents with a long analysis (many risk items), the result panel grew past the viewport instead of scrolling internally — the whole page overflowed, pushing the layout down with dead space below.

## 🔑 Root Cause & Fix

`ResultPanel.tsx` already had `overflow-y-auto`, but none of its ancestors (`Dashboard.tsx` / `DocumentsPage.tsx`'s grid row and cell) had a bounded height for that overflow to clip against — by default, flex/grid items refuse to shrink below their content's natural size (`min-height: auto`), so the tall content just grew the whole page instead of scrolling in place.

* `Dashboard.tsx` / `DocumentsPage.tsx` — added `min-h-0` down the flex/grid container chain (the main content grid, and a wrapping `div` around each grid cell).
* `ResultPanel.tsx` — added `h-full min-h-0` to its root element in all three render states (analyzing / empty / populated).

## ✅ Result

Verified with a long test document: `document.body.scrollHeight` now exactly matches the viewport height (no page-level overflow), and the result panel scrolls independently while the sidebar and top bar stay fixed in place.

---

# ⚖️ Legal Assistant Chat UI (Phase 2)

---

## 📌 Overview

Frontend for the Indian-law "specialist" chat agent backend built in server Phase 8 — a new `/legal-assistant` page: ChatGPT-style conversation rail, message bubbles with markdown rendering, the clarifying-question chip UX, document attach, and an English/Hindi toggle. Voice input/output is intentionally not built yet (Phase 3) — the mic button exists but is disabled with a "coming soon" tooltip so the roadmap is visible instead of hidden.

---

## 🔑 What was built

* **`features/legal-agent/`** — `types.ts` (shared `Conversation`/`Message` shapes), `useLegalChat.ts` (local-hook state, matching the existing `useDocumentAnalysis` convention rather than a Redux slice — conversation state doesn't need to be global), and presentational components: `MessageBubble` (React Markdown rendering with a custom `components` map since no `@tailwindcss/typography` plugin is installed; renders citation links when present), `ClarifyOptions` (chip buttons + an "Other" free-text fallback, directly mirroring the AskUserQuestion-style UX the feature was modeled on), `ChatInput` (text + attach + disabled mic placeholder + EN/हिं language toggle + send), `ChatWindow` (always-visible disclaimer banner, empty state, "thinking" shimmer while waiting on the AI), `ConversationSidebar` (history rail), `EmptyState` (four starter prompts, including the "false case out of jealousy, fear of arrest" scenario), `AttachDocumentModal` (reuses the same upload/paste-text pattern as `UploadPanel`, scoped to linking a document into the active conversation).
* **New page + routing**: `pages/LegalAssistant.tsx` composes all of the above; new protected route `/legal-assistant` in `App.tsx`; new "Legal Assistant" nav entry (Scale icon) pushed into `Sidebar.tsx`'s `navItems`.
* **New dependency**: `react-markdown`.
* **Small backend addition**: `PATCH /legal-agent/conversations/:id` (language field only) — needed so the language toggle can switch an *existing* conversation's response language, not just set it at creation time.

---

## ⏭️ Next (Phase 3+)

Voice: mic capture via `MediaRecorder` → Whisper STT → send as a normal chat message; TTS playback of assistant replies. Then Phase 4 polish (streaming responses, richer citations UI, rate limiting).

---

# 🎙️ Voice Input/Output (Phase 3)

---

## 📌 Overview

Replaces the disabled mic placeholder from Phase 2 with real voice: press-to-record via `MediaRecorder`, uploaded and transcribed server-side, plus on-demand TTS playback of any assistant reply.

---

## 🔑 What was built

* **`ChatInput.tsx`** — real recording: `navigator.mediaDevices.getUserMedia({ audio: true })` → `MediaRecorder` (mime type feature-detected via `MediaRecorder.isTypeSupported`, preferring `audio/webm;codecs=opus`) → chunks collected in `ondataavailable`, assembled into a `Blob` in `onstop` and handed to a new `onSendVoice` prop. While recording, the textarea is replaced with a live indicator (pulsing dot + `MM:SS` timer via `setInterval`) and the mic button becomes a red stop button; attach/language/send are disabled mid-recording to keep the input mode unambiguous. Mic-permission denial surfaces as a toast instead of a silent failure.
* **`useLegalChat.ts`** — new `sendVoiceMessage(audioBlob)`, mirroring `sendMessage` but posting `FormData` to the new `/voice-messages` endpoint; unlike text sends there's no optimistic user bubble (the transcript isn't known client-side), so both the transcribed `userMessage` and the assistant `message` from the response are pushed into state together once the round trip completes.
* **`MessageBubble.tsx`** — a "Voice message" badge (mic icon) on any message with `kind: "voice"`; a "Listen" button on assistant replies that fetches `/legal-agent/messages/:id/audio` as a blob (via the existing `API` axios instance, so auth headers are attached automatically — deliberately *not* done via a plain `<audio src>` with a token query param, which would leak the JWT into logs/history), builds an object URL, and plays it with the native `Audio` API. Button cycles through idle/loading (spinner)/playing (pause icon) states.
* **`LegalAssistant.tsx`** — wires `sendVoiceMessage` into `ChatInput`'s new `onSendVoice` prop.

---

# 📄 In-Conversation Document Viewer (Phase 4)

---

## 📌 Overview

Documents attached to a conversation had no way to actually be viewed — attaching one just fired a toast. Added a click-to-preview popup so the user can read exactly what they uploaded/pasted while chatting about it.

---

## 🔑 What was built

* **`types.ts`** — new `AttachedDocument` and `ConversationDocumentLink` shapes; `Conversation` gained an optional `documents` field (matches the backend now including attached documents on the conversation fetch).
* **`useLegalChat.ts`** — new `attachedDocuments` state, populated from `conversation.documents` on `selectConversation`, reset on `startNewConversation`, and appended to immediately on a successful `attachDocument()` call (using the document object the backend now returns from the attach endpoint) — no extra round trip needed either way.
* **New `AttachedDocumentsBar.tsx`** — a compact strip of document chips (file icon + title/filename) rendered between the message list and the input bar, only when the active conversation has attachments; clicking a chip opens the viewer.
* **New `DocumentViewerModal.tsx`** — fetches `GET /documents/:id` for metadata, then either: (a) for file uploads, fetches `GET /documents/:id/file` as a blob via the authed `API` instance and renders it in an `<iframe>` from an object URL (same reasoning as the audio playback: a raw `<iframe src>` can't attach an Authorization header, and a token-in-URL would leak it), or (b) for pasted-text documents, renders the extracted/stored text directly in a scrollable `<pre>`. Large modal (`max-w-4xl h-[85vh]`) since the point is to actually read the document comfortably.
* **`LegalAssistant.tsx`** — wires the bar and modal in with a `viewingDocumentId` state.

---

## ✅ Result (verified with Playwright: registered a user, attached both a pasted-text document and a real PDF — `pdf-parse`'s own test fixture — to a conversation)

* Both attach flows work; two document chips appear in the bar as expected.
* Clicking the pasted-text chip opens the modal showing the exact pasted content, correctly scrollable.
* Clicking the PDF chip opens the modal with the correct filename as the title; a direct `curl` check of `GET /documents/:id/file` confirmed the backend serves a byte-for-byte identical PDF (1,016,315 bytes, correct `%PDF-1.4` header, `Content-Type: application/pdf`) — the iframe rendered blank in the headless-Chromium screenshot, which is a known headless-mode PDF-plugin limitation, not a bug (a real browser's native PDF viewer renders it fine).
* Zero console errors, zero failed network requests across both attach-and-view flows.

---

# 🔗 Citations UI Redesign (Phase 5 — Phase 4 of the legal-agent plan, part 1)

---

## 📌 Overview

Citations were a flat list of plain title links. Redesigned into a proper "Sources" block, matching the backend's new dedup/cap (see `server/README.md` Phase 11).

---

## 🔑 What was built

* **`MessageBubble.tsx`** — citations now render under a small uppercase "Sources" label, each as a row with an `ExternalLink` icon, the citation title, and the source domain (via a small `hostnameOf()` helper wrapping `new URL(c.url).hostname`, stripped of a leading `www.`, with a try/catch fallback to the raw URL if parsing fails) shown as a subtitle underneath — closer to how a real research/citation UI reads than a bare link list.

---

## ✅ Result

Verified visually (Playwright screenshot, real chat answer): two distinct real judgment citations rendered cleanly, each with title + `indiankanoon.org` domain subtitle, correctly deduped (no repeat of the same source).

---

# ⚡ Streaming Responses (Phase 6 — Phase 4 of the legal-agent plan, final item)

---

## 📌 Overview

Chat answers now render token-by-token as the backend generates them (see `server/README.md` Phase 12 for the two-call routing/streaming architecture behind this), instead of the client sitting on a "thinking" indicator for the full 5-10s generation time and then getting the whole answer at once.

---

## 🔑 What was built

* **New `services/api.ts` export**: `API_BASE_URL`, so the streaming code (which uses native `fetch`, not axios — see below) doesn't duplicate the base URL literal.
* **New `features/legal-agent/sse.ts`**: `readSseEvents(response)`, a small async generator that reads a `fetch()` response body's `ReadableStream`, buffers partial chunks, splits on blank-line-delimited SSE frames, and yields parsed JSON events. Native `EventSource` isn't used because it only supports `GET` — this endpoint is a `POST` (it needs to send the message body), so the stream is consumed manually via `fetch` + a `ReadableStream` reader instead, with the auth token attached by hand (read from `localStorage`, mirroring what the axios interceptor does automatically elsewhere).
* **`useLegalChat.ts::sendMessage`** rewritten around `readSseEvents`: on `user_message` it replaces the optimistic user bubble with the server's persisted version; on the first `delta` it appends a new live assistant message to `messages` and starts growing its `content` on each subsequent delta; on `done` it swaps that live placeholder out for the final persisted message (with real citations, id, etc.); on `error` it toasts. New `streamingMessageId` state tracks which message (if any) is currently receiving tokens.
* **`ChatWindow.tsx`** — the "thinking" dots bubble now only shows while `sending && !streamingMessageId` (i.e. during the routing-decision wait, before the first token arrives) — once streaming starts, the growing bubble itself is the activity indicator, so showing both at once would have looked like a duplicate/glitch.
* **`MessageBubble.tsx`** — new `isStreaming` prop: renders a small blinking-cursor bar (a pulsing `span`) right after the markdown content while true, and hides the "Listen" (TTS playback) button until streaming finishes, since playing back partial/incomplete text isn't meaningful.

---

## ✅ Result (verified with Playwright: screenshots taken mid-generation, not just before/after)

* A real "What is anticipatory bail?" question: a screenshot taken ~2.5s after sending still showed the routing-decision "thinking" dots (the extra routing call adds a beat of latency before generation starts); a screenshot ~1.5s later showed real partial prose mid-sentence with the blinking cursor visible — and a direct length comparison between the two screenshots' page text confirmed it **grew** (232 → 427 characters), proving genuine progressive rendering rather than a fake/simulated delay.
* The clarify path was verified through the same SSE endpoint/client code path: correct instant question + chip options, no streaming artifacts.
* Zero console errors, zero failed network requests across both paths.

---

# 🎙️ Live Voice Editing (Phase 7)

---

## 📌 Overview

The mic button previously recorded then instantly sent a "voice message" the moment you stopped — no way to see what was heard, fix a misheard word, or add something before it went out. Redesigned around live captions and an explicit review-before-send step: speech now becomes editable draft text in the input box, exactly like typing, before anything is sent to the agent.

---

## 🔑 What was built

* **New `features/legal-agent/speechRecognition.ts`** — isolates the `any`-typed Web Speech API feature detection (`getSpeechRecognitionCtor()`, `isSpeechRecognitionSupported()`); there's no official TS DOM typing for `SpeechRecognition` in this project's lib target, and it's Chrome/Edge/Safari-only (no Firefox support at all).
* **`ChatInput.tsx` rewritten** around two mutually-exclusive recording paths, chosen once per recording session based on feature detection:
  - **Live path** (Chrome/Edge/Safari): `SpeechRecognition` with `continuous: true, interimResults: true` — `onresult` accumulates finalized segments in a ref and combines them with the current interim segment to update the textarea's value on every partial result, so text visibly grows as the user speaks. Handles the common browser quirk where recognition auto-stops after a pause even with `continuous: true`, by restarting it from `onend` unless the user explicitly stopped (tracked via a ref, not state, to avoid a stale closure in the event handler).
  - **Fallback path** (Firefox, or anywhere without the API): the original `MediaRecorder` capture, but instead of calling a "send voice message" callback on stop, the resulting blob is uploaded to the new `POST /speech/transcribe` (server README Phase 13) and the returned text lands in the textarea the same way — a brief "Transcribing…" state (spinner + label) covers the round trip.
  - Either way, the textarea itself stays visible and shows the growing/final text (`readOnly` only while actively recording or transcribing, to avoid the live updates racing a manual edit) — it does **not** disappear behind a recording indicator like before; a small status row (pulsing dot or spinner + label + timer) sits just above it instead.
  - **Editing, either way**: typing directly works as soon as recording/transcribing stops (textarea becomes editable again). Clicking the mic again **appends** rather than replaces — whatever was already in the box is preserved as a base and new speech is added after it, so the mic doubles as an "add more by voice" tool during editing, per the request.
  - **No auto-send**: stopping a recording (or finishing a fallback transcription) only ever populates the text box. The agent is called exactly the same way as a typed message always was — pressing Enter or clicking Send — never automatically. The `onSendVoice` prop and the old auto-send-on-stop callback are gone entirely; voice input is now just another way to fill the same textarea `sendMessage()` already handles.
* **`useLegalChat.ts` / `LegalAssistant.tsx`** — removed the now-dead `sendVoiceMessage` (nothing calls the old instant-send voice endpoint from the UI anymore; the backend endpoint itself is untouched/still available, just unused by this flow).
* **`MessageBubble.tsx`** — new **Copy** button (with a Copy→Check icon swap + "Copied" label for ~1.5s) added to every message, both user and assistant, using `navigator.clipboard.writeText()`. Sits alongside the existing "Listen" button for assistant messages.

---

## ✅ Result (verified with Playwright, two full passes — one with the browser's native SpeechRecognition present, one with it explicitly deleted via `context.addInitScript` to force the fallback path)

* **Live path**: mic click shows "Listening…" (not "Recording…") with the pulsing dot + timer; stopping does not create a conversation or send anything (confirmed the conversation rail stayed empty) — the recorded fake-audio-device tone produces no real transcript (expected, headless Chromium has no real microphone/speech to recognize), but the important behavior — no auto-send, textarea returns to editable — was confirmed correctly either way.
* **Fallback path**: confirmed `window.SpeechRecognition`/`webkitSpeechRecognition` were absent, mic click showed "Recording…" (not "Listening…"), stopping showed "Transcribing…" with a spinner, then returned to an editable box — again, no auto-send, zero network failures, zero console errors.
* **Copy button**: initial headless run reported "Couldn't copy message" — traced to the automated browser context lacking the `clipboard-write` permission by default, not a code bug. Re-verified with `context.grantPermissions(["clipboard-write"])`: click shows the Copy→Check swap and "Copied" label, and `navigator.clipboard.readText()` afterward returned the exact message text.
* **Identity check**: "Who are you and how can you help me?" now answers "I am ALDRA AI, an AI legal information assistant specializing in Indian law..." — verified end-to-end through a full streamed response.

---

# ⚖️ Rebrand to NyayMitra AI + Editorial Login/Register Redesign (Phase 8)

---

## 📌 Overview

Two things: (1) app-wide rename from the placeholder "LegalAI" (and the chat agent's just-set "ALDRA AI") to a single consistent brand, **NyayMitra AI**, across the sidebar, home page, browser tab title, and the agent's own self-identification; (2) a full visual redesign of the Login and Register pages from the original plain purple/gray cards to a premium "legal case file" editorial look — navy + gold + cream, serif display type, split-screen layout — built from two reference mockups the user provided, with added motion so it doesn't feel static, and full light/dark mode support. UI-only for now: a "Mobile OTP" tab is visually present (per the reference) but not wired to a real backend yet — phone-based auth is explicitly deferred to a follow-up.

---

## 🔑 What was built

* **Rename**: `Sidebar.tsx`, `Home.tsx` ("LegalAI" → "NyayMitra AI"), `index.html`'s `<title>` (was literally "client", now "NyayMitra AI"), and `server/src/modules/legal-agent/legal-agent.prompt.ts`'s shared persona block (ALDRA AI → NyayMitra AI, see server README Phase 14).
* **New design tokens** (`App.css`, Tailwind v4 `@theme` block): a small custom palette — `navy-*`, `gold-*`, `cream-*`, `maroon-*` — plus `font-display` (Fraunces, an editorial serif loaded via Google Fonts in `index.html`) and `font-body` (Inter). Scoped as reusable theme tokens rather than one-off hex values so the look can extend to other pages later without redefining colors.
* **New `features/auth/` component set**, shared by both pages:
  - `AuthShell.tsx` — the split-screen shell: a navy left branding panel (hidden below `lg:`, form stays centered on mobile) with a slowly-rotating dashed ring around a `Landmark` icon, a staggered-entrance headline/subtitle/feature list, ambient drifting gradient blobs for background motion, and a small rotating "People are asking about: {use case}" ticker (cycles through real product use-cases like "rental agreements" / "FIR copies" — a dynamism/curiosity touch that doesn't fabricate fake stats) — plus the right-side form slot.
  - `FeatureList.tsx` — the numbered (01–04) capability list with a framer-motion stagger-in.
  - `CaseFileCard.tsx` — the form card itself: a small maroon "ribbon" tab in the corner, a monospace file-number tag (e.g. "FILE NO. 2026/NM-0472" on Login, "NEW FILE — AWAITING DETAILS" on Register), scale/fade entrance.
  - `AuthTabs.tsx` — Email / Mobile OTP switcher with a `layoutId`-based sliding pill background.
  - `AuthField.tsx` — shared labeled input, with a "Show/Hide" toggle for password fields instead of a plain type-toggle icon, matching the reference's editorial label style.
* **`Login.tsx` rewritten** on top of these: email/password sign-in (existing `loginUser` thunk, unchanged logic — just restyled), a Mobile OTP tab that collects a phone number but submits to a toast ("coming soon") rather than a real endpoint, "Keep me signed in" checkbox and "Forgot password?" link (both UI-only for now, same honest "coming soon" toast pattern rather than a silently dead control), Google OAuth button (unchanged, still real).
* **`Register.tsx` rewritten**, and in the process a **real pre-existing bug was fixed**: the original page dispatched `registerUser` without `await`/`.unwrap()` and without any error handling — it always showed a success toast and navigated to `/login` regardless of whether registration actually succeeded (e.g. a duplicate email would silently fail while still telling the user it worked). Now properly awaits the thunk, validates client-side first (required fields, password match, 8-char minimum, terms-checkbox agreement), and surfaces real backend errors (`err?.response?.data?.message`, e.g. "User already exists") in the same animated error box as Login. Added a mobile-number field (UI-only, not yet sent anywhere) and a Terms/Privacy-Policy agreement checkbox (links show a "coming soon" toast — no such pages exist yet).

---

## ✅ Result (verified with Playwright — visual pass across light/dark/mobile, plus a full functional pass exercising real validation and the actual register → login → dashboard flow)

* Visual: both pages screenshotted in light mode, dark mode, the Mobile OTP tab state, and a 390px-wide mobile viewport — matches the reference's structure closely, dark mode reflows correctly (gold accents keep working on the darker card), mobile correctly collapses the branding panel and stacks the form full-width. Zero console errors across every state.
* Functional: submitting mismatched passwords shows "Passwords don't match." inline (form data preserved, not cleared); submitting without checking the terms box shows the agreement-required error; fixing both and submitting for real creates the account, redirects to `/login`, and logging in with the new credentials correctly reaches `/dashboard` — confirming the rewritten Register flow (and its bug fix) works end-to-end, not just visually.

---

# 📱 Mobile OTP Login Wired Up + Google Button Hardcoded-URL Fix (Phase 9)

---

## 📌 Overview

The Mobile OTP tab left in Phase 8 as a "coming soon" stub is now wired to the real backend endpoints added in `server/README.md` Phase 15. Also fixed both pages' "Continue with Google" button and the shared axios client, which pointed at a hardcoded `http://localhost:3000` — now derived from a configurable base URL so it works outside local dev.

---

## 🔑 What was built

* **`authSlice.ts`**: new `sendOtp`/`verifyOtp` thunks, following the exact `loginUser` pattern (`POST /auth/otp/send`, `POST /auth/otp/verify`); `verifyOtp.fulfilled` sets `user`/`token` and persists to `localStorage` the same way `loginUser.fulfilled` does.
* **`Login.tsx`**: the Mobile OTP tab is now a real two-step flow — enter phone → `Send OTP` (dispatches `sendOtp`) → a second step with a 6-digit code field, `Verify & sign in` (dispatches `verifyOtp`, then navigates to `/dashboard`) and a `Change number` link to go back. Reuses the existing `AuthField`/`AuthTabs` components as-is, no new UI primitives needed.
* **`Register.tsx`**: the phone field collected since Phase 8 is now actually sent in the `registerUser` dispatch payload (previously silently dropped).
* **`services/api.ts`**: `API_BASE_URL` changed from a hardcoded string to `import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1"`. `Login.tsx`/`Register.tsx`'s "Continue with Google" buttons now build their redirect from this same constant instead of duplicating the hardcoded URL.

---

## ✅ Result (verified end-to-end with a real headless-Chromium Playwright session against both dev servers, test data cleaned up after)

* `npx tsc -b tsconfig.app.json` shows only two **pre-existing, unrelated** errors (an unused `toast` import in `authSlice.ts` that predates this change, and an unrelated null-check gap in `DocumentList.tsx`) — nothing introduced by this change fails type-checking.
* **Mobile OTP login, full browser run**: `/login` → Mobile OTP tab → entered a phone number → "Send OTP" → toast "OTP sent to your mobile number." → OTP-entry step appeared → read the dev-logged code from the server console → "Verify & sign in" → toast "Login successful!" → landed on `/dashboard` showing the auto-created "Mobile User" account, logged in for real (not a mock).
* **Register phone wiring**: filled name/email/phone/password on `/register`, submitted → "Account created — please sign in." → redirected to `/login`; confirmed via the server's DB that the submitted phone number was actually persisted on the new row (previously silently dropped).
* Zero browser console errors or page errors across the entire run (checked via Playwright's console listener, not just visual inspection).

---

# 🎨 App-Wide Redesign: Extending the Case File System (Phase 10)

---

## 📌 Overview

Home, Dashboard, Documents, and Legal Assistant were still on a generic dark/purple SaaS template, while Login/Register had a distinct, considered "case file" editorial identity (navy/gold/cream, Fraunces serif, maroon ribbon motif — Phase 8). Rather than design a fourth look, this phase extends that existing system to the rest of the app so it reads as one product, and rebuilds the Home page around real, fully-visible product previews (a real-looking risk report, a real Legal Assistant exchange) instead of generic marketing copy — visitors can see every feature before logging in; login is only required to analyze their own documents. Approved beforehand via an HTML mockup reviewed with the user before touching any real component.

---

## 🔑 What was built

* **Design tokens** (`App.css`): added `risk-high/med/low` bg+fg color pairs (light and dark variants) — deliberately distinct from the `gold` brand accent so a "medium risk" chip is never mistaken for a call-to-action — and a `--font-mono` token (IBM Plex Mono, added to `index.html`'s Google Fonts link) for file tags, risk scores, and timestamps.
* **`Home.tsx`** — full rewrite: hero opens directly on a live-looking risk report card instead of generic hero art; a "Every feature, in the open" section shows a real risk-report preview (rental-agreement clauses) and a real Legal Assistant exchange (citing the actual *Sushila Aggarwal* case already used elsewhere in the product) side by side, each ending in a plain "Analyze it free" / "Ask NyayMitra" link rather than a blurred paywall teaser; an IPC→BNS/CrPC→BNSS mapping strip and a real 3-step "how it works" sequence follow. Initially used `framer-motion`'s `whileInView` for scroll-reveal on these sections — caught in testing that Playwright's full-page screenshot never triggered the IntersectionObserver, leaving everything below the hero blank. Same risk applies to real users on some scroll/viewport combinations, so scroll-triggered reveal was removed entirely in favor of content that's simply always visible; only the hero keeps a plain mount-time `animate`.
* **`components/layout/Sidebar.tsx`** — restyled to the navy shell + gold left-bar active state used everywhere now; also absorbed the user avatar/name/logout card that `Dashboard.tsx` previously rendered separately in its own topbar (removing that duplication — `Dashboard.tsx`'s topbar is now just a slim case-file-tag label).
* **`ThemeToggle.tsx`** — recolored from generic gray to `cream-100`/`navy-800` + gold icon so it matches on every page without needing per-page override classes.
* **Dashboard/Documents pipeline** (`UploadPanel.tsx`, `DocumentList.tsx`, `ResultPanel.tsx`, `DocumentsPage.tsx`) — restyled only, all data flow/hooks untouched: the upload panel's bare `<input type="file">` became a proper dropzone-style control; document rows get a gold left-bar when selected; risk badges/gauge/flagged-clause cards in `ResultPanel` now use the new semantic risk tokens instead of raw Tailwind `red-600`/`yellow-500`/`green-600`.
* **Legal Assistant** (`ConversationSidebar`, `ChatWindow`, `EmptyState`, `MessageBubble`, `ClarifyOptions`, `ChatInput`, `AttachedDocumentsBar`, `AttachDocumentModal`, `DocumentViewerModal`) — restyled only; the streaming SSE pipeline, live-caption/MediaRecorder voice input, citation rendering, and audio playback in `useLegalChat.ts`/`sse.ts`/`speechRecognition.ts` were never touched. Assistant bubbles are now solid navy with cream text (previously purple); user bubbles are cream/navy-800; the disclaimer banner uses the new risk-medium tokens instead of raw amber.
* **Real, pre-existing bug fixed along the way**: `user.controller.ts`'s `register` handler (server-side, see server README) was already swallowing every registration error into a generic 500 — not new to this phase, but it meant no restyle of the Register error box would ever have shown a real message. Left as documented in the server README rather than re-describing here.

---

## ✅ Result (verified with a real headless-Chromium run against both dev servers, light **and** dark, real backend data — not just static screenshots)

* Home, Dashboard (empty state), Documents (empty state), and Legal Assistant (empty state) screenshotted in both color schemes — zero console/page errors in any of the eight captures.
* Ran a real paste-text analysis end-to-end through the actual UI (not seeded/mocked data): a deliberately landlord-favoring lease produced `riskLevel: High`, `riskScore: 90`, a serif summary quote, an "Important Clauses" list, and "Flagged Clauses" cards with severity/category chips — confirming `ResultPanel`'s new styling renders correctly against real AI output, not just placeholder markup.
* All test users/documents/analyses created during verification were deleted from the dev database afterward.

---

# 📌 Home Page: Pinned Scroll Reveal + Step Cards (Phase 11)

---

## 📌 Overview

Two refinements to the Phase 10 Home page: the "Every feature, in the open" section now pins to the viewport on desktop while its two preview cards slide in from opposite sides as you scroll, and the "How it works" steps became real cards with fuller descriptions.

---

## 🔑 What was built

* **Pinned scroll reveal** (`Home.tsx::FeaturePreview`): a 160vh-tall section containing a `sticky top-0 h-screen` inner panel. `framer-motion`'s `useScroll` (target = the section, offset `start start → end end`, so progress spans exactly the pinned distance) drives `useTransform` mappings — the risk-report card goes `-60vw → 0`, the legal-assistant card `60vw → 0` — finishing at 70% progress so there's a short settle before the page unpins and normal scrolling resumes. No opacity fade: the cards start fully off-screen, and an earlier opacity mapping just left them looking dim at rest.
* **Scoped deliberately**: only this section pins (chosen over pinning every section — less to go wrong). **Mobile** (`< md`, via a small `useIsDesktop` matchMedia hook) and **`prefers-reduced-motion`** both render the plain static two-card layout with normal scrolling instead.
* The two cards were extracted into `RiskReportCard` / `LegalAssistantCard` so the pinned and static layouts share one copy of the markup. The "See it in action" anchor now targets a spot ~45% through the pinned range (an invisible absolutely-positioned `#preview` span) so the jump lands with the cards already in place instead of on an empty pin start.
* **How it works → cards**: each step is a bordered card with an icon (`UploadCloud` / `ScanSearch` / `MessagesSquare`), a "Step 0N" label, and a 2–3 sentence description. The numbering stays because these really are sequential steps.
* `App.css`: `html, body, #root { position: relative }` — `useScroll` logs a dev warning unless its scroll container is positioned.

---

## ✅ Result (headless Chromium, 1440×800 desktop + 390×800 mobile, driven by real incremental `scrollTo` — not a full-page screenshot)

* Sampled the pinned range at 0 / 25 / 50 / 75 / 100%: card edges moved `-656 → -347 → -38 → 208` (left card) and `1596 → 1287 → 978 → 732` (right card), settling at the grid position by 75% and staying put through the end of the pin; the next section then scrolls in normally.
* "See it in action" lands with both cards in place; mobile renders no pinned section at all and shows the stacked static cards.
* Zero console errors or warnings once the positioned-container fix was in.
* Lesson recorded: Phase 10's `whileInView` reveal looked broken only because Playwright's `fullPage` screenshot never triggers scroll observers — real incremental scrolling is the right way to test scroll-linked effects.

---

# 🧭 Section Guides + Documents Card Grid (Phase 12)

---

## 📌 Overview

A brand-new user landing on the Dashboard had no way to know what Dashboard, Documents, and Legal Assistant were each *for*. Every in-app section now opens with a header and a short "what this is / what you can do here" guide, and the Documents page was rebuilt as the card grid from the approved mockup, with each card's report opening below the grid.

---

## 🔑 What was built

* **`components/layout/PageIntro.tsx`** — one reusable header: mono eyebrow, serif title, a one-paragraph purpose statement, and three point-cards (icon + short title + one sentence). Open by default so new users see it; a "Hide guide / How this works" toggle collapses it, and the choice is remembered per page in `localStorage` (`intro:<page>`, wrapped in try/catch so blocked storage just means it resets each visit). Used by Dashboard ("Analyze a legal document": add → read the report → find it later), Documents ("Every document you've analyzed"), and Legal Assistant ("Ask a question about Indian law": ask in your own words → answer follow-ups → attach a document). It replaces the Dashboard's old date-only top bar.
* **`features/document/DocumentGrid.tsx`** (new) + rewritten **`DocumentsPage.tsx`** — responsive card grid (1/2/3/4 columns): file tile, title, `type · date`, and a verdict chip. Chip = `High/Medium/Low risk` once analyzed, else `Not analyzed yet` (or `Analysis failed`), so no card is ever status-less. The selected card gets a gold border; clicking a card runs the existing `runAnalysis` (cached results return instantly) and smooth-scrolls to an "Analysis report" section directly under the grid, where the existing `ResultPanel` renders. Empty state links to the Dashboard. The old two-column list + side-panel layout on this page is gone; the compact `DocumentList` is still used on the Dashboard.
* **`features/document/riskStyles.ts`** — the High/Medium/Low chip classes were extracted from `ResultPanel.tsx` so the grid and the report can't drift apart.

---

## ✅ Result (headless Chromium, light + dark, with a seeded throwaway user)

* Grid chips read `["Not analyzed yet","High risk","Low risk","Medium risk"]` straight from the API for four seeded documents; clicking the lease card marked it selected, opened the full report (score 90, summary quote) below the grid.
* Collapsing the guide and reloading kept it collapsed; zero console errors/warnings across Dashboard, Documents, and Legal Assistant in both themes. Test user and documents were deleted afterward.

---

# 🚪 Logout Goes to the Home Page (Phase 13)

---

## 📌 Overview

Logging out was supposed to land on the public home page (so the visitor can see the marketing site again), but `Sidebar.tsx`'s `navigate("/")` never won: users ended up on `/login`.

---

## 🔑 Root cause and fix

* `logout()` removes the token, which re-renders the still-mounted protected page. `ProtectedRoute` sees no token and renders `<Navigate to="/login">`, whose redirect fires *after* the sidebar's `navigate("/")` — a real logged-in run showed the path trail `["/", "/login"]`. Reordering `dispatch`/`navigate` is not a reliable fix (router navigation is a deferred transition, so the guard can still render once at the old location).
* `authSlice.ts` gained a `loggedOut` flag: set by `logout`, cleared on `loginUser`/`verifyOtp`/`fetchCurrentUser` success (the last also covers Google login). It starts `false`, so it is never set on a fresh page load.
* `ProtectedRoute.tsx` reads it: no token + `loggedOut` → `/` ; no token otherwise → `/login`. Both redirects now use `replace`. `Sidebar.tsx` keeps `navigate("/", { replace: true })` so the Back button can't return to a protected page.

---

## ✅ Result (real login through the form, real backend, headless Chromium)

* Logout from Dashboard, Documents, and Legal Assistant each lands on `/` with the home page visible; signing back in after a logout works each time.
* Regressions checked: opening `/dashboard` with no token still redirects to `/login`, and a logged-out user who reloads and opens `/documents` also goes to `/login`. No page errors. Test user deleted afterward.
* Testing note: a fake `localStorage` token did **not** reproduce the bug (the user never loaded, so the timing differed) — only a real login did.

---

# 🏠 Dashboard Overview + Document/Chat Management (Phase 14)

---

## 📌 Overview

The Dashboard was the document-analysis workspace (upload panel, list, report), so it never told a user what the platform actually holds. It is now a clean **overview**; analyzing moved to the Documents tab, and both documents and chats can now be managed (rename / delete / favorite) instead of only created.

---

## 🔑 What was built

* **Dashboard** (`pages/Dashboard.tsx`, new `features/dashboard/`): time-of-day welcome with the user's first name and Upload / New chat buttons; a stats row (Documents, Chats, High-risk documents, Favorites — all derived from the two existing list endpoints, no dashboard endpoint); a **Recent documents** table (latest 5: name, type, date, risk chip, and view / favorite / rename / delete actions); **Recent chats** (latest 5 with "N messages · 1 hour ago"). Empty accounts get onboarding cards ("Analyze your first document", "Ask your first question") in place of the old `PageIntro`. Side-by-side layout only from 1400px; stacked below, because the table clipped its Actions column at narrower widths.
* **Shared document actions** (`features/document/useDocumentActions.tsx`, `DocumentActionButtons.tsx`, `documentApi.ts`): one hook owns rename/delete/favorite/view + their dialogs, so the Dashboard table and the Documents cards behave identically. New reusable `components/ui/ConfirmDialog.tsx` and `RenameDialog.tsx` (Esc/backdrop to cancel, Save disabled until the name actually changes, dialog stays open on a server error), and `utils/timeAgo.ts` (`Intl.RelativeTimeFormat`, no dependency).
* **Documents tab** now carries the moved analyze feature: the upload panel sits at the top, cards gained the same actions and a favorite star, and `?doc=<id>` (from the Dashboard's file-name link) auto-opens that report and is then cleared. Cards became `div role=button` (they contain buttons now). `useDocumentAnalysis.clearSelection()` drops the report when its document is deleted.
* **Legal Assistant chat management**: `ConversationSidebar` rows have rename and delete on hover/focus (locked for the open chat while a reply is streaming); `useLegalChat` gained `renameConversation`/`deleteConversation`, and a failed conversation load no longer leaves that id "active". The Dashboard deep-links in with `?c=<id>` (open) or `?new=1` (start), handled once and only *after* the chat list has loaded — otherwise the list response could overwrite a chat created by the link.

---

## ✅ Result (headless Chromium with real login, API-seeded data, light + dark)

* 21 UI checks pass: greeting/stats/rows, favorite (star + stat), rename, view modal, delete (cancel keeps, confirm removes and updates the count), file name → open report with the param cleared, deleting the open card clears its report, chat click opens that exact chat, sidebar rename, deleting the open chat returns to the empty view, "New chat" from the Dashboard, and the brand-new-user empty states. Zero console errors.
* Caught by looking at screenshots, not assertions: the documents table clipped the Actions column at 1440px and again at 1280px. Fixed and re-measured overflow at 1440 / 1280 / 1100 (light + dark).
* Test lessons: `text=` locators are case-insensitive substring matches, so `text=Risk score` matched the intro's lowercase copy and let a test race the real report — use `h2:text-is(...)`. Stale Vite processes on 5173–5175 silently moved a fresh dev server to another port while the old one kept serving; kill them before testing.

---

# 🧑‍⚖️ Connect Advocate — Phase 0: Admin Panel for Advocates (Phase 15)

---

## 📌 Overview

The admin side of the "Connect Advocate" feature (see `server/README.md` Phase 18 for the model and rules): create and manage the advocates clients will later connect with — real advocates and the NyayMitra AI advocate — from one panel. The client-facing Connect Advocate tab and the live meeting come in later phases.

---

## 🔑 What was built

* **`AdminRoute`** — guards `/admin/advocates`: no token → `/login`; profile still loading → "Checking access…"; not an admin → `/dashboard`. Client-side convenience only; the server re-checks the role in the database on every admin request. **`Sidebar`** shows an "Admin" item only when `user.role === "ADMIN"`. (Also tidied the stale, overlapping comment in `Sidebar`'s `handleLogout`.)
* **`pages/admin/AdvocatesAdminPage.tsx`** — list of advocates (photo/initials, AI or Human tag, status, verified badge) with an editor beside it. `features/admin/`: `AdvocateProfileForm` (profile fields, photo upload/remove, and a Publishing section: status, verification, accepting consultations — the form re-syncs to what the server actually stored, e.g. disabling clears "accepting"), `CredentialsEditor` (credential types offered depend on the advocate kind, so the AI editor can only add knowledge sources/scope; a ✓ toggle marks a credential as checked), `AiConfigEditor` (model, voice, temperature, session length, retrieval settings, persona notes — with the note that the safety and citation rules are built in and can't be edited), plus a delete confirmation. Server rule messages are shown as toasts (e.g. "A human advocate must be verified before being published…").
* Labels adapt to the kind: an AI has "Areas covered / Courts covered (judgments)" where a human has "Practice areas / Practises before", and no years-of-experience field — the AI is described by what it covers, never by credentials it doesn't have.

---

## ✅ Result (headless Chromium, real accounts, light + dark)

* A normal user sees no Admin item and is bounced from `/admin/advocates` to the dashboard. An admin sees the panel with the default AI advocate; the AI's credential dropdown offers only Knowledge source / Scope / Last verified.
* AI config edit saves and the version bumps. A human advocate can be created (as a Draft), is refused publishing while unverified, is refused verification until the enrolment is ticked as checked, then publishes with the verified badge; a photo uploads and displays; delete removes it. No console errors. Test accounts/advocates deleted afterwards.

---

# 🎙️ Connect Advocate — Phase 3: The Live Consultation Screens (Phase 16)

---

## 📌 Overview

The client for the live voice consultation (server: Phases 18–21). A new **Connect Advocate** section lets a signed-in user pick an advocate, check in like a video-call lobby, talk to the NyayMitra AI Advocate by voice, watch the transcript and the law it relies on appear live, and keep a written summary afterwards.

---

## 🔑 What was built

* **Choose screen** (`/connect-advocate`, `pages/ConnectAdvocatePage.tsx`): a guide, then the **AI advocate card** and a **Human advocates** section. `AdvocateCard` is one component for both kinds (photo, headline, languages, coverage, practice areas, credentials), so switching human advocates on later needs no redesign — humans are listed from the same API and rendered with a disabled "Coming soon" button (an empty state explains what will appear). The AI card carries an **AI** badge, a plain "not a human lawyer / can't appear in court" notice, and a "What it is grounded in" list built from its knowledge-source credentials, so the profile never claims an Act that isn't loaded.
* **Check-in** (`/connect-advocate/join/:slug`, `LobbyPanel`): state (with a "not sure / central law only" option) and language, a **real microphone test** with a live level meter, the recording/AI notice with a consent checkbox (Join stays disabled without it — the server requires it too), and the remaining daily minutes. Nothing is created or billed until Join is pressed.
* **Live room** (`/connect-advocate/session/:id`, `CallRoom` + `useConsultationCall`): a meeting-style layout — advocate tile and your tile with **speaking rings driven by real audio levels**, mute, end call, a countdown that turns red in the last minute, a permanent "you are speaking with an AI" strip, and a side panel with **Transcript** and **Sources** tabs. The transcript shows each provision the advocate mentions as a chip: green *confirmed from the official text*, amber *unverified* (with a text alternative for screen readers). Sources lists every provision looked up, expandable, with a link to the official document.
* **How the call works in the browser** (`useConsultationCall.ts`): microphone → `RTCPeerConnection` → complete offer (waits for ICE) → `POST /consultations/:id/connect` → set the answer. The browser only carries audio; law lookups, the transcript and time limits are the server's job (the transcript is polled every 1.5 s). Everything is torn down on hang-up, connection failure, a server-side end (time limit / silence) or **leaving the page — which ends the call** so it never keeps running unseen.
* **Summary** (`SummaryView`): situation and key facts, the law that applies (with a warning banner if any provision could not be confirmed), options with steps / where / how long / likely reaction / risks, what the advocate suggested ("the decision is yours"), next steps, deadlines, points to confirm with an advocate, and the AI disclaimer; print / save as PDF, the full transcript and sources, and delete. It handles pending / failed / skipped summaries honestly.
* **History** (`/connect-advocate/history`): past consultations with status, duration and "Summary ready"; delete with confirmation.
* **Sidebar**: a "Connect Advocate" item; active highlighting now covers sub-pages (`/connect-advocate/…`), and the shared page frame reserves room for the mobile menu button.

---

## ✅ Result (Playwright, real Chromium against the running app and API; a synthetic caller speaks through a fake microphone)

35 UI checks pass, including: the AI badge and disclaimer, disabled human card, Join blocked until consent; auto-join after check-in with a live countdown and "AI" strip; the advocate's greeting, the caller's speech, the law lookup and a green **BNS s.304** chip appearing in the transcript; the Sources tab with an official-text link; ending the call → summary with the disclaimer and no unverified warning; the full transcript from the summary; history "Completed · Summary ready"; delete removing the record and its turns; **navigating away mid-call ends it (`ENDED/user_ended`)**; the microphone test meter; no console errors; no horizontal scroll at 1440 px or 390 px; light and dark screenshots reviewed.

**Known limits:** an advocate who takes longer than a few seconds to answer shows "Listening" with no spinner; the speaking rings use audio loudness, not the model's own events; refreshing the page during a call drops the call (it is closed by the server within moments and the summary is still produced).

---

# 🎥 Connect Advocate — Phase 4: A Video-Call Room and an Optional Camera (Phase 17)

---

## 📌 Overview

The call used to be two dark tiles. It is now laid out like a real video call, and the user can optionally turn on their camera. An animated illustrated face for the advocate was tried and **removed** — it read as a cartoon, not the realistic humanoid that was wanted (see the note at the end).

---

## 🔑 What was built

* **Video-call room** (`CallRoom.tsx`): the advocate is centred on a dark stage as a gold-ringed robot icon (`AdvocateOrb.tsx`) whose rings and glow swell with the advocate's **real voice level**, with three bouncing dots while it is thinking. Top-left: the Live pill and a name tag (**"NyayMitra AI Advocate" + an AI chip** + *Listening / Speaking / Thinking… / Checking the law…*); top-right: the countdown; your picture-in-picture in the corner; **live captions** taken from the call's event stream (last two lines, so they never cover the stage); a floating control bar — mic, camera, captions, transcript panel, end call. The transcript / sources side panel can be hidden for a bigger stage. A slim notice keeps "AI, not a human lawyer / call 112" on screen.
* **Camera, optional and private** (`useLocalCamera.ts`, `SelfView.tsx`): check-in has a prominent "Would you like to turn on your camera?" card with a live preview. Nothing opens until the user chooses; a refusal or missing camera just shows a friendly note and they carry on; the choice carries into the call and can be toggled there. The video is **self-view only — never added to the call**, because the advocate is an AI that doesn't use video (the screen says so). The camera is released the instant the call ends.
* **Talks like a person** — server side, see Phase 22 (warmer `marin` voice, greets by first name, empathy, natural acknowledgements).

---

## ✅ Result (Playwright in real Chromium, fake camera, synthetic spoken caller; 24 checks)

The camera step explains itself and opens nothing until chosen; the lobby preview plays; the camera chosen at check-in comes on as a self-view and toggles off and on; the rings pulse with the advocate's real voice; live captions appear; the status shows Speaking / Listening and a Thinking / Checking-the-law state before the answer; the answer still carries a verified provision chip; mute, captions and the panel toggle work; no horizontal scroll at 390 px; **after the call no camera or microphone track is left running**; a refused camera shows a friendly note and Join still works; no console errors. Desktop and mobile were reviewed as screenshots (two layout bugs found and fixed that way: the self-view landing on top of the name tag, and captions covering the stage on phones).

**About a realistic face:** a hand-drawn SVG portrait (blinking, voice-driven mouth, thinking expression) was built and tested, then removed because it looked like a cartoon. A photo-real talking humanoid cannot be drawn in code; it needs a streaming-avatar service (e.g. HeyGen, D-ID, Tavus, Simli) with its own account and API key, or a licensed 3D character. If one is chosen, only `AdvocateOrb` would be replaced — the room, camera, captions and controls stay.

---

# 🗂️ Connect Advocate — Phase 5: A Compact Advocate Card (Phase 18)

---

## 📌 Overview

The AI advocate's card had grown to ~1000 px tall (bio, languages, coverage, practice areas, ten knowledge sources, disclaimer all at once). It is now a small card, and the human-advocates placeholder sits beside it in the same row.

---

## 🔑 What changed

* **`AdvocateCard`** shows only the essentials: the "AI advocate" label, photo/icon, name, the **AI** badge, the headline and a permanent one-liner *"An AI — not a human lawyer."* Everything else is behind **pills** — *About*, *Languages & coverage*, *What it's grounded in*, *Good to know* (humans get *Credentials* instead of the last two) — and opens **only when clicked, one section at a time**; clicking the open pill collapses it. Nothing is open by default. Pills are real buttons (`aria-expanded`, `aria-controls`), the "grounded in" list scrolls if long, and "Good to know" states the limits plainly: it cannot appear in court, and only central law is loaded (no state rules or judgments).
* **One row of equal cards** (`ConnectAdvocatePage`): the AI card and the new `HumanAdvocatesSoonCard` ("Speak to a real lawyer · Coming soon" with a disabled button) share a two-column grid that stacks on phones; the two separate section headings became small labels inside each card. When human advocates exist they appear in the same grid through the same card. Cards align to the top, so opening a section in one does not stretch the other.

---

## ✅ Result (Playwright, 17 checks)

Both cards share a top edge and width (438 px each); the AI card is 291 px tall collapsed; nothing is expanded by default; each pill shows only its own section and replaces the previous one; "grounded in" lists all 10 loaded Acts; clicking the open pill collapses it; the Coming-soon card stays ~195 px while the AI card expands; Start consultation still goes to check-in; no console errors; no horizontal scroll at 390 px, with or without a section open. Light and dark screenshots reviewed.

---

# ❎ Admin — A Close Button and Auto-Close on Save (Phase 19)

---

## 🔑 What changed

* The advocate editor (`/admin/advocates`) now has a **close (X) button at the top right**, level with the advocate's name, on both the edit panel and the "New advocate" form. Closing returns to the empty "Select an advocate" state; the list stays as it is. Unsaved edits in the panel are discarded.
* **Saving closes the editor automatically** — the profile form's *Save changes* and the AI advocate's *Save AI configuration* (`onSubmitted` callbacks, called only after the server accepts the save). A failed save (e.g. trying to publish an unverified advocate) keeps the editor open so nothing typed is lost.
* Deliberately **not** auto-closed: creating a new advocate (it still needs credentials before it can be verified), photo upload/removal, and adding, verifying or removing credentials — those are steps within one editing session.

## ✅ Result (Playwright, 17 checks, throwaway advocates only)

X present, top-right and level with the title; X closes; Save changes closes and the change is stored; a failed save stays open; photo upload and adding a credential stay open; the new-advocate form has an X and *Create* keeps it open; saving the AI configuration closes; no console errors; no horizontal scroll at 390 px. The real advocates and the real AI configuration were verified untouched afterwards.

---

# 🧑‍⚖️ Connect Advocate — Phase 6: Live Calls With Real Advocates (Phase 20)

---

## 📌 Overview

The client side of calling a real advocate (server: Phase 23). An advocate signs in, opens their **Advocate Desk** and switches **Available now** on; a client requests a consultation from the advocate's card; the advocate accepts; and the two connect in a private video call, browser to browser, that nobody records.

---

## 🔑 What was built

* **Client journey.** On the choose page a human advocate's card shows **Available now / In a consultation / Offline** (refreshed every 8 s) and a *Request consultation* button only when they can be reached. The check-in form (`LobbyPanel`, `mode="human"`) adds *what would you like to talk about?* (10+ characters), the state/language, the optional camera preview and a notice written for a real person (what the advocate sees; not recorded; the advocate's own guidance). Submitting creates the request and opens `/connect-advocate/human/:id` (`HumanConsultationPage`), which follows the request live and shows: **waiting** (with the time left and *Cancel request*) → **the call** → **finished** (duration, the notes the advocate chose to share, delete), or a clear message if the advocate declined (with their reason), didn't answer in time, or the request was cancelled. Refreshing mid-call offers *Join the call* to rejoin.
* **The call** (`useWebRtcCall.ts`, `HumanCallRoom.tsx`). The other person's video fills the stage — with their photo or initial and the sound still playing while their camera is off — and yours sits in the corner. Mic, camera (each side announces it, so the switch is instant) and *End call*; a countdown from the **server's** clock; a notice that the call isn't recorded; "Tap to hear" if the browser blocks autoplay; friendly errors for a blocked microphone/camera or a failed connection. The advocate always makes the WebRTC offer; if either side refreshes or drops, the other waits and the call renegotiates when they return.
* **The Advocate Desk** (`/advocate`, sidebar item shown only to accounts linked to an advocate profile). An **Available now** switch (with the reason if the profile isn't published/verified), a live connection indicator, **requests waiting** with the client's first name + initial, state, language, message, a countdown and *Accept / Decline (optional reason)*, **in progress** calls with *Join / Rejoin*, and **past consultations**. New requests play a chime, flash the tab title and (if allowed) raise a desktop notification.
* **Advocate session** (`/advocate/session/:id`). The call with the client's details and a **notes panel** beside it — private notes, and notes for the client (shown to them only after the call). Notes autosave; the panel saves only the field that changed, follows the server when a field has no unsaved edits, and saves anything pending as it closes.
* **Admin.** A *Advocate login* section in the human advocate editor links or unlinks the advocate's account by email.
* History lists human consultations with their outcome and links them to the right page; AI-only pages redirect human ones (and vice-versa).

---

## ✅ Result (Playwright — two separate real browsers, fake camera and microphone; 43 checks)

Admin links the advocate's account in the UI; the advocate sees an Advocate Desk (a normal user doesn't, and `/advocate` bounces them); the desk starts **offline**; the client sees **Offline** and a disabled button, then **Available now** once the advocate switches on; the request form needs a subject and consent; the request reaches the desk within seconds with *Rohan V.* and never the client's email; **cancel** withdraws it; **decline** tells the client at once with the reason; **accept** opens the session and **both sides go Live**; each receives the other's **video and audio**; a server-clock countdown on both; the client turning their camera off shows the placeholder to the advocate, and back on restores video; mute; notes autosave; **a refresh mid-call** offers rejoin and the call **reconnects on both sides**; the advocate ends the call and both land on the finished page; the client sees the **shared** notes and never the private ones; the advocate still has both; histories list the outcomes; going offline shows **Offline** to clients; no horizontal scroll at 390 px; no console errors on either side. The real advocates were verified untouched afterwards.

**A bug this testing found (and fixed):** when a call ended, the advocate's notes panel remounted showing the notes as they were *before* the call — empty boxes — and the next edit would have overwritten the saved text. The panel now follows the server, sends only what changed, and saves on close.

**Known limits:** a TURN relay must be configured for reliability on strict networks; advocates must keep the desk tab open (no email/SMS alerts yet); no payments or booked slots yet; a refreshed tab has to press *Join the call* (browsers require a gesture to restart media).

---

---

# 💬 Plain-Language Errors Across the Platform (Phase 21)

---

## 📌 Overview

Failures used to reach people as developer text — signing in with an email that was never registered showed **"Request failed with status code 404"**, an offline upload said only "Upload failed", and a failed document list said **"No documents yet"**. Every screen now tells the person what actually went wrong and what to do, in the place they are looking.

---

## 🔑 What changed

* **One helper for every error** (`services/apiError.ts`). `apiErrorMessage(err, fallback)` turns any failure into a sentence: the server's own message for 4xx answers; *"We can't reach NyayMitra… check your internet connection"* when there is no answer (offline, server down, timeout); *"Something went wrong on our side"* for a server crash (never "Internal Server Error"); *"Your session has expired. Please sign in again."* when a saved login stops working. `failedResponseError` does the same for the streaming chat, which uses `fetch` rather than axios. The old per-screen `err?.response?.data?.message || "Failed"` pattern is gone.
* **Sign-in** (`Login.tsx`, `AuthNotice.tsx`, `AuthField.tsx`). The message shows inline above the form and scrolls into view (so it is seen on a phone). An unregistered email says so and offers **Create an account** (which opens Register with the email already filled in); a wrong password outlines the password field; typing in the highlighted field clears the message; empty or malformed input is caught before any request. Failed Google sign-in returns to this page with an explanation instead of a page of raw JSON.
* **Register** (`Register.tsx`). Each problem names the field (outlined) — passwords that differ, a short password, an unticked agreement. An email or mobile number that already has an account says so and offers **Sign in instead**.
* **Expired sessions** (`services/api.ts`, `authSlice.ts`, `ProtectedRoute.tsx`, `App.tsx`). When the server stops accepting the saved token, it is cleared once and the person lands on sign-in with *"Your session has expired"* (previously every screen failed separately and the dashboard stayed open).
* **Errors in place, not in toasts** (`components/ui/FormError.tsx`). Anything a person submits now shows its failure beside the button that caused it: document upload, the chat's *Attach a document* window, rename and delete dialogs (the dialog stays open and says why), and the admin editors (advocate save, photo, AI configuration, credentials, account link). Toasts remain for quick confirmations and background actions (favorite, copy, load).
* **No more silent failures.** The documents list shows the reason with **Try again** instead of claiming "No documents yet"; the Advocate Desk shows a warning if its refresh fails (an advocate could otherwise miss a request without knowing) instead of "Loading…" forever.
* Small wording fixes: the blocked-microphone message says how to unblock it.

---

## ✅ Result (Playwright, 31 checks, real browser against the real server code)

The screenshot case (unregistered email → plain message, email outlined, "Create an account" carries the email to Register); wrong password; empty/malformed input sends no request; server unreachable and server crash (simulated); register mismatch and already-registered (real 409); failed Google sign-in; a stale token sends the person to sign-in with the explanation and clears it; upload with no file and while offline show inside the panel and not as a toast; a failed document load says so and *Try again* recovers. Checked in light and dark at phone width.

**A slip worth recording:** a bulk find-and-replace script I used to migrate the old error pattern corrupted seven files (it inserted text between every character). The type-check would not have caught it, but a diff review did; the files were restored from git and re-edited one at a time.

**Known limits:** the streaming chat still reports a failed answer as a toast (it is a background stream, not a form); the unused `pages/DocumentList.tsx` still has an old type error.

---
