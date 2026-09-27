import { z } from "zod";

// Same 50-character minimum document.service.ts always enforced — moved
// here so it's caught before a request even reaches the service/database,
// and reported the same way every other route's bad input is.
export const createTextBodySchema = z.object({
    content: z
        .string({ error: "Pasted text is required" })
        .trim()
        .min(50, "Pasted text is too short. Please paste at least 50 characters."),
});

export const updateDocumentBodySchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Title cannot be empty")
            .max(120, "Title must be 120 characters or fewer")
            .optional(),
        isFavorite: z.boolean({ error: "isFavorite must be true or false" }).optional(),
    })
    .refine((data) => data.title !== undefined || data.isFavorite !== undefined, {
        message: "Nothing to update — send a title or isFavorite",
    });
