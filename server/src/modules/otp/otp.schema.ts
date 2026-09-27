import { z } from "zod";
import { phoneSchema } from "../../common/schemas/common.schema";

export const sendOtpBodySchema = z.object({
    phone: phoneSchema,
});

export const verifyOtpBodySchema = z.object({
    phone: phoneSchema,
    code: z
        .string({ error: "Enter the code you received" })
        .trim()
        .regex(/^\d{6}$/, "Enter the 6-digit code you received"),
});
