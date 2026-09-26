# 🚀 AI-Powered Legal Document Analyzer

### Backend Setup (Phase 0 + Phase 1)

---

## 📌 Overview

This project is an **AI-powered Legal Document Analyzer and Risk Assessment System**.
The goal is to help users understand complex legal documents by:

* Simplifying legal language
* Extracting important clauses
* Identifying potential risks

This README documents the **initial backend setup**, including:

* Project structure
* Dockerized PostgreSQL setup
* Node.js + TypeScript backend
* Database connection
* User insertion flow

---

## 🏗️ Project Structure

```bash
legal-ai-app/
│
├── client/        # Frontend (React - upcoming)
├── server/        # Backend (Node.js + TypeScript)
├── docs/          # Documentation
```

### Backend Structure

```bash
server/src/
│
├── config/            # Environment & DB config
├── modules/           # Feature-based modules
│   └── user/
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── user.routes.ts
│
├── common/
│   ├── middleware/    # Error handling middleware
│   ├── errors/        # Custom error classes
│
├── routes/            # Route aggregator
├── app.ts             # Express app setup
├── server.ts          # Entry point
```

---

## ⚙️ Tech Stack

* **Backend:** Node.js + Express + TypeScript
* **Database:** PostgreSQL
* **ORM:** Prisma (see [Phase 5](#-prisma-orm-migration-phase-5))
* **Containerization:** Docker
* **API Testing:** Postman

---

## 🐳 PostgreSQL Setup using Docker

### 📄 docker-compose.yml

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: postgres-dev
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

### 📄 .env (root folder)

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=riskassessmentdb
```

---

### ▶️ Run PostgreSQL

```bash
docker-compose up -d
```

Verify:

```bash
docker ps
```

---

## 🗄️ Database Schema

> ⚠️ **Superseded by Prisma ORM** — see [Phase 5](#-prisma-orm-migration-phase-5) below. Tables are no longer created manually; they're generated from `prisma/schema.prisma` via migrations. This section is kept for history.

Tables created manually using SQL: for visualization used DBeaver and created table manually using the Dbeaver tool

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  file_path TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analyses (
  id SERIAL PRIMARY KEY,
  document_id INT UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  summary TEXT,
  risk_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 Database Connection (Node.js)

### Install dependencies

```bash
npm install pg
npm install -D @types/pg
```

---

### 📄 src/config/db.ts

```ts
import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  user: env.DB_USER,
  host: "localhost",
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: 5432,
});
```

---

## 🔐 Environment Configuration

### 📄 src/config/env.ts

```ts
import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
};
```

---

## 🧠 Backend Architecture

The backend follows **Clean Architecture (Layered Pattern)**:

```
Controller → Service → Repository → Database
```

### 🔹 Controller

Handles HTTP request/response

### 🔹 Service

Contains business logic

### 🔹 Repository

Handles database queries

---

## 👤 User Module Implementation

### 📄 Repository Layer

```ts
import { pool } from "../../config/db";

export const createUser = async (name: string, email: string, password: string) => {
  const query = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const result = await pool.query(query, [name, email, password]);
  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0];
};
```

---

### 📄 Service Layer

```ts
import * as userRepo from "./user.repository";
import { AppError } from "../../common/errors/AppError";

export const registerUser = async (data: any) => {
  const existing = await userRepo.findUserByEmail(data.email);

  if (existing) {
    throw new AppError("User already exists", 400);
  }

  return userRepo.createUser(data.name, data.email, data.password);
};
```

---

### 📄 Controller Layer

```ts
export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
```

---

## 🌐 API Endpoint

### ➤ Register User

```
POST /api/v1/users/register
```

### 📥 Request Body

```json
{
  "name": "Nitesh",
  "email": "nitesh@test.com",
  "password": "123456"
}
```

---

## ✅ Result

* User successfully inserted into PostgreSQL
* Data persisted in Docker container
* API tested via Postman

---

## 🧱 Key Concepts Learned

* Dockerized database setup
* PostgreSQL schema design
* Raw SQL queries using `pg`
* Clean architecture (Controller → Service → Repository)
* Environment-based configuration

---

## 🚀 Next Steps

* Password hashing (bcrypt)
* JWT authentication
* Login API
* Protected routes

# 🔐 Authentication System (Phase 2)

---

## 📌 Overview

This phase implements **secure authentication** using:

* bcrypt (password hashing)
* JWT (authentication tokens)
* Protected routes (middleware)

---

## 🔑 Features Implemented

* User Registration with hashed password
* User Login with token generation
* JWT-based authentication
* Protected API routes

---

## 📦 Dependencies

```bash
npm install bcrypt jsonwebtoken
```

---

## 🔐 Password Hashing

Passwords are securely hashed using bcrypt before storing in the database.

---

## 🔑 JWT Token

* Token generated on login
* Contains user ID and email
* Expires in 7 days

---

## 🌐 API Endpoints

### ➤ Register

```
POST /api/v1/users/register
```

---

### ➤ Login

```
POST /api/v1/users/login
```

---

### ➤ Get Current User (Protected)

```
GET /api/v1/users/me
```

Header:

```
Authorization: Bearer <token>
```

---

## 🔒 Authentication Flow

1. User registers → password hashed
2. User logs in → receives JWT
3. Token sent in request headers
4. Middleware verifies token
5. Access granted to protected routes

---

## ✅ Result

* Secure authentication system implemented
* Protected routes working
* Tokens validated successfully

---

## 🚀 Next Steps

* File upload system (PDF/DOCX)
* Document processing
* AI integration

---

# 📄 Document Upload & Processing (Phase 3)

---

## 📌 Overview

This phase implements the **document upload and processing system**, which is a core feature of the application.

Users can upload legal documents (PDF), which are:

* Stored on the server
* Saved in the database
* Processed to extract text

---

## 🔑 Features Implemented

* File upload using Multer
* PDF text extraction using pdf-parse
* Document storage in PostgreSQL
* Protected upload route (JWT required)

---

## 📦 Dependencies

```bash
npm install multer pdf-parse

use specific version to properly working: npm install pdf-parse@1.1.1
```

---

## 📁 File Storage

Uploaded files are stored locally:

```
/uploads
```

Each file is renamed with a unique timestamp to avoid conflicts.

---

## 🗄️ Database Integration

When a file is uploaded:

* A record is created in the `documents` table
* Linked to the user via `user_id`

---

## 📄 Text Extraction

PDF files are processed using `pdf-parse` to extract raw text.

This text will be used in future phases for:

* AI summarization
* Clause extraction
* Risk analysis

---

## 🌐 API Endpoint

### ➤ Upload Document (Protected)

```
POST /api/v1/documents/upload
```

### Headers

```
Authorization: Bearer <token>
```

### Body (form-data)

```
file: <PDF file>
```

---

## 🔄 Flow

1. User sends request with file
2. Middleware verifies JWT
3. File stored on server
4. Entry saved in database
5. Text extracted from PDF
6. Response returned with preview

---

## ✅ Result

* File successfully uploaded
* Stored locally
* Metadata saved in DB
* Text extracted successfully

---

## 🚀 Next Steps

* AI Integration (OpenAI)
* Document summarization
* Clause extraction
* Risk detection
---

# 🤖 AI Integration (Phase 4)

---

## 📌 Overview

This phase integrates **OpenAI (LLM)** into the system to analyze legal documents.

The system can now:

* Summarize documents
* Extract important clauses
* Detect risk levels
* Explain risky sections

---

## 🔑 Features Implemented

* OpenAI API integration
* Prompt-based document analysis
* JSON structured AI response
* Analysis stored in database

---

## 📦 Dependencies

```bash
npm install openai
```

---

## 🔐 Environment Setup

```env
OPENAI_API_KEY=your_api_key
```

---

## 🧠 AI Capabilities

The AI performs:

* 📄 Summary (simple English)
* 📌 Clause extraction
* ⚠️ Risk detection (Low / Medium / High)
* 🧾 Risk explanations

---

## 🌐 API Endpoint

### ➤ Run Analysis (Protected)

```
POST /api/v1/analysis/run
```

### Headers

```
Authorization: Bearer <token>
```

### Body

```json
{
  "documentId": 1,
  "filePath": "uploads/file.pdf"
}
```

---

## 🔄 Flow

1. Request sent with document info
2. Text extracted from file
3. Text sent to OpenAI
4. AI processes document
5. Result returned in JSON
6. Data stored in database

---

## ⚠️ Optimization

To reduce API cost:

* Text length limited to 4000 characters
* Efficient prompt design
* Minimal API calls

---

## ✅ Result

* AI successfully analyzes documents
* Summary, clauses, and risks generated
* Results stored in database
---


# ✍️ Direct Text Analysis Support (Enhancement)

---

## 📌 Overview

This enhancement adds support for **analyzing plain text input**, allowing users to paste legal content directly instead of uploading a file.

This is useful for:

* Website Terms & Conditions
* Privacy Policies
* Online agreements
* Any copy-paste legal text

---

## 🔑 Features Added

* Direct text input support
* New API endpoint for text documents
* Unified analysis system (PDF + Text)
* Database support for storing raw content

---

## 🗄️ Database Update

Added new column:

```sql
ALTER TABLE documents ADD COLUMN content TEXT;
```

---

## 🌐 API Endpoints

### ➤ Create Text Document

```
POST /api/v1/documents/text
```

### Body

```json
{
  "content": "Paste your legal text here..."
}
```

---

### ➤ Run Analysis

```
POST /api/v1/analysis/run
```

```json
{
  "documentId": 1
}
```

---

## 🔄 Flow

1. User pastes legal text
2. System stores it in database
3. Analysis API fetches content
4. Text sent to AI
5. Results returned

---

## ✅ Result

* Users can analyze documents without PDFs
* Supports real-world use cases
* Improved usability and flexibility

---

# 🧬 Prisma ORM Migration (Phase 5)

---

## 📌 Overview

A full laptop reset wiped the local Postgres data and the manually-created (DBeaver) schema, which also broke login/register since the `users` table no longer existed. Rather than recreating tables by hand again, the database layer was migrated from raw `pg` queries + manual SQL to **Prisma ORM**, so the entire schema is now reproducible from source via migrations.

---

## 🔑 Features Implemented

* Prisma ORM (v7) with **driver adapters** (`@prisma/adapter-pg`)
* `schema.prisma` defining `User`, `Document`, `Analysis` models, mapped to the existing snake_case columns (`user_id`, `file_path`, `risk_level`, etc.) so no other contract changed
* `prisma migrate dev` workflow replacing manual SQL / DBeaver table creation
* Prisma Client singleton in `src/config/db.ts`
* All three repositories (`user`, `document`, `analysis`) rewritten from raw SQL to Prisma Client calls

---

## ⚠️ Why a driver adapter?

Prisma 7 no longer accepts a `url` directly inside the `datasource` block in `schema.prisma` — that pattern is deprecated in favor of **driver adapters**. `PrismaClient` is now constructed with an adapter that wraps a real `pg.Pool`:

```ts
// src/config/db.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

