-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "clauses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "risk_items" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "risk_score" INTEGER;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "document_type" TEXT,
ADD COLUMN     "title" TEXT;
