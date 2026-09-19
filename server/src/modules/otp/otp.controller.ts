import { Request, Response, NextFunction } from "express";
import * as otpService from "./otp.service";

export const sendOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await otpService.sendOtp(req.body.phone);
    res.status(200).json({ success: true, message: "OTP sent", data: result });
  } catch (err) {
    next(err);
  }
};

export const verifyOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await otpService.verifyOtp(req.body.phone, req.body.code);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
