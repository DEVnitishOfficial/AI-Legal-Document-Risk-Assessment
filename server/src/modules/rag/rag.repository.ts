import { prisma } from "../../config/db";

// Prisma has no native vector type, so the `embedding` column is declared
// `Unsupported("vector(1536)")` in schema.prisma — all reads/writes to it
// must go through raw SQL, unlike every other field on this model.
const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

export interface ChunkInput {
    sourceUrl: string;
    sourceTitle: string;
    act?: string | null;
    section?: string | null;
    content: string;
    embedding: number[];
    publishedAt?: Date | null;
    contentHash: string;
}

export const upsertChunk = async (chunk: ChunkInput) => {
    const vectorLiteral = toVectorLiteral(chunk.embedding);

    // content_hash is unique, so a re-crawl of unchanged content is a no-op
    // instead of a duplicate row or a wasted embedding call.
    await prisma.$executeRaw`
    INSERT INTO legal_knowledge_chunks
      (source_url, source_title, act, section, content, embedding, published_at, content_hash)
    VALUES
      (${chunk.sourceUrl}, ${chunk.sourceTitle}, ${chunk.act ?? null}, ${chunk.section ?? null},
       ${chunk.content}, ${vectorLiteral}::vector, ${chunk.publishedAt ?? null}, ${chunk.contentHash})
    ON CONFLICT (content_hash) DO NOTHING
  `;
};

export interface RetrievedChunk {
    id: number;
    sourceUrl: string;
    sourceTitle: string;
    act: string | null;
    section: string | null;
    content: string;
    distance: number;
}

export const findSimilarChunks = async (
    embedding: number[],
    k: number
): Promise<RetrievedChunk[]> => {
    const vectorLiteral = toVectorLiteral(embedding);

    return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT id,
           source_url AS "sourceUrl",
           source_title AS "sourceTitle",
           act,
           section,
           content,
           embedding <=> ${vectorLiteral}::vector AS distance
    FROM legal_knowledge_chunks
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${k}
  `;
};

export const countChunks = async (): Promise<number> => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM legal_knowledge_chunks
  `;
    return Number(rows[0]?.count ?? 0);
};
