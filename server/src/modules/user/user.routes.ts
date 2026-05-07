import { Router } from "express";
import { login, register } from "./user.controller";
import { Request, Response } from "express";
import { User } from "../../types/userType";
import { authMiddleware } from "../../common/middleware/auth.middleware";

// interface authMiddlewareRequest extends Request {
//   user?: User; 
// }

const router = Router();
console.log("User routes initialized");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;