import { Router } from "express";
import { getMe, login, register } from "./user.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { loginBodySchema, registerBodySchema } from "./user.schema";

const router = Router();
console.log("User routes initialized");

router.post("/register", validate({ body: registerBodySchema }), register);
router.post("/login", validate({ body: loginBodySchema }), login);
router.get("/me", authMiddleware, getMe);

export default router;
