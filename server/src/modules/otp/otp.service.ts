import crypto from "crypto";
import bcrypt from "bcrypt";
import * as otpRepo from "./otp.repository";
import * as userRepo from "../user/user.repository";
import { AppError } from "../../common/errors/AppError";
import { generateToken } from "../../common/utils/jwt";
import { sendOtpSms } from "./otp.sms";
import { env } from "../../config/env";
import { toSafeUser } from "../user/user.mapper";

const RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const sendOtp = async (phone: string) => {
  if (!phone || !PHONE_REGEX.test(phone)) {
    throw new AppError("Enter a valid mobile number", 400);
  }

  const latest = await otpRepo.findLatestOtpForPhone(phone);
  if (latest && Date.now() - latest.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError("Please wait before requesting another OTP", 429);
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await otpRepo.createOtp(phone, codeHash, expiresAt);
  await sendOtpSms(phone, code);

  const isDevMode = !env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID;
  return isDevMode ? { success: true, devCode: code } : { success: true };
};

export const verifyOtp = async (phone: string, code: string) => {
  if (!phone || !code) {
    throw new AppError("Phone and OTP code are required", 400);
  }

  const otp = await otpRepo.findLatestOtpForPhone(phone);
  if (!otp) {
    throw new AppError("OTP not requested or already used", 400);
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    throw new AppError("OTP expired, please request a new one", 400);
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new AppError("Too many attempts, please request a new OTP", 429);
  }

  const isMatch = await bcrypt.compare(code, otp.codeHash);
  if (!isMatch) {
    await otpRepo.incrementAttempts(otp.id);
    throw new AppError("Invalid OTP", 401);
  }

  await otpRepo.markConsumed(otp.id);

  let user = await userRepo.findUserByPhone(phone);
  if (!user) {
    user = await userRepo.createUser({
      name: "Mobile User",
      phone,
      password: "OTP_AUTH_USER",
    });
  }

  const token = generateToken({ id: user.id, email: user.email });

  return { user: toSafeUser(user), token };
};
