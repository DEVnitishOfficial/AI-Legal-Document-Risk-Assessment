import { Router } from "express";
import { sendOtpHandler, verifyOtpHandler } from "./otp.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { sendOtpBodySchema, verifyOtpBodySchema } from "./otp.schema";

const router = Router();

router.post("/send", validate({ body: sendOtpBodySchema }), sendOtpHandler);
router.post("/verify", validate({ body: verifyOtpBodySchema }), verifyOtpHandler);

export default router;
