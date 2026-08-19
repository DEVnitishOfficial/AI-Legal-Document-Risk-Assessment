import { Router } from "express";
import { getMe, login, register } from "./user.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";

const router = Router();
console.log("User routes initialized");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

export default router;