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
