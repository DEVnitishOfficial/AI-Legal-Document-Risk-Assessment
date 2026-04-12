import { Router } from "express";
import { register } from "./user.controller";

const router = Router();
console.log("User routes initialized");

router.post("/register", register);

export default router;