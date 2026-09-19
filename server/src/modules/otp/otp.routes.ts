import { Router } from "express";
import { sendOtpHandler, verifyOtpHandler } from "./otp.controller";

const router = Router();

router.post("/send", sendOtpHandler);
router.post("/verify", verifyOtpHandler);

export default router;
