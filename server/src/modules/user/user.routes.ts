import { Router } from "express";
import { login, register } from "./user.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { Request, Response } from "express";
import { User } from "../../types/userType";

interface authMiddlewareRequest extends Request {
  user?: User; 
}

const router = Router();
console.log("User routes initialized");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, (req: authMiddlewareRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;