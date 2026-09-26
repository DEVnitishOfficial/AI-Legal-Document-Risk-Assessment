# ⚖️ NyayMitra AI

**AI-Powered Legal Document Analyzer & Risk Assessment System**

Upload a lease, notice or contract and get a plain-language risk report. Ask an AI legal assistant about Indian law and get answers mapped to the actual IPC/BNS, CrPC/BNSS sections. Or talk live to an AI (or real) advocate, voice to voice.

Built as an IGNOU MCA final project, taken from academic prototype to a production-quality app.

![Home page](docs/screenshots/home.png)

---

## ✨ Features

### 📄 Document Risk Analyzer
Upload a PDF or paste text (a lease, NDA, loan agreement, ToS, privacy policy...). The AI reads it, classifies the document type, generates a plain-English summary, a **0–100 risk score**, and flags each risky clause with its severity and category. Re-opening an already-analyzed document is instant (cached, no repeat AI cost).

![Document risk report](docs/screenshots/document-risk-report.png)

### 💬 Legal Assistant
A chat agent specialized in Indian law (criminal, tenancy, cybercrime, bail, and more). It asks clarifying questions before advising, answers in **English or Hindi** (typed or by voice, with live captions), streams its reply token-by-token, and cites the real law it relied on — grounded in a retrieval pipeline over actual statutes and judgments, not guesses. You can attach a document to the conversation for context-aware answers.

![Legal Assistant chat](docs/screenshots/legal-assistant.png)

### 🧑‍⚖️ Connect Advocate
Speak with an advocate live, by voice, video-call style. Start with the always-available **NyayMitra AI Advocate** (clearly labeled as AI, grounded in the same verified legal sources, with a live transcript and source citations), or request a real, verified human advocate when one is online. Every consultation ends with a saved summary — situation, applicable law, options, and next steps.

![Connect Advocate](docs/screenshots/connect-advocate.png)

### 🔐 Accounts & Experience
Email/password and Google sign-in, plus mobile OTP login. A dashboard overview of your documents, chats and risk history. Full light/dark theme. Friendly, plain-language error messages everywhere instead of raw HTTP errors.

![Dashboard](docs/screenshots/dashboard.png)
![Login](docs/screenshots/login.png)

---

## 🧱 Tech Stack

| | |
|---|---|
| **Client** | React 19 + TypeScript + Vite, Tailwind CSS v4, Redux Toolkit, Framer Motion |
| **Server** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL (`pgvector`) via Prisma ORM |
| **AI** | OpenAI (chat, analysis, streaming, Whisper voice, Realtime voice calls) |
| **Auth** | JWT, Google OAuth, Mobile OTP |
| **RAG** | Firecrawl-sourced legal content, ingested and cited by the Legal Assistant |

---

## 🚀 Run It Locally

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)
- An OpenAI API key (required for AI features)

### 1. Clone the repo
```bash
git clone <this-repo-url>
cd AI-Legal-Document-Risk-Assessment
```

### 2. Set up the server
```bash
cd server
```
Create a `.env` file in `server/` with:
```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=riskassessmentdb
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/riskassessmentdb

JWT_SECRET=your_jwt_secret

OPENAI_API_KEY=your_openai_api_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FIRECRAWL_API_KEY=your_firecrawl_api_key
RAG_INGEST_SECRET=any_shared_secret

ADMIN_EMAILS=you@example.com
```

Start Postgres, install dependencies, and run the migrations:
```bash
docker compose up -d
npm install
npx prisma migrate deploy
npm run dev
```
The API runs on **http://localhost:3000**.

### 3. Set up the client
In a new terminal:
```bash
cd client
npm install
npm run dev
```
The app runs on **http://localhost:5173**.

### 4. Open the app
Visit **http://localhost:5173**, create an account, and start analyzing a document.

> Google OAuth, Firecrawl (RAG ingestion) and live voice calls are optional — the core document analysis and chat features work with just `OPENAI_API_KEY` and a running database.
