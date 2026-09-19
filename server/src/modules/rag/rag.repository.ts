import { prisma } from "../../config/db";

// Prisma has no native vector type, so the `embedding` column is declared
// `Unsupported("vector(1536)")` in schema.prisma — all reads/writes to it
// must go through raw SQL, unlike every other field on this model.
const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

export type KnowledgeSourceType = "GOV_STATUTE" | "GOV_JUDGMENT" | "GOV_GAZETTE" | "AGGREGATOR";

export interface ChunkInput {
    sourceUrl: string;
    sourceTitle: string;
    act?: string | null;
    section?: string | null;
    content: string;
    embedding: number[];
    publishedAt?: Date | null;
    contentHash: string;
    // Grounding metadata; omitted for the Indian Kanoon crawl, which keeps the
    // column defaults (AGGREGATOR / IN / en).
    sourceType?: KnowledgeSourceType;
    sourceDomain?: string | null;
    jurisdiction?: string;
    actShort?: string | null;
    sectionHeading?: string | null;
    language?: string;
    effectiveFrom?: Date | null;
}

export const upsertChunk = async (chunk: ChunkInput) => {
    const vectorLiteral = toVectorLiteral(chunk.embedding);

    // content_hash is unique, so a re-crawl of unchanged content is a no-op
    // instead of a duplicate row or a wasted embedding call.
    await prisma.$executeRaw`
    INSERT INTO legal_knowledge_chunks
      (source_url, source_title, act, section, content, embedding, published_at, content_hash,
       source_type, source_domain, jurisdiction, act_short, section_heading, language, effective_from)
    VALUES
      (${chunk.sourceUrl}, ${chunk.sourceTitle}, ${chunk.act ?? null}, ${chunk.section ?? null},
       ${chunk.content}, ${vectorLiteral}::vector, ${chunk.publishedAt ?? null}, ${chunk.contentHash},
       ${chunk.sourceType ?? "AGGREGATOR"}::"KnowledgeSourceType", ${chunk.sourceDomain ?? null},
       ${chunk.jurisdiction ?? "IN"}, ${chunk.actShort ?? null}, ${chunk.sectionHeading ?? null},
       ${chunk.language ?? "en"}, ${chunk.effectiveFrom ?? null})
    ON CONFLICT (content_hash) DO NOTHING
  `;
};

// Removes the previously ingested statute chunks for one Act so a re-ingest
// (e.g. after a parser fix) replaces them instead of leaving stale text behind.
export const deleteStatuteChunks = async (actShort: string, jurisdiction: string): Promise<number> =>
    prisma.$executeRaw`
    DELETE FROM legal_knowledge_chunks
    WHERE source_type = 'GOV_STATUTE'::"KnowledgeSourceType"
      AND act_short = ${actShort}
      AND jurisdiction = ${jurisdiction}
  `;

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

// ── Grounded retrieval (Connect Advocate) ───────────────────────────────────

export interface GroundedChunk {
    id: number;
    sourceUrl: string;
    sourceTitle: string;
    sourceType: KnowledgeSourceType;
    sourceDomain: string | null;
    jurisdiction: string;
    act: string | null;
    actShort: string | null;
    section: string | null;
    sectionHeading: string | null;
    content: string;
    distance: number;
}

const GROUNDED_COLUMNS = `id,
           source_url AS "sourceUrl",
           source_title AS "sourceTitle",
           source_type AS "sourceType",
           source_domain AS "sourceDomain",
           jurisdiction,
           act,
           act_short AS "actShort",
           section,
           section_heading AS "sectionHeading",
           content`;

export interface GroundedSearchFilters {
    jurisdictions: string[]; // e.g. ["IN"] or ["IN", "MH"]
    sourceTypes: KnowledgeSourceType[];
    k: number;
    /** Cosine distance ceiling (0 = identical); rows further away are never returned. */
    maxDistance: number;
    /** Acts (act_short) to leave out, e.g. the repealed codes for a current-law question. */
    excludeActs?: string[];
}

export const findGroundedChunks = async (
    embedding: number[],
    f: GroundedSearchFilters
): Promise<GroundedChunk[]> => {
    const vectorLiteral = toVectorLiteral(embedding);

    return prisma.$queryRawUnsafe<GroundedChunk[]>(
        `SELECT ${GROUNDED_COLUMNS},
                embedding <=> $1::vector AS distance
         FROM legal_knowledge_chunks
         WHERE source_type = ANY($2::"KnowledgeSourceType"[])
           AND jurisdiction = ANY($3::text[])
           AND embedding <=> $1::vector <= $4
           AND (act_short IS NULL OR act_short <> ALL($6::text[]))
         ORDER BY embedding <=> $1::vector
         LIMIT $5`,
        vectorLiteral,
        f.sourceTypes,
        f.jurisdictions,
        f.maxDistance,
        f.k,
        f.excludeActs ?? []
    );
};

// Exact lookup, used when the user or model names a specific provision
// ("Section 482 BNSS") — no embedding involved, so no chance of a near miss.
export const findSectionChunks = async (
    actShort: string,
    section: string,
    jurisdictions: string[]
): Promise<GroundedChunk[]> =>
    prisma.$queryRawUnsafe<GroundedChunk[]>(
        `SELECT ${GROUNDED_COLUMNS}, 0::float8 AS distance
         FROM legal_knowledge_chunks
         WHERE source_type = 'GOV_STATUTE'::"KnowledgeSourceType"
           AND act_short = $1
           AND section = $2
           AND jurisdiction = ANY($3::text[])
         ORDER BY id`,
        actShort,
        section,
        jurisdictions
    );

export interface IngestedActSummary {
    actShort: string;
    act: string | null;
    jurisdiction: string;
    sections: number;
    chunks: number;
    sourceDomain: string | null;
}

export const summariseStatutes = async (): Promise<IngestedActSummary[]> => {
    const rows = await prisma.$queryRaw<
        { actShort: string; act: string | null; jurisdiction: string; sections: bigint; chunks: bigint; sourceDomain: string | null }[]
    >`
    SELECT act_short AS "actShort", max(act) AS act, jurisdiction,
           count(DISTINCT section)::bigint AS sections, count(*)::bigint AS chunks,
           max(source_domain) AS "sourceDomain"
    FROM legal_knowledge_chunks
    WHERE source_type = 'GOV_STATUTE'::"KnowledgeSourceType"
    GROUP BY act_short, jurisdiction
    ORDER BY act_short
  `;
    return rows.map((r) => ({ ...r, sections: Number(r.sections), chunks: Number(r.chunks) }));
};

export const countChunks = async (): Promise<number> => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM legal_knowledge_chunks
  `;
    return Number(rows[0]?.count ?? 0);
};
