import { z } from "zod";

export const runAnalysisBodySchema = z.object({
    documentId: z.coerce
        .number({ error: "documentId is required" })
        .int("documentId must be a whole number")
        .positive("documentId must be a positive number"),
    // Only the client's first poll of a fresh "Analyze" click sets this —
    // see analysis.controller.ts for why a plain status-check poll must not.
    retry: z.boolean().optional().default(false),
});
