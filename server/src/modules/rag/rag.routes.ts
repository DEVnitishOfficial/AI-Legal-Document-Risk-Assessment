import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { aiRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { runIngest, getIngestStatus } from "./rag.controller";

const router = Router();

// authMiddleware just proves the caller is a logged-in user; the real gate
// is the x-ingest-secret header check inside runIngest (no admin/role
// system exists yet, so a shared secret is the pragmatic stand-in).
router.post("/ingest", authMiddleware, aiRateLimiter, runIngest);
router.get("/status", authMiddleware, getIngestStatus);

export default router;
