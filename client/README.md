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
