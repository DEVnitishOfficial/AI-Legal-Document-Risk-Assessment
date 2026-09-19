import { Request, Response, NextFunction } from "express";
import { crawlAndIngest, ingestFromQueries } from "./rag.ingest";
import { countChunks, summariseStatutes } from "./rag.repository";
import { ingestStatutes } from "./rag.statute-ingest";
import { STATUTE_SOURCES } from "./rag.sources";
import { syncAiKnowledgeCredentials } from "../advocate/advocate.service";

export const runIngest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Access is enforced by the route (requireAdmin) — this used to be a
        // shared x-ingest-secret header, before the platform had an admin role.

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

// Official-statute ingestion (admin). Downloads the registered gazette PDFs,
// which costs OpenAI embedding credits but no Firecrawl credits.
export const runStatuteIngest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const acts = Array.isArray(req.body?.acts)
            ? req.body.acts.filter((a: unknown): a is string => typeof a === "string")
            : undefined;

        const results = await ingestStatutes(acts);
        if (results.some((r) => r.ok)) await syncAiKnowledgeCredentials(await summariseStatutes());

        res.json({ success: true, data: { results } });
    } catch (err) {
        next(err);
    }
};

export const getStatuteStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: {
                loaded: await summariseStatutes(),
                registered: STATUTE_SOURCES.map(({ actShort, actName, expectedSections, url }) => ({
                    actShort,
                    actName,
                    expectedSections,
                    url,
                })),
            },
        });
    } catch (err) {
        next(err);
    }
};
