import { z } from "zod";

// Shared with otp.service.ts's own copy of this pattern (kept as the single
// source of truth here; otp.service.ts's business-logic checks — cooldown,
// expiry, attempt limits — stay where they are, only the format check moved).
export const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
export const phoneSchema = z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Enter a valid mobile number");

// A route param string coerced to a real, positive integer id. Reused by
// every :id-shaped route (documents, conversations, messages, ...).
//
// Before this existed, several handlers did `Number(req.params.id)` with no
// check at all — a non-numeric id (e.g. a typo'd or hand-crafted URL) became
// NaN, and NaN reaching a Prisma `where: { id: NaN }` query throws an
// unhandled Prisma validation error: a raw 500, not a clean 400.
export const idParamSchema = (paramName = "id") =>
    z.object({
        [paramName]: z.coerce
            .number({ error: `${paramName} must be a number` })
            .int(`${paramName} must be a whole number`)
            .positive(`${paramName} must be a positive number`),
    });