const adapter = new PrismaPg(env.DATABASE_URL);
export const prisma = new PrismaClient({ adapter });
```

`prisma.config.ts` (project root) separately holds `DATABASE_URL` for the **CLI** (`migrate`, `studio`) — it is not read by the running app.

---

## 📦 Dependencies

```bash
npm install prisma @prisma/client @prisma/adapter-pg
```

`pg` stays installed — the adapter uses it under the hood to open the actual connection.

---

## 📁 Key Files

* `prisma/schema.prisma` — schema source of truth
* `prisma.config.ts` — CLI config (datasource URL for `migrate`/`studio`)
* `prisma/migrations/` — generated SQL migration history (committed to git)
* `src/generated/prisma/` — generated Prisma Client (gitignored, regenerated on install)
* `src/config/db.ts` — Prisma Client singleton

---

## 🧰 New npm Scripts

```bash
npm run prisma:generate   # regenerate client after schema changes
npm run prisma:migrate    # create + apply a new migration (dev)
npm run prisma:deploy     # apply pending migrations (prod / fresh machine)
npm run prisma:studio     # open Prisma Studio GUI
```

`postinstall` also runs `prisma generate` automatically after `npm install`.

---

## 🔄 Fresh-Machine Recovery Flow

This is exactly the scenario that motivated the migration — no more manually recreating tables in DBeaver after a reset:

```bash
docker compose up -d          # start Postgres
npm install                   # installs deps + auto-generates Prisma Client
npx prisma migrate deploy     # recreates every table from migration history
npm run dev                   # server boots, DB connected
```

---

## 🗄️ Schema (Prisma-managed)

```prisma
model User {
  id        Int        @id @default(autoincrement())
  name      String
  email     String     @unique
  password  String
  createdAt DateTime   @default(now()) @map("created_at")
  documents Document[]

  @@map("users")
}

