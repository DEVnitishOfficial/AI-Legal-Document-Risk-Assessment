-- Grounding metadata for the legal knowledge base (Connect Advocate).
-- Existing rows come from Indian Kanoon, a private aggregator, so they default
-- to AGGREGATOR and are excluded from advocate retrieval.

CREATE TYPE "KnowledgeSourceType" AS ENUM ('GOV_STATUTE', 'GOV_JUDGMENT', 'GOV_GAZETTE', 'AGGREGATOR');

ALTER TABLE "legal_knowledge_chunks"
  ADD COLUMN "source_type"     "KnowledgeSourceType" NOT NULL DEFAULT 'AGGREGATOR',
  ADD COLUMN "source_domain"   TEXT,
  ADD COLUMN "jurisdiction"    TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN "act_short"       TEXT,
  ADD COLUMN "section_heading" TEXT,
  ADD COLUMN "language"        TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "effective_from"  TIMESTAMP(3),
  ADD COLUMN "effective_to"    TIMESTAMP(3);

-- Backfill the host of each existing source URL.
UPDATE "legal_knowledge_chunks"
SET "source_domain" = lower(substring("source_url" from '^https?://([^/]+)'))
WHERE "source_domain" IS NULL;

CREATE INDEX "legal_knowledge_chunks_source_type_jurisdiction_idx"
  ON "legal_knowledge_chunks" ("source_type", "jurisdiction");
CREATE INDEX "legal_knowledge_chunks_act_short_section_idx"
  ON "legal_knowledge_chunks" ("act_short", "section");
