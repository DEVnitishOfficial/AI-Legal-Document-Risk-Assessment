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