model Document {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  filePath  String?   @map("file_path")
  content   String?
  status    String    @default("pending")
  createdAt DateTime  @default(now()) @map("created_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  analysis  Analysis?

  @@map("documents")
}

model Analysis {
  id         Int      @id @default(autoincrement())
  documentId Int      @unique @map("document_id")
  summary    String
  riskLevel  String   @map("risk_level")
  createdAt  DateTime @default(now()) @map("created_at")

  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("analyses")
}
```

---

## ✅ Result

* Registration, login, and JWT-protected `/me` verified working end-to-end against the Prisma-backed DB
* Two pre-existing TypeScript errors fixed (JWT payload vs. `Express.User` typing, Google OAuth `done()` callback shape) that were silently blocking `ts-node` from booting at all
* Schema is now reproducible via `prisma migrate deploy` instead of manual DBeaver SQL

---

## 🚀 Next Steps

* Add a `prisma db seed` script for local dev fixtures
* Revisit connection pooling (e.g. Prisma Accelerate or pgbouncer) before production deploy
* Continue wiring future schema changes (new fields, tables) through `prisma migrate dev` instead of manual SQL

---

# 🐛 Analysis Pipeline Bug Fixes (Phase 6)

---

## 📌 Overview

After the Prisma migration, the frontend's paste-text upload was returning a generic **500 Internal Server Error**, and clicking a document to view/re-view its analysis also failed. Root cause: several validation failures were thrown as plain `Error` objects instead of `AppError`, so `error.middleware.ts`'s `instanceof AppError` check always fell through to the opaque 500 fallback — masking what were actually simple 400/401/404 cases. There was also a real data-layer bug and a security gap found while fixing this.

---

## 🔑 Fixes

* **`document.service.ts` / `document.controller.ts`** — "text too short", "user not authenticated", and "no file uploaded" now throw `AppError` with the correct status code (400/401) instead of a generic `Error`, so the client gets a real message instead of "Internal Server Error".
* **`analysis.controller.ts`** — "document not found" and "no valid content" now throw `AppError` (404/400). Also validates `documentId` is present in the request body (400 if missing).
* **🔒 IDOR fix:** `runAnalysis` had no ownership check — any authenticated user could pass an arbitrary `documentId` and read back **any other user's** analyzed document. Added `if (doc.userId !== req.user?.id) throw new AppError(..., 403)`.
* **Re-analysis bug:** `Analysis.documentId` is `@unique` in the schema (one analysis per document), but `createAnalysis` always called `prisma.analysis.create()`. Re-running analysis on an already-analyzed document (e.g. clicking it again in the UI) threw a Prisma unique-constraint violation, surfaced as a 500. Fixed by switching to `prisma.analysis.upsert()` in `analysis.repository.ts`.
* **`error.middleware.ts`** now `console.error`s any non-`AppError` before returning the generic 500, so unexpected failures are actually visible in server logs going forward instead of silently swallowed.

---

## ✅ Result

Verified end-to-end (both via `curl` and a real browser session):

* Paste-text upload → 400 with a real message for text under 50 chars; successful create + analysis for valid text
* PDF file upload → text extraction → analysis, verified with a sample PDF
* Re-running analysis on the same document (clicking it again in the doc list) → 200, updates the existing analysis row instead of erroring
* Cross-user document access → 403, confirmed with a second test account
* No console errors in the browser during the full paste → analyze → result-display flow

---

# 🧠 Real User Profile, Analysis Caching & Structured Data (Phase 7)

---

## 📌 Overview

Two product gaps surfaced from real usage: the logged-in name always showed "User" (the `/me` endpoint only echoed the JWT payload, which never carried a name), and every click on an already-analyzed document silently re-ran the full OpenAI pipeline — burning tokens for identical output. This phase fixes both, and upgrades what gets stored per analysis so the data is actually useful to a real user (not just a summary + one-word risk level).

---

## 🔑 Fixes & Features

* **`GET /api/v1/users/me`** now fetches the real user row from the DB (`user.repository.ts::findUserById`, `user.service.ts::getCurrentUser`) instead of echoing the decoded JWT — returns `{ id, name, email, createdAt }` with the password stripped.
* **Analysis caching**: `getDocumentById` (`analysis.repository.ts`) now `include`s the related `Analysis`. `runAnalysis` (`analysis.controller.ts`) checks for an existing analysis first and returns it directly (`cached: true`) — OpenAI is only called on a genuine first run. Verified: repeat calls drop from ~7s to ~0.1s, same analysis row returned.
* **Document status tracking**: `documents.status` (previously stuck on `"pending"` forever) now transitions to `"completed"` after a successful analysis or `"failed"` on an AI error, via new `document.repository.ts::markDocumentAnalyzed` / `markDocumentFailed`.
* **Structured, richer analysis data** — schema additions (`prisma/schema.prisma`, migration `add_document_classification_and_structured_risk_items`):
  * `Document.title` / `Document.documentType` — AI-generated title and a classified category (Rental Agreement / Employment Contract / NDA / Loan Agreement / Privacy Policy / Terms of Service / Business Contract / Other).
  * `Analysis.clauses` (`String[]`) — the "Important Clauses" list, previously returned by the AI and silently dropped.
  * `Analysis.riskItems` (`Json`) — each risky clause as a structured object: `{ clause, severity, category, explanation }`, instead of a flat text list.
  * `Analysis.riskScore` (`Int`) — a 0–100 score derived **server-side, deterministically** from `riskLevel` (Low=30/Medium=60/High=90) — no extra AI call/cost.
* **`analysis.service.ts`** prompt extended to request `title`, `documentType`, and structured `riskItems` in one OpenAI call (no added latency/cost vs. before), with response normalization/validation so a malformed or drifted AI response can't crash the DB write or the UI.
* **API shape simplified**: `POST /analysis/run` now returns `{ analysis, cached }` — the `Analysis` row itself carries everything (summary, riskLevel, riskScore, clauses, riskItems), so the previously-duplicated `ai` object in the response was dropped.

---

## ✅ Result

* `/me` returns the real name; verified it now persists across page refresh and both login methods (Phase 4 in `client/README.md`)
* Second+ analysis run on the same document: `cached: true`, ~0.1s response, identical analysis `id` — confirmed via `curl` timing
* A real test document (rental agreement) came back `riskLevel: "High"`, `riskScore: 90`, 3 structured `riskItems` each with severity/category/explanation, and `documentType: "Rental Agreement"` with an AI-generated title
* Document list now shows the real title/type instead of "Text Document" as soon as analysis completes, without a manual page reload

---

# ⚖️ Legal Assistant Chat Agent + RAG Foundation (Phase 8)

---

## 📌 Overview

New second feature alongside document analysis: an interactive Indian-law "specialist" chat agent — clarifying-question UX, English/Hindi, document-aware, backed by a Firecrawl-fed RAG pipeline for recent case law. This phase is backend-only (Phase 1 of a 4-phase plan: backend → chat UI → voice → polish); no frontend yet.

---

## 🔑 What was built

* **New Prisma models** (migration `add_legal_agent_and_rag`): `Conversation`, `Message` (role/content/kind, with `clarifyOptions`/`citations`/`audioUrl` for future phases), `ConversationDocument` (links an existing `Document` into a conversation for context), `LegalKnowledgeChunk` — the RAG store, with an `embedding` column typed `Unsupported("vector(1536)")` since Prisma has no native vector type.
* **pgvector infra**: `docker-compose.yml`'s Postgres image switched from `postgres:17-alpine` to `pgvector/pgvector:pg17` (same Postgres 17, adds the extension). Migration manually augmented with `CREATE EXTENSION IF NOT EXISTS vector;` before the table create, plus an `hnsw (embedding vector_cosine_ops)` index for fast cosine-similarity search. All reads/writes to `embedding` go through `prisma.$executeRaw`/`$queryRaw` (`rag.repository.ts`) since Prisma Client can't type-check an `Unsupported` column — verified end-to-end with a manual embed→store→retrieve round trip (cosine distance ranked correctly).
* **`modules/rag/`** — `rag.service.ts` (`embedText` via OpenAI `text-embedding-3-small`, `retrieveRelevantChunks` via cosine-distance search), `rag.chunk.ts` (paragraph-aware chunking, ~2800 chars with overlap), `rag.ingest.ts` (Firecrawl `scrape()` → chunk → embed → upsert, deduped by a `content_hash` unique constraint so re-crawling unchanged pages is a no-op), `rag.controller.ts`/`rag.routes.ts` (`POST /rag/ingest`, `GET /rag/status`). No admin/role system exists yet, so ingestion is gated by a shared-secret header (`x-ingest-secret` against `env.RAG_INGEST_SECRET`) rather than building full RBAC for one endpoint.
* **`modules/legal-agent/`** — `legal-agent.prompt.ts` bakes in a static IPC↔BNS/CrPC↔BNSS offence-mapping table and the anticipatory-bail procedure directly into the system prompt (India's 2024 criminal-law recodification means models often blend old/new section numbers — this pins the common ones as ground truth rather than trusting parametric memory or RAG freshness alone). `legal-agent.service.ts::decideNextStep` follows the exact `analysis.service.ts` convention (`response_format: json_object`, allowlist-validate the parsed shape, never trust raw model output) and returns either `{ type: "clarify", question, options }` or `{ type: "answer", content, citations }`. The disclaimer ("not legal advice, consult a licensed advocate") is appended **server-side unconditionally** to every answer, not left to model discretion — same defense-in-depth approach as the deterministic `riskScore`.
* **Document-aware chat**: `sendMessageHandler` pulls any `ConversationDocument`-linked documents, extracts their text (reusing `extractTextFromPDF`), and injects it into the prompt as primary context — the agent is instructed to ask about gaps the document doesn't cover rather than generic questions it already answers.
* **New env vars**: `FIRECRAWL_API_KEY`, `RAG_INGEST_SECRET` (both placeholders in `.env` — need real values before ingestion/production use).
* **New dependency**: `@mendable/firecrawl-js`.

---

## ✅ Result (verified via `curl` against a running dev server + a throwaway test user, both cleaned up after)

* `POST /legal-agent/conversations` → `POST /legal-agent/conversations/:id/messages` round trip works for both response types:
  * Ambiguous prompt ("I want to file a case against someone") → `type: "clarify"` with 4 well-formed, relevant options.
  * Specific prompt ("someone hacked my bank account") → `type: "answer"` with concrete IT Act-referenced steps and the disclaimer appended.
  * The exact "false case from a jealous relative, scared of arrest" scenario → correctly walks through the seeded anticipatory-bail procedure (Sessions/High Court application, interim protection, conditions, malicious-prosecution follow-up).
* `GET /legal-agent/conversations` and `GET /legal-agent/conversations/:id` return the list/detail correctly, with an auto-generated title (first 60 chars of the first message — no extra AI call, kept cheap).
* pgvector round trip (`embedAndStoreChunk` → `retrieveRelevantChunks`) verified directly: a stored chunk about anticipatory bail was correctly retrieved (lowest cosine distance) for a semantically related query.
* **Not yet verified**: real Firecrawl ingestion against Indian Kanoon — `FIRECRAWL_API_KEY` is still a placeholder in `.env`; needs a real key before `POST /rag/ingest` can be run for real.

---

## ⏭️ Next (Phases 2–4, not built yet)

Chat UI (new page, conversation list, clarify-chip rendering, EN/HI toggle, document attach), voice (OpenAI Whisper STT + TTS), then polish (streaming responses, citations UI, scheduled ingestion). See the approved plan for full detail.

---

# 🔍 RAG Seed-Content Fix + Voice (Phase 9)

---

## 📌 Overview

Two things: (1) a real content-quality bug found while verifying Firecrawl with the user's real API key — the Phase 8 default seed URL only ever ingested navigation noise, not case law — fixed by switching to search-based ingestion; and (2) Phase 3 of the legal-agent plan, voice: mic input via Whisper STT and TTS playback of assistant replies.

---

## 🔑 RAG fix

* **Root cause**: `DEFAULT_SEED_URLS` (Phase 8) pointed `crawlAndIngest` at `indiankanoon.org/browse/supremecourt/` — a year-index page. Scraped chunks were literally a table of years and case counts, zero substantive legal content. Confirmed by inspecting stored `content` directly via `psql` — this was **not** a Firecrawl failure, Firecrawl scraped exactly what was asked; the seed URL choice was the bug.
* **Fix** (`rag.ingest.ts`): replaced the static-URL default with `searchAndIngest(query)` / `ingestFromQueries(queries)`, using `firecrawl.search(query, { includeDomains: ["indiankanoon.org"], scrapeOptions: { formats: ["markdown"] } })` to find and scrape real judgment pages. `crawlAndIngest(urls)` is kept for when specific URLs are already known. `rag.controller.ts::runIngest` now accepts `{ urls }` (explicit scrape) or `{ queries }` (search), defaulting to `DEFAULT_SEED_QUERIES` — four queries covering anticipatory bail, cybercrime/bank fraud, dowry, and malicious prosecution, matching the domains the legal-agent system prompt covers.
* **Verified with the user's real `FIRECRAWL_API_KEY`**: search-based ingestion pulled 8 real, correctly-titled Supreme Court/High Court judgments (e.g. *Sushila Aggarwal vs State (NCT of Delhi), 2020* — the actual landmark anticipatory-bail Constitution Bench ruling), 139 chunks from that one judgment alone. Confirmed the chunk is later retrieved and cited **live in an actual chat answer** (not just the isolated retrieval test) — a real "What is anticipatory bail?" question returned an answer citing that exact judgment.
* **Gotcha hit twice this session**: `nodemon` watches the whole server directory (`watching path(s): *.*`), so creating/editing *any* server file — including a throwaway scratch script — restarts the dev process mid-request and kills any in-flight `curl`/ingestion call (`ECONNREFUSED`/connection-reset). Sequence file edits and long-running test requests so they don't overlap; don't touch server files while an ingestion batch is running.

## 🔑 Voice (Phase 3 of the legal-agent plan)

* **`modules/speech/speech.service.ts`**: `transcribeAudio(filePath, language?)` via OpenAI `whisper-1`; `synthesizeSpeech(text)` via OpenAI `tts-1` (voice `alloy`), returns a `Buffer`.
* **`legal-agent.controller.ts` refactored**: the clarify/answer/document-context/title logic that `sendMessageHandler` had inline was extracted into a shared `processUserMessage(conversation, content, extra)` helper, now used by both `sendMessageHandler` (text) and the new `sendVoiceMessageHandler` (audio) — avoids duplicating the whole pipeline for two input modes that differ only in how `content` was obtained.
* **`POST /legal-agent/conversations/:id/voice-messages`**: multipart audio upload (reuses the existing `multer` config) → `transcribeAudio` → same clarify/answer pipeline as text, persisting the user message with `kind: "voice"` and `audioUrl` pointing at the uploaded recording. Response includes both the transcribed `userMessage` and the assistant `message`, since the client doesn't know the transcript until the server produces it.
* **`GET /legal-agent/messages/:messageId/audio`**: on-demand TTS for any message — synthesizes once, caches to `uploads/audio/message-{id}.mp3`, and serves the cached file on repeat requests (checked via `fs.existsSync` before re-synthesizing) so replay is free.
* **`legal-agent.repository.ts`**: added `getMessageById`, `setMessageAudioUrl`; `appendMessage`'s data type gained an optional `audioUrl`.
* **`server/.gitignore`**: added `/uploads` — Phase 3 substantially increases what lands there (voice recordings + synthesized TTS clips) and the directory wasn't ignored before (some previously-uploaded PDFs are already tracked in git from before this session; not untracked automatically by this change — flagged for the user to decide on separately, not addressed here).

---

## ✅ Result

* **TTS→STT round trip** (`synthesizeSpeech` then `transcribeAudio` on the output, via a throwaway script): input `"Someone hacked my bank account and stole fifteen thousand rupees, what should I do?"` → transcribed back as `"Someone hacked my bank account and stole 15,000 rupees. What should I do?"` — correct content, only cosmetic number/punctuation normalization. Confirms both directions of the OpenAI audio integration work correctly with real speech.
* **Browser-driven voice flow** (Playwright + Chromium's `--use-fake-device-for-media-stream`, since headless Chromium has no real mic): clicking the mic button shows a live recording indicator (pulsing dot + timer), stopping it uploads and round-trips through transcription → agent response → both messages rendered in the chat (user bubble tagged "Voice message", assistant clarify response with chips) — zero console errors, zero failed network requests. TTS playback ("Listen" button) correctly enters a loading state while synthesizing before playing.

---

# 📄 In-Conversation Document Viewer (Phase 10)

---

## 📌 Overview

Documents attached to a legal-agent conversation could only be inferred existed (a toast on attach, referenced implicitly by the AI) — there was no way to actually look at what was attached. Added a proper viewer.

---

## 🔑 What was built

* **`document.repository.ts`**: added `getDocumentById`.
* **`document.controller.ts` / `document.routes.ts`**: two new ownership-checked endpoints — `GET /documents/:id` (metadata + content: pasted text as-is, or on-demand `extractTextFromPDF` for file uploads, mirroring how `analysis.controller.ts` re-reads a document) and `GET /documents/:id/file` (streams the raw file with a correct `Content-Type` derived from extension — `application/pdf` etc. — and `Content-Disposition: inline` so browsers render it instead of downloading).
* **`legal-agent.repository.ts`**: `getConversationWithMessages` now also includes `documents: { include: { document: true } }`, so a conversation's attached documents ride along with the normal conversation fetch — no extra endpoint needed for the client to know what's attached. `linkDocumentToConversation` (the attach upsert) now also includes the nested `document` so the attach response can update client state immediately without a refetch.

---

## ✅ Result (verified via curl + a byte-level check, plus the browser-driven test logged in `client/README.md`)

* `GET /documents/:id/file` for a real uploaded PDF returned `Content-Type: application/pdf`, `Content-Disposition: inline`, and a byte-for-byte identical file (1,016,315 bytes, correct `%PDF-1.4` header) — confirms the stream is correct even though a headless-Chromium screenshot of the resulting `<iframe>` showed blank (a known headless-mode PDF-plugin limitation, not a data bug — a real browser renders it via its native PDF viewer).
* Pasted-text documents render their content directly and correctly in the viewer modal.

---

# 🛡️ Rate Limiting, Citation Dedup & Scheduled Ingestion (Phase 11 — Phase 4 of the legal-agent plan, part 1)

---

## 📌 Overview

First three of four "polish" items from the approved plan (deadline pressure turned out to be much lower than first assumed — 40+ days, not ~18 — so these are being done properly in tracked phases rather than rushed). Streaming responses (the fourth, and by far the largest) is deliberately being done last/separately since it's a real architecture change, not a small addition.

---

## 🔑 What was built

### Rate limiting

* New `common/middleware/rateLimit.middleware.ts` using `express-rate-limit`: `aiRateLimiter` (30 requests / 15 min) on the endpoints that actually cost OpenAI/Firecrawl money — `POST /legal-agent/conversations/:id/messages`, `.../voice-messages`, `POST /rag/ingest`, `POST /analysis/run`; `standardRateLimiter` (100/15min) on cheaper-but-real-cost endpoints — TTS playback (`GET /legal-agent/messages/:messageId/audio`, cached after first synthesis anyway), document upload/paste-text.
* Keyed by **authenticated user id**, not IP — every guarded endpoint sits behind `authMiddleware` already, and IP-keying would either let one user bypass the limit by switching networks or unfairly throttle multiple users behind the same NAT.
* **Real bug hit and fixed**: `express-rate-limit` v8's built-in validation throws `ERR_ERL_KEY_GEN_IPV6` if a custom `keyGenerator`'s IP fallback uses raw `req.ip` directly — local dev's `::1` (IPv6 loopback) isn't normalized and trips their safety check (meant to stop IPv6-representation bypass attacks). Fixed by wrapping the fallback in their own `ipKeyGenerator()` helper instead of using `req.ip` raw. Caught immediately on first real request, not left silently broken.

### Citation dedup + cap

* `legal-agent.service.ts::decideNextStep` — the model occasionally cited the same URL twice; citations are now deduped by URL and capped at 5 server-side before ever reaching the DB or client.

### Scheduled RAG ingestion

* New `modules/rag/rag.scheduler.ts` using `node-cron` (ships its own TS types as of v4, no separate `@types` package needed) — runs `ingestFromQueries()` daily at 03:00 server time, logging ok/failed counts; a failed run is caught and logged, never crashes the process, and the next scheduled tick just tries again. `POST /rag/ingest` still works for on-demand runs. Started once from `server.ts` on `app.listen`'s callback.

---

## ✅ Result

* Verified end-to-end via `curl`: after the IPv6 fix, a real chat message round-trips cleanly through the rate limiter with no error; response citations came back deduped (1 unique source instead of a potential repeat).
* Scheduler confirmed registering correctly on server startup (`[rag-scheduler] Scheduled RAG ingestion (cron: "0 3 * * *")` in logs); actual 3am fire not observed live (by design — didn't wait until 3am to check), but the cron expression and error handling were reviewed directly.

---

# ⚡ Streaming Responses (Phase 12 — Phase 4 of the legal-agent plan, part 2 — final item)

---

## 📌 Overview

The last and largest Phase 4 item: the text-chat message endpoint now streams the assistant's answer token-by-token instead of making the client wait for one large non-streaming JSON response. Deliberately scoped to text messages only — voice messages already block on a transcription round trip before generation can start, so streaming their answer separately was judged not worth the added complexity for this pass (documented as a clear follow-up if wanted later).

---

## 🔑 Why a two-call design, not one

OpenAI's `response_format: json_object` (used everywhere else in this codebase to get the clarify/answer discriminator + citations reliably) can't be streamed usefully — partial JSON tokens aren't valid JSON until the whole object is done, so there's nothing to progressively render. Streaming requires knowing you're going to *answer* (not ask a clarifying question) before any tokens are sent, since you can't retroactively switch to a clarify question after prose has already started reaching the client.

Solution: split into two model calls for the streaming path only —
1. **`routeMessage()`** (`legal-agent.prompt.ts::buildRoutingPrompt`) — the same fast, non-streaming JSON-mode call as before, but instructed to decide `clarify` vs `answer` **and pick relevant citations**, without writing the answer content itself.
2. **`streamAnswer()`** (`legal-agent.prompt.ts::buildStreamingAnswerPrompt`) — only called when routing decided "answer"; a plain-text (no JSON mode) streaming completion (`stream: true`) that generates the actual prose, yielded as an async generator of text deltas.

This costs one extra small model call per answer turn, but keeps citation selection informed and precise (the model still picks *which* retrieved sources it's actually using, rather than the app blindly attaching every RAG chunk that was retrieved regardless of relevance) while still delivering real, progressive token-by-token rendering.

`decideNextStep()` (the original single-call, non-streaming function) is kept unchanged and still used by the voice-message path — `legal-agent.prompt.ts::buildSystemPrompt` (JSON mode, full clarify-or-answer-with-content) is untouched.

---

## 🔑 What was built

* **`legal-agent.prompt.ts`** — persona/knowledge block factored out into a shared `PERSONA_AND_KNOWLEDGE()` builder reused by all three prompt variants; new `buildRoutingPrompt()` and `buildStreamingAnswerPrompt()` alongside the existing `buildSystemPrompt()`.
* **`legal-agent.service.ts`** — new `routeMessage()`, `streamAnswer()` (an `async function*` yielding string deltas), `getRagContext()` (RAG lookup factored out for reuse by both the controller and `decideNextStep`), `appendDisclaimer()` (disclaimer-appending factored out so both the streaming and non-streaming paths share the exact same server-side-enforced disclaimer logic), `dedupeCitations()`.
* **`legal-agent.controller.ts::sendMessageHandler`** rewritten as an SSE endpoint: sets `Content-Type: text/event-stream`, writes `data: {...}\n\n` frames — `{type:"user_message"}` immediately (the persisted user message, replacing the client's optimistic one), then either a single `{type:"done"}` frame (clarify path) or a stream of `{type:"delta", text}` frames followed by `{type:"done"}` (answer path, disclaimer appended once streaming finishes and the full message is persisted). A `streaming` flag tracks whether headers have already been sent, so a failure mid-stream sends a `{type:"error"}` frame and closes gracefully instead of calling `next(err)` into a response that's already started (which would crash).
* **`legal-agent.controller.ts`** also gained a `buildDocumentContext()` extraction (shared by the streaming and voice paths) and — found while regression-testing this change — a real bug fix: `sendVoiceMessageHandler` now wraps the Whisper `transcribeAudio()` call in try/catch, converting an unwrapped OpenAI `APIError` (e.g. "Invalid file format" for corrupt/unsupported audio) into a clean `AppError(400, ...)` instead of an opaque 500 — same discipline as the rest of this codebase (Phase 6 fixed the same bug class for document analysis).
* **`legal-agent.repository.ts`** — `appendMessage`'s `citations` param retyped from `Prisma.InputJsonValue` to a plain `{title,url}[]` after hitting a real TS structural-typing quirk (a named `Citation` interface without an index signature doesn't satisfy `Prisma.InputJsonObject`'s index-signature requirement the way an inline object-literal type happened to).

---

## ✅ Result

* Verified via `curl --no-buffer`: a real answer-worthy question produced genuine `data: {"type":"delta","text":"..."}` frames arriving one OpenAI token-chunk at a time (confirmed visually — dozens of small deltas like `"Ant"`, `"icip"`, `"atory"`, `" bail"`), followed by a final `{"type":"done", message: {...}}` carrying the persisted, disclaimer-appended, citation-attached message row.
* Clarify path verified through the same endpoint: single `user_message` + `done` frame pair, correct chip options, no unnecessary streaming overhead for a response that's fast anyway.
* Regression-tested the voice-message and document-attach paths after the shared-code refactor (`buildDocumentContext`) — both still work correctly; the only issue surfaced was the pre-existing unwrapped-Whisper-error gap above, now fixed.

---

# 🎙️ Live Voice Editing + ALDRA AI Identity (Phase 13)

---

## 📌 Overview

Two changes: (1) a standalone transcription endpoint to support a redesigned mic UX where speech becomes editable draft text instead of an instantly-sent message (see `client/README.md` Phase 7 for the full UX rationale — live captions while speaking, edit by typing or by speaking more, explicit send); (2) the agent now identifies itself as "ALDRA AI" when asked who it is.

---

## 🔑 What was built

* **New `modules/speech/speech.controller.ts` + `speech.routes.ts`**: `POST /speech/transcribe` — auth + `aiRateLimiter`-protected, accepts a multipart audio file (+ optional `language`), returns `{ transcript }` only. Deliberately does **not** touch any conversation or call the agent — unlike `/legal-agent/conversations/:id/voice-messages` (which still exists, unused by the current UI but left in place), this is a pure transcription utility the client uses as a fallback when the browser has no live Web Speech API support (primarily Firefox). Reuses the existing `transcribeAudio()` service function and the same try/catch → `AppError(400, ...)` wrapping added in Phase 12 for corrupt/unsupported audio.
* **`legal-agent.prompt.ts::PERSONA_AND_KNOWLEDGE`** — now opens with "You are ALDRA AI, an AI legal information assistant..." and an explicit instruction to answer identity questions ("who are you", "what can you do") as ALDRA AI rather than a generic name. Since this shared block feeds all three prompt variants (`buildSystemPrompt`, `buildRoutingPrompt`, `buildStreamingAnswerPrompt`), the identity is consistent across the voice, streaming-answer, and clarify-routing paths without needing three separate edits.

---

## ✅ Result

* Verified via Playwright: asking "Who are you and how can you help me?" produced "I am ALDRA AI, an AI legal information assistant specializing in Indian law..." followed by the same capability description as before — name changed, substance preserved, exactly as requested.
* `/speech/transcribe` verified as part of the client-side fallback flow (see client README) — correctly returns transcript text without creating any conversation activity.

---

# ⚖️ Rebrand: ALDRA AI → NyayMitra AI (Phase 14)

---

## 📌 Overview

Same-day follow-up: the user decided on a single app-wide brand name, **NyayMitra AI**, superseding the "ALDRA AI" identity set in Phase 13 (which itself only lived for one turn). Full rationale and the matching frontend rebrand + login/register redesign are in `client/README.md` Phase 8.

---

## 🔑 What was built

* **`legal-agent.prompt.ts::PERSONA_AND_KNOWLEDGE`** — the "You are ALDRA AI..." identity line updated to "You are NyayMitra AI...", same instruction to self-identify by name when asked, same shared block feeding all three prompt variants (voice, streaming-answer, clarify-routing).

---

## ✅ Result

Verified directly via a real streamed `curl` request (fresh test user, real conversation, real OpenAI call) — "Who are you?" now answers "I am NyayMitra AI, an AI legal information assistant specialized in Indian law..." with the capability description unchanged.

---

# 📱 Mobile OTP Login + Google OAuth Hardening (Phase 15)

---

## 📌 Overview

Two things: (1) the Login page's "Mobile OTP" tab was a pure UI stub (see `client/README.md` Phase 8) — this phase makes it real, with send/verify OTP endpoints backed by MSG91. (2) Google OAuth already worked end-to-end and already supports any number of distinct Google accounts (find-or-create by email), but had two hardcoded `localhost` URLs that would break outside local dev — fixed via new env vars.

---

## 🔑 Mobile OTP

* **Schema** (`prisma/schema.prisma`): `User.email` made nullable (a phone-only signup has no email), `User.phone` added as nullable + unique. New `OtpVerification` model (`phone, codeHash, expiresAt, attempts, consumed, lastSentAt`) — no FK to `User`, since a phone may not have an account yet at send-time. Applied via `prisma db push` (dev DB).
* **New `modules/otp/`** (repository/service/controller/routes, same layering as `modules/user/`):
  * `sendOtp(phone)` — enforces a 30s resend cooldown, generates a 6-digit code (`crypto.randomInt`), `bcrypt`-hashes it before storing (same pattern as password hashing — the plaintext code is never persisted), 5-minute expiry, then calls `sendOtpSms`.
  * `verifyOtp(phone, code)` — rejects expired/missing/already-consumed OTPs and caps at 5 wrong attempts (`429` after that); on match, finds-or-creates the user by phone (same pattern as the Google flow's find-or-create-by-email, placeholder password `"OTP_AUTH_USER"`) and issues a JWT via the existing `generateToken` — identical shape to email/Google tokens, so `auth.middleware.ts` needed zero changes.
  * `otp.sms.ts` — isolated `sendOtpSms(phone, code)` calling MSG91's Flow API via native `fetch`. Falls back to `console.log("[DEV OTP] ...")` when `MSG91_AUTH_KEY`/`MSG91_TEMPLATE_ID` aren't set, so the flow is testable before an MSG91 account/DLT-approved template exists.
  * Routes: `POST /api/v1/auth/otp/send`, `POST /api/v1/auth/otp/verify`.
* **Register phone fix**: `user.repository.ts::createUser` changed from positional args to an object (`{name, email?, phone?, password}`) — needed for phone-only OTP signups and now also actually persists the phone field the Register form already collected but silently dropped.
* **New env vars**: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (not yet set — dev console-log fallback active until the user has an MSG91 account + DLT-approved SMS template).
* **Real pre-existing bug fixed while wiring the new phone-duplicate check**: `user.controller.ts::register` caught every error and always returned a generic `500 "Error registering user"`, discarding the real `AppError` status/message — the same bug class Phase 6 fixed for the document/analysis controllers, just missed here. Duplicate-email registration was already silently affected; the new duplicate-phone check would have been invisible too. Fixed by delegating to `next(err)` like `login` already does, so `error.middleware.ts` returns the real message/status.

## 🔑 Google OAuth hardening

* New env vars `CLIENT_URL` (default `http://localhost:5173`) and `SERVER_URL` (default `http://localhost:3000`).
* `auth.google.ts`'s `callbackURL` and `auth.routes.ts`'s post-login redirect now build from `env.SERVER_URL`/`env.CLIENT_URL` instead of hardcoded strings; `app.ts`'s CORS `origin` list now uses the same two vars.
* No change to the find-or-create-by-email logic itself — it already correctly handles any number of distinct Google accounts. **Not verified live** (would need a real Google consent screen); only confirmed the passport strategy still loads correctly at server boot with the env-based `callbackURL`.

---

## ✅ Result (verified via `curl` + direct `psql` inspection against the real dev DB, all test rows cleaned up after)

* `POST /auth/otp/send` → `POST /auth/otp/verify` round-tripped correctly: new `users` row created with the phone and `OTP_AUTH_USER` placeholder password, returned JWT accepted by `GET /users/me` (confirms parity with email/Google tokens).
* Re-using an already-consumed/superseded code → `401 "Invalid OTP"`; requesting a second OTP inside the cooldown window → `429 "Please wait before requesting another OTP"`; 5 wrong verify attempts then a 6th → `429 "Too many attempts, please request a new OTP"` on the 6th, confirming the attempt cap holds at exactly 5 tries.
* `POST /users/register` with a phone persists it (confirmed via `psql`); registering a second account with the same phone or same email now correctly returns `400` with the real message (`"Phone number already registered"` / `"User already exists"`) after the controller fix above — before the fix both cases returned an opaque `500`.
* `npx tsc --noEmit` passes clean on the server after all changes.

---

# 🗂️ Risk Verdict on the Documents List (Phase 16)

---

## 📌 Overview

The redesigned Documents grid (see `client/README.md` Phase 12) shows a High/Medium/Low chip on every card, but `GET /documents/get-documents` returned only the `documents` rows, so the client had no risk level to show without one analysis request per card.

---

## 🔑 What changed

* `document.repository.ts::getUserDocuments` now `include`s the related `analysis`, selecting **only** `riskLevel` and `riskScore` — not the full summary/clauses/risk items — so the list payload stays small. Documents without an analysis return `analysis: null`, which the client renders as "Not analyzed yet".

---

## ✅ Result

* `npx tsc --noEmit` clean; verified end to end through the UI: four seeded documents returned High / Low / Medium / null and rendered as the matching chips.

---

# 🗑️ Document & Chat Management Endpoints (Phase 17)

---

## 📌 Overview

Documents and conversations could only be created. The new Dashboard/Documents/Legal Assistant UI (see `client/README.md` Phase 14) needs rename, delete, and favorite.

---

## 🔑 What changed

* **Schema**: `Document.isFavorite Boolean @default(false)` (`is_favorite`). Migration `20260919120000_add_document_favorite` was applied by running its SQL directly against the dev DB, then `prisma migrate resolve --applied` + `prisma generate` (non-interactive `migrate dev` is blocked here, same as the phone/OTP migration).
* **`PATCH /documents/:id`** `{ title?, isFavorite? }` — title trimmed, 1–120 chars; isFavorite must be a boolean; at least one field. **`DELETE /documents/:id`** — removes the row (Analysis and conversation links cascade) **and the uploaded file**, via new `common/utils/files.ts::removeUploadedFile`: best-effort, never throws, and only ever unlinks paths inside `uploads/`. The file goes *after* the row, so a failed DB delete can't orphan a live document. Both use the existing ownership pattern (404 → 403) plus `standardRateLimiter`, and reject non-numeric ids with 400 (the older handlers don't).
* **`PATCH /legal-agent/conversations/:id`** now takes `title` and/or `language` (`language` used to be mandatory). A **rename keeps `updatedAt`** — the `@updatedAt` column would otherwise bump the chat to the top of the list. **`DELETE /legal-agent/conversations/:id`** cascades messages and document links. Ownership for both uses a new lightweight `getConversationOwner` (selects `userId`/`updatedAt` only; the existing `getOwnedConversation` loads every message).
* `GET /documents/get-documents` no longer returns each document's full `content` (`omit`) — the Dashboard and Documents pages fetch it on every visit and nothing in the list displays text. `GET /legal-agent/conversations` now includes `_count.messages`.
* `markDocumentAnalyzed` no longer overwrites an existing `title`: documents start untitled, so a title present at first analysis was set by the user (renamed before analysis).

