import { prisma } from "../../config/db";

export const createOtp = async (phone: string, codeHash: string, expiresAt: Date) => {
  return prisma.otpVerification.create({
    data: { phone, codeHash, expiresAt },
  });
};

export const findLatestOtpForPhone = async (phone: string) => {
  return prisma.otpVerification.findFirst({
    where: { phone, consumed: false },
    orderBy: { createdAt: "desc" },
  });
};

export const incrementAttempts = async (id: number) => {
  return prisma.otpVerification.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
};

export const markConsumed = async (id: number) => {
  return prisma.otpVerification.update({
    where: { id },
    data: { consumed: true },
  });
};
