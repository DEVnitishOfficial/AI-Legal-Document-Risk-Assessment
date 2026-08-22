import { Router } from "express";
import { runAnalysis } from "./analysis.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { aiRateLimiter } from "../../common/middleware/rateLimit.middleware";

const router = Router();

console.log("Analysis routes initialized");
router.post("/run", authMiddleware, aiRateLimiter, runAnalysis);

export default router;