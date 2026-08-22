import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { aiRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { upload } from "../../config/multer";
import { transcribeHandler } from "./speech.controller";

const router = Router();

router.post("/transcribe", authMiddleware, aiRateLimiter, upload.single("audio"), transcribeHandler);

export default router;
