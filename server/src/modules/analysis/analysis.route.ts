import { Router } from "express";
import { runAnalysis } from "./analysis.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { analysisPollRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { runAnalysisBodySchema } from "./analysis.schema";

const router = Router();

console.log("Analysis routes initialized");
router.post(
    "/run",
    authMiddleware,
    analysisPollRateLimiter,
    validate({ body: runAnalysisBodySchema }),
    runAnalysis
);

export default router;
