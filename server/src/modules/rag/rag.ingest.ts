import Firecrawl from "@mendable/firecrawl-js";
import { env } from "../../config/env";
import { chunkText } from "./rag.chunk";
import { embedAndStoreChunk } from "./rag.service";

const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });

// A static listing/index page (e.g. a "browse by year" page) only contains
// navigation links, not substantive case content, so scrape-by-URL alone
// isn't a useful default. Search-based ingestion finds actual judgment /
// case-explainer pages on the target domain instead.
export const DEFAULT_SEED_QUERIES = [
    "Supreme Court India anticipatory bail landmark judgment",
    "Supreme Court India cybercrime bank fraud judgment",
    "Supreme Court India dowry harassment case judgment",
    "Supreme Court India false criminal case malicious prosecution",
];

export interface IngestResult {
    url: string;
    status: "ok" | "failed";
    chunksFound: number;
    error?: string;
}

const ingestMarkdownDoc = async (
    url: string,
    markdown: string,
    title: string,
    publishedTime?: string
): Promise<IngestResult> => {
    if (!markdown.trim()) {
        return { url, status: "failed", chunksFound: 0, error: "No content scraped" };
    }

    const chunks = chunkText(markdown);
    const publishedAt = publishedTime ? new Date(publishedTime) : null;

    for (const content of chunks) {
        await embedAndStoreChunk({ sourceUrl: url, sourceTitle: title, content, publishedAt });
    }

    return { url, status: "ok", chunksFound: chunks.length };
};

// Scrape specific, already-known URLs (e.g. a curated list of judgment
// pages) — kept for when the caller wants deliberate, explicit sources
// rather than a search.
export const crawlAndIngest = async (urls: string[]): Promise<IngestResult[]> => {
    const results: IngestResult[] = [];

    for (const url of urls) {
        try {
            const doc = await firecrawl.scrape(url, { formats: ["markdown"] });
            results.push(
                await ingestMarkdownDoc(
                    url,
                    doc.markdown ?? "",
                    doc.metadata?.title ?? url,
                    doc.metadata?.publishedTime
                )
            );
        } catch (err) {
            console.error(`RAG ingestion failed for ${url}:`, err);
            results.push({
                url,
                status: "failed",
                chunksFound: 0,
                error: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }

    return results;
};

// Search the web (scoped to indiankanoon.org) for a query and scrape each
// result — this is what actually finds real case-law content, since
// Indian Kanoon's static pages are mostly year/category indexes.
export const searchAndIngest = async (query: string, limit = 4): Promise<IngestResult[]> => {
    const results: IngestResult[] = [];

    try {
        const data = await firecrawl.search(query, {
            sources: ["web"],
            includeDomains: ["indiankanoon.org"],
            limit,
            scrapeOptions: { formats: ["markdown"] },
        });

        const webResults = data.web ?? [];

        for (const item of webResults) {
            const url = "url" in item ? item.url ?? "" : "";
            const markdown = "markdown" in item ? item.markdown ?? "" : "";
            const title = ("metadata" in item && item.metadata?.title) || ("title" in item && item.title) || url;
            const publishedTime = "metadata" in item ? item.metadata?.publishedTime : undefined;

            if (!url) continue;

            results.push(await ingestMarkdownDoc(url, markdown, title, publishedTime));
        }
    } catch (err) {
        console.error(`RAG search ingestion failed for query "${query}":`, err);
        results.push({
            url: `search:${query}`,
            status: "failed",
            chunksFound: 0,
            error: err instanceof Error ? err.message : "Unknown error",
        });
    }

    return results;
};

export const ingestFromQueries = async (queries: string[] = DEFAULT_SEED_QUERIES): Promise<IngestResult[]> => {
    const results: IngestResult[] = [];

    for (const query of queries) {
        results.push(...(await searchAndIngest(query)));
    }

    return results;
};
