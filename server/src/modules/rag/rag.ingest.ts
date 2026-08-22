import Firecrawl from "@mendable/firecrawl-js";
import { env } from "../../config/env";
import { chunkText } from "./rag.chunk";
import { embedAndStoreChunk } from "./rag.service";

const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });

// Curated starting point — Indian Kanoon's Supreme Court judgment listing.
// Meant to be expanded/replaced with more specific listing/search URLs as
// the knowledge base matures; kept small and explicit rather than doing
// open-ended crawl discovery, so every ingested source is a deliberate choice.
export const DEFAULT_SEED_URLS = ["https://indiankanoon.org/browse/supremecourt/"];

export interface IngestResult {
    url: string;
    status: "ok" | "failed";
    chunksFound: number;
    error?: string;
}

export const crawlAndIngest = async (urls: string[] = DEFAULT_SEED_URLS): Promise<IngestResult[]> => {
    const results: IngestResult[] = [];

    for (const url of urls) {
        try {
            const doc = await firecrawl.scrape(url, { formats: ["markdown"] });
            const markdown = doc.markdown ?? "";

            if (!markdown.trim()) {
                results.push({ url, status: "failed", chunksFound: 0, error: "No content scraped" });
                continue;
            }

            const chunks = chunkText(markdown);
            const sourceTitle = doc.metadata?.title ?? url;
            const publishedAt = doc.metadata?.publishedTime
                ? new Date(doc.metadata.publishedTime)
                : null;

            for (const content of chunks) {
                await embedAndStoreChunk({
                    sourceUrl: url,
                    sourceTitle,
                    content,
                    publishedAt,
                });
            }

            results.push({ url, status: "ok", chunksFound: chunks.length });
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
