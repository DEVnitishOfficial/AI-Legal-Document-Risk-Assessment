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

## ✅ Result

Verified in a real headless-browser session (login persisted across refresh, paste-text → analyze → click into `/documents` → same report, theme toggle on every page):

* Real name and avatar initial shown immediately after both login methods, and survives a hard refresh
* Clicking a document on `/documents` shows the identical AI analysis report as Dashboard
* Structured risk cards (severity + category chips) and the risk-score bar render correctly
* Theme toggles correctly on Home, Login, Register, Dashboard, and Documents, with no invisible-text or unstyled regions in either mode, and the choice survives a page refresh
* Zero console errors across the full flow

---