---

## ✅ Result (curl against the running server with two throwaway users)

* Documents: trimmed rename `200`; empty / 121-char title, non-boolean `isFavorite`, empty body, non-numeric id → `400`; other user's document `403`; unknown id `404`; delete removed the file from `uploads/` and the analysis row, and a second delete returns `404`. The list carried `isFavorite` and the analysis chip data with no `content` field.
* Chats: rename `200` and list order unchanged; language still works; bad language / empty title / empty body `400`; other user `403`; unknown `404`; delete cascaded the messages.
* Known gaps left alone: voice-reply audio under `uploads/audio/` isn't removed when a chat is deleted (same as before, no cleanup existed), and `attachDocumentHandler` doesn't verify the attached document belongs to the user.

---

# 🧑‍⚖️ Connect Advocate — Phase 0: Roles, Admin & the Advocate Model (Phase 18)

---

## 📌 Overview

First phase of the "Connect Advocate" feature (live consultations with the NyayMitra AI advocate now, real advocates later — see the approved plan). This phase builds the foundation only: an admin role, security hardening, and one profile structure shared by AI and human advocates, managed through an admin API. No consultations/voice yet (later phases).

---

## 🔑 What was built

* **Roles**: `User.role` (`USER | ADMIN`, default `USER`). `requireAdmin` (`common/middleware/admin.middleware.ts`) re-reads the role **from the database on every call** — never from the 7-day JWT — so a demotion is immediate. Admins are promoted at server start from the `ADMIN_EMAILS` env var (comma-separated, additive: removing an email does not demote). `POST /rag/ingest` is now `requireAdmin` instead of the old shared `x-ingest-secret` header.
* **Security hardening** (found while mapping the code): login/register/OTP responses **no longer contain the bcrypt password hash** (`user.mapper.ts::toSafeUser`, applied everywhere a user leaves the API); `authMiddleware` no longer logs the raw `Authorization` header and decoded token on every request; the register controller no longer logs the plaintext password; the Google strategy no longer logs the profile, the user record or the JWT.
* **Advocate model** (`advocates`, `advocate_credentials`, `advocate_ai_configs`; migration `20260920100000_add_roles_and_advocates`, applied by SQL + `migrate resolve` like earlier ones): one profile structure for both kinds — name, slug, photo, headline, bio, languages, practice areas, courts, states covered, experience, status (`DRAFT/ACTIVE/DISABLED`), verification, accepting-consultations, order. Credentials are typed per kind: humans get `ENROLMENT/DEGREE/CERTIFICATION/BAR_MEMBERSHIP`, the AI only `KNOWLEDGE_SOURCE/SCOPE/LAST_VERIFIED` (enforced by the API — the AI can never carry an invented degree or bar number). The AI has a 1:1 `advocate_ai_configs` row: model, voice, temperature, persona notes, max session minutes, retrieval settings, and a `version` that bumps on every edit.
* **Trust rules enforced server-side**: a new advocate is always a DRAFT and not accepting; a **human** can only be verified once an `ENROLMENT` credential has itself been marked verified (i.e. checked against the Bar Council record), can only be ACTIVE/accepting once verified, and the last verified enrolment can't be un-checked, retyped or deleted while the advocate is verified; disabling an advocate switches "accepting" off.
* **API**: `GET /advocates`, `GET /advocates/:slug` (signed-in users, ACTIVE only, never the model/prompt/config); admin-only `/admin/advocates` (list/create/get/patch/delete), `/:id/credentials` (add/patch/delete), `PUT /:id/ai-config`, `POST|DELETE /:id/photo`. AI config is validated against an allowlist (`gpt-realtime`, `gpt-realtime-mini`; ten Realtime voices; temperature 0.6–1.2 — the Realtime API's own limit; 5–60 min sessions), so a typo can't break every consultation. The safety/citation core prompt is code-owned (later phase) — the admin-editable `personaPrompt` is only a style layer on top.
* **Photos**: `uploads/advocates/` is the only directory served statically (the rest of `uploads/` — client documents, voice recordings — never is). Upload accepts JPEG/PNG/WebP ≤ 2 MB with a random server-chosen filename, **verifies the file's magic bytes** (multer only trusts the client's declared type), removes rejected files, and replaces/deletes the old photo file.
* **Startup seeding**: `ensureDefaultAiAdvocate()` creates "NyayMitra AI Advocate" once (idempotent), described honestly ("an AI advocate, not a human lawyer… cannot appear in court") with no credentials until knowledge sources are actually ingested.

