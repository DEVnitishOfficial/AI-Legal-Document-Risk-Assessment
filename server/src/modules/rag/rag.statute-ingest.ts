import { chunkSection, parseQuality, parseStatuteSections } from "./rag.statute-parser";
import { STATUTE_SOURCES, StatuteSource, getSource } from "./rag.sources";
import { embedTexts, hashContent } from "./rag.service";
import { deleteStatuteChunks, upsertChunk } from "./rag.repository";

const pdfParse = require("pdf-parse");

const MAX_PDF_BYTES = 40 * 1024 * 1024;
const EMBED_BATCH = 64;

export interface StatuteIngestResult {
    actShort: string;
    ok: boolean;
    sections?: number;
    chunks?: number;
    removedOld?: number;
    error?: string;
}

const downloadPdf = async (url: string): Promise<Buffer> => {
    const res = await fetch(url, {
        headers: { "User-Agent": "NyayMitraAI-ingest/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_PDF_BYTES) throw new Error("PDF is larger than the 40 MB limit");
    if (buf.subarray(0, 4).toString() !== "%PDF") throw new Error("Response is not a PDF");
    return buf;
};

export const ingestStatute = async (source: StatuteSource): Promise<StatuteIngestResult> => {
    try {
        const { text } = await pdfParse(await downloadPdf(source.url));
        const { sections, missing } = parseStatuteSections(text, source.expectedSections);

        // Refuse a partial Act: a silent gap would let the advocate say a
        // provision "doesn't exist". Nothing is written or deleted on failure.
        if (sections.length < source.expectedSections || missing.length > 0) {
            throw new Error(
                `Parsed ${sections.length}/${source.expectedSections} sections; missing: ${missing.slice(0, 20).join(", ")}`
            );
        }

        // Right count but no text under the numbers means the parser captured a
        // contents list. Legitimately short sections (repealed ones) are rare.
        const quality = parseQuality(sections);
        if (quality.shortShare > 0.25) {
            throw new Error(
                `${quality.tooShort}/${sections.length} sections have almost no text — the parser likely captured a contents list`
            );
        }

        // One record per stored chunk. The "Act — Section N" prefix keeps each
        // chunk self-describing once it is retrieved out of context, and helps
        // queries that name the Act or section match the right rows.
        const records = sections.flatMap((s) => {
            const parts = chunkSection(s.text);
            return parts.map((part, i) => ({
                section: s.number,
                content: `${source.actName} — Section ${s.number}${parts.length > 1 ? ` (part ${i + 1}/${parts.length})` : ""}\n${part}`,
            }));
        });

        const embeddings: number[][] = [];
        for (let i = 0; i < records.length; i += EMBED_BATCH) {
            embeddings.push(...(await embedTexts(records.slice(i, i + EMBED_BATCH).map((r) => r.content))));
        }

        // Replace the previous version only after everything above succeeded.
        const removedOld = await deleteStatuteChunks(source.actShort, source.jurisdiction);
        for (let i = 0; i < records.length; i++) {
            await upsertChunk({
                sourceUrl: source.url,
                sourceTitle: source.actName,
                act: source.actName,
                actShort: source.actShort,
                section: records[i].section,
                content: records[i].content,
                embedding: embeddings[i],
                contentHash: hashContent(`${source.actShort}|${source.jurisdiction}|${records[i].section}|${records[i].content}`),
                sourceType: "GOV_STATUTE",
                sourceDomain: source.sourceDomain,
                jurisdiction: source.jurisdiction,
                language: "en",
                effectiveFrom: source.effectiveFrom ? new Date(source.effectiveFrom) : null,
            });
        }

        return { actShort: source.actShort, ok: true, sections: sections.length, chunks: records.length, removedOld };
    } catch (err) {
        return { actShort: source.actShort, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
};

// Ingests the named Acts (or every registered Act), one at a time.
export const ingestStatutes = async (actShorts?: string[]): Promise<StatuteIngestResult[]> => {
    const sources = actShorts?.length
        ? actShorts.map((a) => getSource(a)).filter((s): s is StatuteSource => !!s)
        : STATUTE_SOURCES;

    const results: StatuteIngestResult[] = [];
    for (const source of sources) results.push(await ingestStatute(source));

    const unknown = (actShorts ?? []).filter((a) => !getSource(a));
    for (const a of unknown) results.push({ actShort: a, ok: false, error: "Not in the source registry" });
    return results;
};
