import { Router } from "express";
import { runAnalysis } from "./analysis.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";

const router = Router();

console.log("Analysis routes initialized");
router.post("/run", authMiddleware, runAnalysis);

export default router;