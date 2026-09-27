import { z } from "zod";
import { phoneSchema } from "../../common/schemas/common.schema";

// Format/shape checks only — business rules (duplicate email/phone, wrong
// password) stay in user.service.ts, which needs the database to answer.
export const registerBodySchema = z.object({
    name: z
        .string({ error: "Name is required" })
        .trim()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or fewer"),
    email: z
        .string({ error: "Email is required" })
        .trim()
        .min(1, "Email is required")
        .email("Enter a valid email address"),
    phone: phoneSchema.optional().or(z.literal("")),
    password: z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(200, "Password is too long"),
});

export const loginBodySchema = z.object({
    email: z
        .string({ error: "Email is required" })
        .trim()
        .min(1, "Email is required")
        .email("Enter a valid email address"),
    password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});
