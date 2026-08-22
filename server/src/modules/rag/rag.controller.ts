import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { AppError } from "../../common/errors/AppError";
import { crawlAndIngest, ingestFromQueries } from "./rag.ingest";
import { countChunks } from "./rag.repository";

export const runIngest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const secret = req.headers["x-ingest-secret"];

        if (!secret || secret !== env.RAG_INGEST_SECRET) {
            throw new AppError("Not authorized to trigger ingestion", 403);
        }

        // Explicit URLs take priority (deliberate sources); otherwise search
        // for real content by query, falling back to the default seed
        // queries when neither is given.
        const results =
            Array.isArray(req.body?.urls) && req.body.urls.length > 0
                ? await crawlAndIngest(req.body.urls)
                : await ingestFromQueries(
                      Array.isArray(req.body?.queries) && req.body.queries.length > 0
                          ? req.body.queries
                          : undefined
                  );

        res.json({ success: true, data: { results } });
    } catch (err) {
        next(err);
    }
};

export const getIngestStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const totalChunks = await countChunks();
        res.json({ success: true, data: { totalChunks } });
    } catch (err) {
        next(err);
    }
};
