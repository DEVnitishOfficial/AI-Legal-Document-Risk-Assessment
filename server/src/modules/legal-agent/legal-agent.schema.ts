import { z } from "zod";

const MAX_TITLE_LENGTH = 120;

// Silently coercing any non-"hi" value to "en" (the old inline
// `=== "hi" ? "hi" : "en"` pattern) would swallow a genuine typo/bug in the
// caller instead of reporting it — an unrecognized language is now a 400,
// same as everywhere else bad input is handled. Omitting the field entirely
// still defaults to "en", which was and remains the actual default.
const languageSchema = z.enum(["en", "hi"], { error: "language must be 'en' or 'hi'" });

export const createConversationBodySchema = z.object({
    language: languageSchema.optional().default("en"),
});

export const updateConversationBodySchema = z
    .object({
        language: languageSchema.optional(),
        title: z
            .string()
            .trim()
            .min(1, "Title cannot be empty")
            .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`)
            .optional(),
    })
    .refine((data) => data.title !== undefined || data.language !== undefined, {
        message: "Nothing to update — send a title or language",
    });

export const sendMessageBodySchema = z.object({
    content: z.string({ error: "content is required" }).trim().min(1, "content is required"),
});

export const attachDocumentBodySchema = z.object({
    documentId: z.coerce
        .number({ error: "documentId is required" })
        .int("documentId must be a whole number")
        .positive("documentId must be a positive number"),
});
