import OpenAI from "openai";
import crypto from "crypto";
import { env } from "../../config/env";
import { upsertChunk, findSimilarChunks, RetrievedChunk } from "./rag.repository";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-3-small";

export const embedText = async (text: string): Promise<number[]> => {
    // text-embedding-3-small has an 8191-token limit; slice defensively the
    // same way analyzeDocument() bounds its input (see analysis.service.ts).
    const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000),
    });

    return response.data[0].embedding;
};

export const hashContent = (content: string): string =>
    crypto.createHash("sha256").update(content).digest("hex");

export interface ChunkToIngest {
    sourceUrl: string;
    sourceTitle: string;
    act?: string | null;
    section?: string | null;
    content: string;
    publishedAt?: Date | null;
}

export const embedAndStoreChunk = async (chunk: ChunkToIngest) => {
    const contentHash = hashContent(chunk.content);
    const embedding = await embedText(chunk.content);

    await upsertChunk({ ...chunk, embedding, contentHash });
};

export const retrieveRelevantChunks = async (
    query: string,
    k = 5
): Promise<RetrievedChunk[]> => {
    const embedding = await embedText(query);
    return findSimilarChunks(embedding, k);
};