---

## ✅ Result (curl-style API suite, 45 checks, against the running server with throwaway users)

* Hardening: no `password` in login/register/`/me` responses. Permissions: 401 unauthenticated, 403 for a normal user on every admin route and on RAG ingest.
* Public list shows the AI advocate with **no** model/config/prompt; AI credential types rejected on humans and vice-versa; `ai-config` rejected on a human; bad model/voice/temperature/minutes → 400; a valid edit bumps `version`.
* Trust rules: unpublished/unverified human blocked, verifying blocked until the enrolment is checked, un-check/delete of the only verified enrolment blocked, disable hides the advocate and clears accepting.
* Photos: real PNG accepted and served with an image content-type; a text file renamed `.png`, a PDF, and a >2 MB image are all rejected with no stray files left; other `uploads/` files are not served; deleting an advocate removes its photo.

**Setup needed:** set `ADMIN_EMAILS=<your account email>` in `server/.env` and restart the API — otherwise nobody is an admin.

---

# ⚖️ Connect Advocate — Phase 1: Grounded Legal Knowledge (Phase 19)

---

## 📌 Overview

The accuracy core of the AI advocate. Until now the knowledge base was a private aggregator (Indian Kanoon) with no section labels, no filters and no cut-off — the model chose its own citations and nothing checked them. This phase loads the **official statute text from a government site**, section by section, and adds retrieval that the server controls plus a check on every provision the advocate later quotes. No voice/consultation yet (next phase).

