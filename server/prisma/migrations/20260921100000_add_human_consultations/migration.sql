-- Live consultations with real (human) advocates.

-- Request lifecycle for a human advocate (each statement commits on its own).
ALTER TYPE "ConsultationStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';
ALTER TYPE "ConsultationStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "ConsultationStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "ConsultationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "ConsultationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- The login account a human advocate uses for their Advocate Desk.
ALTER TABLE "advocates" ADD COLUMN "user_id" INTEGER;
CREATE UNIQUE INDEX "advocates_user_id_key" ON "advocates" ("user_id");
ALTER TABLE "advocates"
  ADD CONSTRAINT "advocates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consultations"
  ADD COLUMN "advocate_kind"  "AdvocateKind" NOT NULL DEFAULT 'AI',
  ADD COLUMN "subject"        TEXT,
  ADD COLUMN "requested_at"   TIMESTAMP(3),
  ADD COLUMN "responded_at"   TIMESTAMP(3),
  ADD COLUMN "decline_reason" TEXT,
  ADD COLUMN "private_notes"  TEXT,
  ADD COLUMN "shared_notes"   TEXT;
