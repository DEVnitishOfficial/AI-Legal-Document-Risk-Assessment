import { Router } from "express";
import userRoutes from "../modules/user/user.routes";
import documentRoutes from "../modules/document/document.routes";
import analysisRoutes from "../modules/analysis/analysis.route";
import legalAgentRoutes from "../modules/legal-agent/legal-agent.routes";
import ragRoutes from "../modules/rag/rag.routes";
import speechRoutes from "../modules/speech/speech.routes";
import "../common/middleware/auth.google";
import authRoutes from "../modules/auth/auth.routes";


const router = Router();
console.log("API routes initialized");

router.get("/", (req, res) => {
  res.json({ message: "API v1" });
});


router.use("/users", userRoutes);
router.use("/documents", documentRoutes);
router.use("/analysis", analysisRoutes);
router.use("/legal-agent", legalAgentRoutes);
router.use("/rag", ragRoutes);
router.use("/speech", speechRoutes);
router.use("/auth", authRoutes)

export default router;