import { Router } from "express";
import { runAnalysis } from "./analysis.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { analysisPollRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { runAnalysisBodySchema } from "./analysis.schema";
import { logger } from "../../config/logger";

const router = Router();

logger.debug("Analysis routes initialized");
router.post(
    "/run",
    authMiddleware,
    analysisPollRateLimiter,
    validate({ body: runAnalysisBodySchema }),
    runAnalysis
);

export default router;
