-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdvocateKind" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "AdvocateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('ENROLMENT', 'DEGREE', 'CERTIFICATION', 'BAR_MEMBERSHIP', 'KNOWLEDGE_SOURCE', 'SCOPE', 'LAST_VERIFIED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "advocates" (
    "id" SERIAL NOT NULL,
    "kind" "AdvocateKind" NOT NULL,
    "display_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "photo_url" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "practice_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "courts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "states_covered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "years_experience" INTEGER,
    "status" "AdvocateStatus" NOT NULL DEFAULT 'DRAFT',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMP(3),
    "verified_by_id" INTEGER,
    "accepting_consultations" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advocates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advocate_credentials" (
    "id" SERIAL NOT NULL,
    "advocate_id" INTEGER NOT NULL,
    "type" "CredentialType" NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "year" INTEGER,
    "identifier" TEXT,
    "document_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advocate_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advocate_ai_configs" (
    "id" SERIAL NOT NULL,
    "advocate_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'alloy',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "persona_prompt" TEXT NOT NULL DEFAULT '',
    "max_session_minutes" INTEGER NOT NULL DEFAULT 20,
    "rag_config" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advocate_ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advocates_slug_key" ON "advocates"("slug");

-- CreateIndex
CREATE INDEX "advocate_credentials_advocate_id_idx" ON "advocate_credentials"("advocate_id");

-- CreateIndex
CREATE UNIQUE INDEX "advocate_ai_configs_advocate_id_key" ON "advocate_ai_configs"("advocate_id");

-- AddForeignKey
ALTER TABLE "advocate_credentials" ADD CONSTRAINT "advocate_credentials_advocate_id_fkey" FOREIGN KEY ("advocate_id") REFERENCES "advocates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advocate_ai_configs" ADD CONSTRAINT "advocate_ai_configs_advocate_id_fkey" FOREIGN KEY ("advocate_id") REFERENCES "advocates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
