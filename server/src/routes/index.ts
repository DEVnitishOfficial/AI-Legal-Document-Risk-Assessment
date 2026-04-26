import { Router } from "express";
import userRoutes from "../modules/user/user.routes";
import documentRoutes from "../modules/document/document.routes";
import analysisRoutes from "../modules/analysis/analysis.route";


const router = Router();
console.log("API routes initialized");

router.get("/", (req, res) => {
  res.json({ message: "API v1" });
});


router.use("/users", userRoutes);
router.use("/documents", documentRoutes);
router.use("/analysis", analysisRoutes);

export default router;