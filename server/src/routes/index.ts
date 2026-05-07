import { Router } from "express";
import userRoutes from "../modules/user/user.routes";
import documentRoutes from "../modules/document/document.routes";
import analysisRoutes from "../modules/analysis/analysis.route";
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
router.use("/auth", authRoutes)

export default router;