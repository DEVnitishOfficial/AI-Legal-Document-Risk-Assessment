import { Router } from "express";
import userRoutes from "../modules/user/user.routes";

const router = Router();
console.log("API routes initialized");

router.get("/", (req, res) => {
  res.json({ message: "API v1" });
});


router.use("/users", userRoutes);

export default router;