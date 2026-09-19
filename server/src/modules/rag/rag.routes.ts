import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { requireAdmin } from "../../common/middleware/admin.middleware";
import { aiRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { runIngest, getIngestStatus, runStatuteIngest, getStatuteStatus } from "./rag.controller";

const router = Router();

// Ingestion spends Firecrawl/OpenAI credits, so it is admin-only. (Replaces the
// old shared x-ingest-secret header, which existed before roles did.)
router.post("/ingest", authMiddleware, requireAdmin, aiRateLimiter, runIngest);
router.get("/status", authMiddleware, getIngestStatus);

// Official central-law statutes (BNS/BNSS/BSA…) that ground the AI advocate.
router.post("/ingest-statutes", authMiddleware, requireAdmin, aiRateLimiter, runStatuteIngest);
router.get("/statutes", authMiddleware, requireAdmin, getStatuteStatus);

export default router;