---

## 🔑 What was built

* **Official sources, downloaded directly** — the Home Ministry's gazette PDFs for the **BNS (358 sections), BNSS (531) and BSA (170)** (`rag.sources.ts`). No Firecrawl credits are used; text is extracted with `pdf-parse`. Adding an Act is one registry entry (URL + expected section count).
* **Section parser** (`rag.statute-parser.ts`): strips the gazette header / rule / page-number furniture on every page and accepts a section start only when its number is the **next one in sequence**, which keeps numbered lists and illustrations inside a section from being mistaken for new sections (it also handles the BNS PDF's bare `111.` lines with the text on the next line). Long sections are split at their `(1) (2)…` sub-sections. Marginal headings aren't reliably extractable from these PDFs, so `section_heading` stays empty rather than being guessed.
* **Ingest refuses a partial Act** (`rag.statute-ingest.ts`): if the parsed count differs from the expected count nothing is written or deleted. Each chunk is prefixed `"<Act> — Section N"` and embedded in batches of 64; the previous version of that Act is replaced only after everything succeeded. Real run: 1,241 chunks in ~106 s (~$0.02 of embeddings).
* **Migration `20260920110000_add_knowledge_grounding_metadata`** (applied by SQL + `migrate resolve`): `source_type` (`GOV_STATUTE / GOV_JUDGMENT / GOV_GAZETTE / AGGREGATOR`), `source_domain`, `jurisdiction` (default `IN`, room for state codes), `act_short`, `section_heading`, `language`, `effective_from/to`, plus indexes. The 259 existing Indian Kanoon rows are tagged `AGGREGATOR` and are **never** used by the advocate.
* **`retrieveGrounded`** (`rag.grounded.ts`): filters by jurisdiction (`IN` + the client's state, injected by the server — never chosen by the model) and government source types; **nothing below the similarity threshold is returned**, so "no answer" is a real outcome; a query that names a provision ("Section 482 BNSS") is looked up **exactly** and put first.
* **`search_law` tool** for the live advocate: describes itself as mandatory before stating any section, and on an empty result tells the model to say it cannot confirm the provision and refer the client to an enrolled advocate.
* **Citation verifier** (`verifyCitations`): finds "Section N of <Act>", "BNSS s.482", "Sections 316 and 318 of BNS", … in what the advocate said and marks each `verified` (it was retrieved), `unverified_not_retrieved`, or `unverified_act_not_loaded` (e.g. IPC/CrPC — legitimate for pre-1 July 2024 offences, but no text is loaded so they can never be shown as verified).
* **Admin API**: `POST /rag/ingest-statutes {acts?: ["BSA"]}` and `GET /rag/statutes` (both `requireAdmin`). A successful ingest re-syncs the AI advocate's `KNOWLEDGE_SOURCE`/`LAST_VERIFIED` credentials to exactly what is loaded — only system-written (`auto:`) credentials are replaced; anything an admin typed is left alone.
* **Golden eval**: `npm run rag:eval` (`rag.golden.ts`, `rag.eval.ts`) — exits non-zero on failure.

---

## ✅ Result

* **Parser**: 358/358, 531/531, 170/170 sections with no gaps; spot checks BNS 103 (murder), 318 (cheating), 64 (rape), BNSS 35 / 482, BSA 63 matched the official text.
* **Retrieval** (22 plain-language questions, e.g. "anticipatory bail", "someone snatched my chain"): the right provision is in the top 8 for **22/22** and ranked first for **14/22** (e.g. plain "punishment for murder" ranks BNS 103 fourth, behind the attempt/abetment sections — the live advocate writes its own legal-vocabulary queries and sees several passages).
* **Threshold**: weakest correct hit 0.336, clearly unrelated questions ≤ 0.2, so the default is **0.30**. A cut-off cannot separate *adjacent* topics from answerable ones (GST filing dates 0.328, tenant eviction 0.353 still reach the model), so those are reported, not failed — the prompt and the citation verifier are the guard there.
* **Citation parsing**: 10/10 cases including lists, sub-sections, long Act names, IPC/CrPC (unloaded) and false-positive phrases; verifier statuses correct.
* **API** (13 checks): 401/403 for anonymous and normal users; unknown Act reported without writing; a real BSA re-ingest replaced its 184 chunks (no duplicates), left BNS and the 259 aggregator rows untouched, and the AI profile lists exactly the three loaded Acts.

**Not done yet (by design):** IPC/CrPC/Evidence Act (legacy), the Constitution, IT Act, Consumer Protection Act etc. — each needs its URL and section count verified before it is registered — and state law (phase 2 of the roadmap).

---

# ⚖️ Connect Advocate — Phase 1b: More Acts, and the Era Filter (Phase 20)

---

## 📌 Overview

Seven more central Acts were added to the grounded knowledge base (now **10 Acts, 2,492 statute chunks**), and finding a source for each turned up several ways a "successful" ingest could have silently put wrong law in front of the advocate. Those checks are now part of the parser and the ingest.

---

## 🔑 What was added

* **New Acts** (each with a verified official URL and section count): **CrPC 1973** (484), **Indian Evidence Act 1872** (167), **DV Act 2005** (37), **Consumer Protection Act 2019** (107, NCDRC), **Transfer of Property Act 1882** (137), **RTI Act 2005** (31, CIC), **POCSO 2012** (46). Source hosts: India Code (`/indiacode/bitstream/…` — the un-prefixed `/bitstream/…` links in search results mostly 404), NCDRC, CIC. The Legislative Department dashboard times out from here and `wcd.nic.in` doesn't resolve, so those weren't usable.
* **Era filter** (`LawEra`, `actsExcludedForEra`): criminal law depends on *when the offence happened* — on/after 1 July 2024 the BNS/BNSS/BSA apply, earlier offences stay under the IPC/CrPC/Evidence Act. With both sets loaded, "can police arrest me without a warrant?" returned CrPC §41 ahead of BNSS §35 — a repealed provision quoted as current law. `retrieveGrounded` now defaults to `current` (excludes IPC/CrPC/IEA) and takes `before_2024_07_01` (excludes BNS/BNSS/BSA); civil and special laws appear in both. The `search_law` tool has an `era` argument and its description tells the model to ask the client when the offence happened. Exact lookups ("Section 438 CrPC") ignore the era because the user named the provision.
* **Parser hardening** (all found on real files): a **contents list** looks exactly like sections, so the parser now tries a pass from every "1." line and keeps the one with the most *substantive* sections (not the longest text — the contents pass runs into the body and wins on length); **amendment footnotes** ("3. Cf. definition of…", "1. Subs. by Act…") are never taken for section starts and are dropped from bodies; substituted sections wrapped in a footnote marker (`[61.`, `50[52.`) are recognised.
* **Quality gate in the ingest**: an Act is refused if more than 25% of its sections have almost no text — the right count with only headings under it means a contents list was captured.
* **`syncAiKnowledgeCredentials`** now lists the 10 loaded Acts on the AI advocate's profile.

---

## ⚠️ Deliberately NOT ingested (and why)

* **IPC 1860** — the only reachable PDF is an *extract* (58 pages: Chapters I–V-A and XXIII); ingesting it would tell the advocate that §121–510 don't exist. IPC citations stay "unverified — act not loaded".
* **IT Act 2000** — the reachable MeitY file is the *original* 2000 text (§66 "Hacking", no §66A/66C/66D). The 2008 amendments replaced most of the offences, so it would state outdated law.
* **Motor Vehicles Act 1988** — the reachable copy is an annotated commentary edition ("Corresponding Law…" notes and `*98.` markers mixed into the text); the advocate could quote commentary as law.
* **Constitution of India** — the file the search listed as English is the Maithili edition; the English edition is a bilingual "diglot" whose columns interleave, so Article 21 doesn't come out as continuous text.
* **NI Act, Contract Act, Limitation Act** — no reachable official PDF found. These (and IPC, IT, MV) are registered as `LEGACY_ACT_ALIASES`, so citing them is flagged unverified instead of being mistaken for a loaded Act.

Each needs a clean official PDF (or a manual download into the registry) before it can be added.

---

## ✅ Result

* Parser on real files: BNS 358, BNSS 531, BSA 170, CrPC 484, IEA 167, DV 37, CPA 107, TPA 137, RTI 31, POCSO 46 — every count exact, no gaps, near-empty sections 0–1 per Act (TPA §88 and IEA one are genuinely repealed).
* `npm run rag:eval`: **33/33** golden questions have the right provision in the top 8 (**23/33** ranked first); era isolation shows **0** repealed-code hits in current answers and **0** new-code hits in legacy answers (5 queries × top 20); unrelated questions stay below the 0.30 threshold; citation parser 10/10.
* Two golden expectations were adjusted after seeing results, and this should be known: "maintenance for wife" expects BNSS §144 / DV Act §20 (the current-era answer) and the consumer-complaint case accepts CPA §35/39/83/84 (all genuinely relevant).
* **Known limitation:** wrapped continuation lines of amendment footnotes can remain inside older Acts' section text (the footnote's first line is dropped, the rest can stay). It does not change which section a passage belongs to.
* Ingesting the seven new Acts in one run took ~9½ minutes (~1,250 chunks, written one at a time). Call `POST /rag/ingest-statutes` with one Act at a time (`{"acts":["CrPC"]}`) — a single HTTP request that runs this long may be cut off by a proxy or client timeout, though the ingest itself keeps going.

---

# 🎙️ Connect Advocate — Phase 2: Live Consultations (Phase 21)

---

## 📌 Overview

The server side of the live voice call with the NyayMitra AI Advocate. The browser sends audio straight to OpenAI over WebRTC, but the **server brokers the call**, so the API key and the advocate's instructions never reach the browser, and everything that has to be trusted (law lookups, transcript, citation checks, time limits) runs on a server-owned channel. No client UI yet (next phase).

---

## 🔑 What was built

* **Tables** (`consultations`, `consultation_turns`; migration `20260920120000_add_consultations`): a consultation stores the user, the advocate (name snapshotted, `ON DELETE SET NULL` so a saved consultation survives an advocate being deleted), state, language, consent time, model and AI-config version used, OpenAI call id, timings, duration, end reason, token usage and the summary. Turns are `SPEECH` (transcribed talk), `SEARCH` (a law lookup, with the passages retrieved — citation, source URL, similarity, excerpt) or `NOTICE`; advocate speech carries each provision mentioned with its verification status.
* **Connect flow** (`POST /consultations` → `POST /consultations/:id/connect`): the client accepts the recording/AI notice (`consent: true` is required), picks state and language (English/Hindi), and creates a LOBBY record. `connect` takes the browser's SDP offer, atomically claims the lobby (two simultaneous connects can't both start a call), and forwards the offer to OpenAI's `/v1/realtime/calls` together with a **server-built session** — model, voice and persona from the AI advocate's config, the code-owned prompt, the `search_law` tool, server VAD and transcription. The SDP answer goes back to the browser.
* **Sideband** (`consultation.realtime.ts`, uses `ws`): a second WebSocket attached to the same call. It runs `search_law` when the advocate asks (the client's **state is injected by the server**; the model can only choose the criminal-law era), saves every transcribed turn, and counts tokens. If a spoken "Section N of <Act>" was **not** among the retrieved passages, the server tells the advocate to look it up and correct itself (up to 3 times per call). A dropped socket reconnects twice; if the call is gone the session is closed.
* **Code-owned prompt** (`consultation.prompt.ts`): discloses that it is an AI, asks one question at a time before advising, may state only law returned by `search_law`, never names a judgment (case law isn't in the knowledge base yet — it may describe how courts *generally* approach a point, marked as general understanding), separates pre/post 1 July 2024 criminal law, gives emergency numbers (112, 181/1091, 1098, 15100, 14416, 1930) first, refuses to help commit or hide offences, and says human advocates aren't available yet. The admin's persona text is appended as a tone layer that is stated to be unable to override the rules.
* **Limits**: one live call per user; a daily allowance (`DAILY_CONSULT_MINUTES`, default 30, rolling 24 h); the per-advocate `maxSessionMinutes` capped by what is left of the allowance; a wrap-up prompt 60 s before the limit and a **server-side hang-up** at the limit; a 4-minute idle timeout (no client speech); `connect` is rate limited; an unused lobby is superseded by the next create.
* **Never leave a call running**: ending (user, limit, idle, error) always hangs the call up at OpenAI, closes the socket, stores duration/usage and starts the summary. On startup, and before any new consultation, calls left `LIVE` by a restart are hung up and closed — with duration **capped at the session's own limit** so downtime is never charged to a user's allowance. `SIGINT/SIGTERM` end live calls cleanly.
* **Summary** (`consultation.summary.ts`, `gpt-4.1-mini`, JSON): situation, key facts, questions asked, provisions, options (steps, forum, timeline, likely reaction, risks), recommendation, next steps, deadlines, open questions — built only from the transcript and the retrieved passages, then re-checked with the same citation verifier (`unverifiedMentions`), with the AI disclaimer added by the server.
* **API** (all signed-in, ownership checked): `GET /consultations/options`, `GET/POST /consultations`, `GET /consultations/:id`, `GET /:id/turns?after=` (polled by the client during a call), `POST /:id/connect`, `POST /:id/end`, `DELETE /:id` (not while live).

---

## ✅ Result (37 API checks + a real spoken call, run with a headless Chromium and a synthetic caller)

* **Guards**: 401 anonymous; consent required; bad state/language/advocate rejected; another user gets 403 on read and connect; bad or missing SDP 400; a second connect, a second consultation, or a delete while live all 409.
* **Live call**: the advocate spoke first — *"I'm NyayMitra's AI Advocate — an AI, not a human lawyer — and this call is being transcribed"* — and the caller's speech (TTS: a gold-chain snatching in Mumbai) was transcribed. The advocate worked out from "yesterday" that current law applies, called `search_law` (6 passages, all current-era codes), and cited **Section 304 of the BNS**, which the verifier confirmed against the retrieved text. Ending the call stored duration and token usage; the summary came back `READY` with only verified provisions and the AI disclaimer.
* **Limits**: with the session limit set to 1 minute the server ended the call itself after 61 s (`time_limit`); a fake `LIVE` record 3 hours old was closed as `server_restart` with duration 600 s (its limit), not 3 hours; with 30 minutes already used a new consultation is refused with 429 while another user is unaffected.

**Things to know**
* **Temperature has no effect on live calls.** The GA Realtime session no longer accepts a `temperature` field, so the value in the admin panel is stored but not sent.
* **Case law is not available.** No judgments are ingested, so the advocate explains statutory text and cannot cite how a particular court ruled. This is a later phase.
* **Only central law**: state acts (rent control, stamp duty…) are not loaded; the advocate says state rules may differ. `IPC`, `IT Act`, `MV Act`, the Constitution, NI/Contract/Limitation Acts are also not loaded (see Phase 20).
* **Cost**: a ~90 s test call used ~7 k input / ~1.3 k output tokens; audio minutes are billed by OpenAI, hence the daily allowance.
* **Fact-finding vs. answering varies between calls.** With the same opening speech, one run began with a fact-finding question ("have you already reported it to the police?") and the next went straight to `search_law` and an answer. The prompt asks for understanding before advice, but a live model does not follow that identically every time — worth reviewing real transcripts before launch, and tightening the prompt if it answers too early.
* `/turns` is polled every couple of seconds by the client; it is ownership-checked but deliberately not on the strict rate limiter.

---

**Follow-up (Phase 21b):** the advocate repeated its "I'm an AI and this is transcribed" introduction whenever the caller said "hello" again. A line in the prompt was not enough, so after its first spoken turn the server adds a short system note to the conversation ("you have already introduced yourself…", no response triggered). Re-run: the introduction is now given once.

# 🗣️ Connect Advocate — Phase 5: Sounding Like a Person (Phase 22)

---

## 🔑 What changed

* **Voice**: the AI advocate's default voice is now `marin` (one of the two Realtime-native voices, the most natural-sounding); the stored config was updated to match (`alloy` → `marin`, version bumped). Admins can still switch voices.
* **Prompt** (`consultation.prompt.ts`): a "sound like a person, not a system" section — natural contractions and short sentences; acknowledge and show care before advising ("That sounds really stressful."); small varied acknowledgements while gathering facts; say "let me check the exact provision for you" before a lookup; slow down if the client is upset; never announce "option one, option two" like a menu. It may show care but must not claim a body, family or human experiences, and must say plainly that it is an AI if asked.
* **Client's first name**: `consultation.service.ts` passes the account's first name into the instructions so the advocate can greet and address the client naturally. The name is user-typed text that reaches the model's instructions, so `safeFirstName` only lets a single plain-letters first name through (no digits, punctuation or sentences) — anything else is dropped.

**Observed in a real call:** *"Hi Riya, I'm NyayMitra's AI Advocate — an AI, not a human lawyer — and this call is being transcribed. What's on your mind today?"* and, after the caller described a snatching, *"That sounds really upsetting, Riya. I'm sorry you had to go through that."*

---

# 🧑‍⚖️ Connect Advocate — Phase 6: Live Calls With Real Advocates (Phase 23)

---

## 📌 Overview

Clients can now request a live video consultation with a **real, verified advocate**. The advocate has their own login and an **Advocate Desk**; a client's request reaches the desk instantly, the advocate accepts or declines, and the two browsers connect **directly** (WebRTC) — the server only introduces them, so **nothing is recorded**. Instant calls only for now (scheduling and payments are later phases).

---

## 🔑 How it works

1. **Advocate account.** An admin links a human advocate's profile to their own NyayMitra login by email (`PUT/DELETE /admin/advocates/:id/account`; one account per advocate; the email is shown only in the admin shape, never in the public one). Only then can they open the Advocate Desk (`/advocate-desk/*`).
2. **Presence** (`human.presence.ts`). An advocate is *online* only when they have switched **Available now** on **and** their desk is open in a browser. Closing the desk switches availability off after 30 s. Nothing is persisted, so after a restart everyone is offline until they choose otherwise — nobody can be listed as reachable without acting. Clients see `AVAILABLE / BUSY / OFFLINE` on the advocate's public profile.
3. **Request → accept.** `POST /human-consultations` (consent required; state, language and a 10–600 character subject) creates a `REQUESTED` consultation and pushes it to the desk over the WebSocket hub. The advocate accepts (`ACCEPTED`) or declines with an optional reason; the client can cancel. Rules: advocate must be ACTIVE + VERIFIED + accepting + online, not busy, at most 5 waiting; one open consultation per client; nobody can request themselves. The advocate sees only a **first name and last initial**, state, language and the subject — never email or phone.
4. **The call** (`human.hub.ts`, WebSocket on the API port, path `/ws`). Each connection authenticates with its first message (an unauthenticated one is closed after 8 s; a bad token immediately). Both parties `join` a room for their consultation (a stranger is refused); the server tells the advocate to make the WebRTC offer, relays offer / answer / ICE candidates (size-capped, participants only), and marks the call `LIVE` when the browsers report a connection. Each side also announces whether its camera is on. A second tab of the same person replaces the first. Messages are rate limited and dead connections are pruned by a heartbeat.
5. **Limits and timeouts** (`human.service.ts::sweep`, every 10 s): unanswered requests expire after `HUMAN_REQUEST_TTL_SECONDS` (180), an accepted call nobody joins expires after `HUMAN_JOIN_TTL_SECONDS` (300), a call ends at `HUMAN_CALL_MAX_MINUTES` (45) with a 1-minute warning, and a live call both people left ends after 90 s — which also cleans up after a server restart.
6. **After the call.** Duration and end reason are stored; the advocate keeps **private notes** and can write **notes for the client**, which the client sees only once the call has ended (`toPublic` never includes private notes). Human calls do not use the AI daily-minutes allowance, and the AI restart-recovery ignores them.
7. **TURN** (`human.ice.ts`). `GET /human-consultations/:id/ice` and the hub's `joined` message carry the ICE servers: STUN always (`STUN_URLS`, Google's by default), plus TURN when `TURN_URLS` is set — with coturn time-limited credentials derived from `TURN_SECRET` (HMAC-SHA1), or fixed `TURN_USERNAME`/`TURN_CREDENTIAL` from a managed provider.

New tables/columns (migration `20260921100000_add_human_consultations`): `advocates.user_id` (unique), consultation statuses `REQUESTED/ACCEPTED/DECLINED/EXPIRED/CANCELLED`, and `advocate_kind`, `subject`, `requested_at`, `responded_at`, `decline_reason`, `private_notes`, `shared_notes` on `consultations`.

---

## ✅ Result

* **Server suite — 71 checks** (WebSocket + HTTP, throwaway accounts only): admin linking (403 for non-admins, unknown/duplicate/bad email refused, case-insensitive match, email never in the public shape); desk identity and access control; request validation; presence (going available needs an open desk; closing the desk makes the advocate OFFLINE at once); a request reaching the desk with only a first name + initial; queueing; decline / cancel / accept with instant notifications; BUSY while in a consultation; strangers cannot join or inject signals; offer/answer relay to the other party only; LIVE with a time limit; private vs shared notes; ended by the client; expiry of an unanswered request and of a no-show; a call past the limit ended by the server; a bad-token and a silent connection both closed. Your real advocates were verified untouched afterwards.
* **TURN credentials — 5 checks**: STUN always present, TURN URLs included, `<expiry>:<userId>` username about an hour ahead, credential equals the coturn HMAC, different users get different credentials.
* **Browser suite — 43 checks** (two real Chromium browsers, fake camera and microphone): see the client README (Phase 20).
* **Found and fixed by the tests:** after a call ended the advocate's notes panel remounted with stale (empty) values and would have overwritten saved notes — see the client README.

---

## ⚠️ What to know before real users use it

* **TURN is needed for some networks.** Without a relay, calls between two browsers fail on a share of connections (strict office networks, some mobile carriers). Set `TURN_URLS` + `TURN_SECRET` (a coturn server) or a managed provider's credentials before launch.
* **Presence is held in this process**; running more than one server instance would need it moved to a shared store (e.g. Redis).
* **Advocates must keep the desk open** to be reachable — there is no email/SMS/push alert yet (that needs your SMTP or an approved MSG91 template).
* **No payments and no scheduling yet.** Consultations are instant and free; fees (e.g. Razorpay) and booked slots are later phases.
* **Legal review first.** Bar Council of India rules restrict how advocates may advertise or solicit, and listing advocates on a platform may fall under them; get an opinion, and make sure each advocate has consented to be listed. Nothing here records calls, which supports confidentiality, but the consent text and retention of the subject line and notes should be reviewed (DPDP Act).
* An operational note from testing: rapid repeated test runs on one Windows machine can exhaust ephemeral TCP ports (thousands of sockets in TIME_WAIT, mostly DNS lookups), which shows up as random 500s / `EADDRINUSE` until they drain — not an application fault.

---

# 💬 Plain-Language Messages for Sign-in, Registration and OTP (Phase 24)

---

## 📌 Overview

The client now shows the server's message to the person (client README, Phase 21), so the messages themselves were rewritten for people, and one status code was corrected.

---

## 🔑 What changed

* **Login** — `"User not registered, please register first"` → *"We couldn't find an account with this email. Please create an account first."* (still `404`); a wrong password → *"That password doesn't match this account. Please try again."* (still `401`).
* **Register** — an email or mobile number that already has an account now returns **`409 Conflict`** (was `400`) with *"An account with this email/mobile number already exists. Please sign in instead."*; the client uses the `409` to offer *Sign in instead*.
* **OTP** — *"Invalid OTP"*, *"OTP expired…"*, *"OTP not requested or already used"*, *"Too many attempts…"* and *"Please wait before requesting another OTP"* now say what happened and what to do.
* **Google sign-in** (`auth.routes.ts`) — a failure redirects the browser to `/login?error=google` instead of returning raw JSON (the callback is a page navigation, not an API call). The debug `console.log`s that printed the signed-in user, **including their login token**, were removed.

---

## ✅ Result

Verified through the browser suite in the client README (real `404`, `401` and `409` responses shown correctly). Server type-check clean. No API shape changed apart from the `400 → 409` on duplicate registration.

**To pick this up:** restart the API — it runs as plain `ts-node` (no auto-reload), so a process started before this change still returns the old wording.

---
