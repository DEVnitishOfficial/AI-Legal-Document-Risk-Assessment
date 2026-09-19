import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY!,
  RAG_INGEST_SECRET: process.env.RAG_INGEST_SECRET!,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  SERVER_URL: process.env.SERVER_URL || "http://localhost:3000",
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || "",
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || "",
  // Live voice consultations are billed per audio minute: each user gets this
  // many minutes per rolling 24 hours.
  DAILY_CONSULT_MINUTES: Math.max(1, Number(process.env.DAILY_CONSULT_MINUTES) || 30),
  // Comma-separated account emails promoted to ADMIN at server start. Additive
  // only: removing an email here does not demote — change the role in the DB.
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};