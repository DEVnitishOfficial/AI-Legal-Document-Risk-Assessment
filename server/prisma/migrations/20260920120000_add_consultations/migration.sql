-- Live consultations with an advocate, and their transcript turns.

CREATE TYPE "ConsultationStatus" AS ENUM ('LOBBY', 'LIVE', 'ENDED', 'FAILED');
CREATE TYPE "TurnSpeaker" AS ENUM ('USER', 'ADVOCATE', 'SYSTEM');

CREATE TABLE "consultations" (
  "id"                SERIAL PRIMARY KEY,
  "user_id"           INTEGER NOT NULL,
  "advocate_id"       INTEGER,
  "advocate_name"     TEXT NOT NULL,
  "state"             TEXT NOT NULL,
  "language"          TEXT NOT NULL,
  "status"            "ConsultationStatus" NOT NULL DEFAULT 'LOBBY',
  "consent_at"        TIMESTAMP(3) NOT NULL,
  "model"             TEXT,
  "ai_config_version" INTEGER,
  "call_id"           TEXT,
  "started_at"        TIMESTAMP(3),
  "ended_at"          TIMESTAMP(3),
  "duration_sec"      INTEGER NOT NULL DEFAULT 0,
  "end_reason"        TEXT,
  "usage"             JSONB,
  "summary"           JSONB,
  "summary_status"    TEXT NOT NULL DEFAULT 'NONE',
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consultations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "consultations_advocate_id_fkey" FOREIGN KEY ("advocate_id") REFERENCES "advocates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "consultations_user_id_created_at_idx" ON "consultations" ("user_id", "created_at");
CREATE INDEX "consultations_status_idx" ON "consultations" ("status");

CREATE TABLE "consultation_turns" (
  "id"              SERIAL PRIMARY KEY,
  "consultation_id" INTEGER NOT NULL,
  "speaker"         "TurnSpeaker" NOT NULL,
  "kind"            TEXT NOT NULL DEFAULT 'SPEECH',
  "text"            TEXT NOT NULL,
  "citations"       JSONB,
  "at_ms"           INTEGER NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consultation_turns_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "consultation_turns_consultation_id_id_idx" ON "consultation_turns" ("consultation_id", "id");
