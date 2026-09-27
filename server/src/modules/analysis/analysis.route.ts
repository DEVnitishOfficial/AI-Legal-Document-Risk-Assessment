import { Router } from "express";
import { runAnalysis } from "./analysis.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { analysisPollRateLimiter } from "../../common/middleware/rateLimit.middleware";

const router = Router();

console.log("Analysis routes initialized");
router.post("/run", authMiddleware, analysisPollRateLimiter, runAnalysis);

export default router;