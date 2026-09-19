// Grounded legal retrieval for the AI advocate.
//
// Rules this module enforces in code (a prompt alone cannot):
//  * only government-sourced text is returned — aggregator rows are excluded;
//  * the client's state is injected by the server, never chosen by the model;
//  * nothing below the similarity threshold is returned, so "no answer" is a
//    real outcome the advocate has to handle honestly;
//  * every provision the advocate states can be checked against what was
//    actually retrieved (verifyCitations).

import { embedText } from "./rag.service";
import {
    findGroundedChunks,
    findSectionChunks,
    GroundedChunk,
    KnowledgeSourceType,
} from "./rag.repository";
import { actsExcludedForEra, LawEra, LEGACY_ACT_ALIASES, STATUTE_SOURCES } from "./rag.sources";

const GOVERNMENT_SOURCE_TYPES: KnowledgeSourceType[] = ["GOV_STATUTE", "GOV_JUDGMENT", "GOV_GAZETTE"];

// 0.30 comes from the golden-set calibration (npm run rag:eval): the weakest
// correct hit scored 0.336, clearly unrelated questions stay below ~0.2. A
// cutoff can't separate "adjacent topic" from "answerable" — that judgement
// stays with the model's prompt and the citation verifier.
export const DEFAULT_RAG = { k: 6, minSimilarity: 0.3 };

export interface LawPassage {
    /** Stable within one search result, e.g. "P1". */
    id: string;
    /** Human label, e.g. "BNSS s.482". */
    citation: string;
    actShort: string | null;
    act: string | null;
    section: string | null;
    text: string;
    sourceUrl: string;
    sourceDomain: string | null;
    jurisdiction: string;
    /** 1 = identical. Exact section lookups are 1. */
    similarity: number;
    exact: boolean;
}

export interface GroundedOptions {
    /** Two-letter state code (e.g. "MH"); central law ("IN") is always included. */
    state?: string | null;
    k?: number;
    minSimilarity?: number;
    sourceTypes?: KnowledgeSourceType[];
    /** Criminal-law regime; defaults to "current" (BNS/BNSS/BSA) so repealed codes are never quoted as current. */
    era?: LawEra;
}

// ── Citation parsing (shared by retrieval and the verifier) ─────────────────

interface ActAlias {
    alias: string;
    actShort: string;
    ingested: boolean;
}

const ACT_ALIASES: ActAlias[] = [
    ...STATUTE_SOURCES.flatMap((s) => s.aliases.map((alias) => ({ alias, actShort: s.actShort, ingested: true }))),
    ...Object.entries(LEGACY_ACT_ALIASES).flatMap(([actShort, aliases]) =>
        aliases.map((alias) => ({ alias, actShort, ingested: false }))
    ),
].sort((a, b) => b.alias.length - a.alias.length); // longest first so "BNSS" beats "BNS"

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ACT_RE = ACT_ALIASES.map((a) => escapeRe(a.alias)).join("|");
const NUM = String.raw`\d{1,3}[A-Za-z]?(?:\s*\([^)]{1,6}\))*`;
const NUM_LIST = String.raw`${NUM}(?:\s*(?:,|and|&|to)\s*${NUM})*`;

// "Section 103 of BNS", "Sections 103 and 105 of the Bharatiya Nyaya Sanhita"
const SECTION_THEN_ACT = new RegExp(
    String.raw`\b(?:sections?|secs?\.?|s\.|§)\s*(${NUM_LIST})\s*(?:,\s*)?(?:of\s+|under\s+)?(?:the\s+)?(${ACT_RE})(?![a-z])`,
    "gi"
);
// "BNS Section 103", "BNSS, s. 482"
const ACT_THEN_SECTION = new RegExp(
    String.raw`(?<![a-z])(${ACT_RE})\s*,?\s*(?:sections?|secs?\.?|s\.|§)\s*(${NUM_LIST})`,
    "gi"
);

const resolveAlias = (text: string): ActAlias | undefined =>
    ACT_ALIASES.find((a) => a.alias === text.toLowerCase().replace(/\s+/g, " ").trim());

// "103(1)" → "103"; "43a" → "43A"
const baseSection = (n: string) => n.replace(/\s*\(.*$/, "").toUpperCase();

export interface SectionRef {
    actShort: string;
    section: string;
    ingested: boolean;
    /** The text as the speaker wrote it. */
    raw: string;
}

export const extractSectionRefs = (text: string): SectionRef[] => {
    const refs: SectionRef[] = [];
    const seen = new Set<string>();

    const add = (numberList: string, actText: string, raw: string) => {
        const alias = resolveAlias(actText);
        if (!alias) return;
        for (const num of numberList.split(/\s*(?:,|and|&|to)\s*(?=\d)/i)) {
            const section = baseSection(num.trim());
            if (!section) continue;
            const key = `${alias.actShort}|${section}`;
            if (seen.has(key)) continue;
            seen.add(key);
            refs.push({ actShort: alias.actShort, section, ingested: alias.ingested, raw });
        }
    };

    for (const m of text.matchAll(SECTION_THEN_ACT)) add(m[1], m[2], m[0]);
    for (const m of text.matchAll(ACT_THEN_SECTION)) add(m[2], m[1], m[0]);
    return refs;
};

// ── Retrieval ───────────────────────────────────────────────────────────────

const toPassage = (c: GroundedChunk, index: number, exact: boolean): LawPassage => ({
    id: `P${index + 1}`,
    citation: c.actShort && c.section ? `${c.actShort} s.${c.section}` : c.sourceTitle,
    actShort: c.actShort,
    act: c.act,
    section: c.section,
    text: c.content,
    sourceUrl: c.sourceUrl,
    sourceDomain: c.sourceDomain,
    jurisdiction: c.jurisdiction,
    similarity: exact ? 1 : Math.max(0, 1 - c.distance),
    exact,
});

export const jurisdictionsFor = (state?: string | null): string[] =>
    state && /^[A-Za-z]{2}$/.test(state) ? ["IN", state.toUpperCase()] : ["IN"];

export const retrieveGrounded = async (query: string, options: GroundedOptions = {}): Promise<LawPassage[]> => {
    const k = options.k ?? DEFAULT_RAG.k;
    const minSimilarity = options.minSimilarity ?? DEFAULT_RAG.minSimilarity;
    const jurisdictions = jurisdictionsFor(options.state);
    const sourceTypes = options.sourceTypes ?? GOVERNMENT_SOURCE_TYPES;

    // 1. Provisions the query names outright are fetched exactly — no chance
    //    of a near-miss section from the embedding search.
    const exact: GroundedChunk[] = [];
    for (const ref of extractSectionRefs(query).filter((r) => r.ingested)) {
        exact.push(...(await findSectionChunks(ref.actShort, ref.section, jurisdictions)));
    }

    // 2. Semantic search, filtered by jurisdiction + source type, thresholded.
    const embedding = await embedText(query);
    const semantic = await findGroundedChunks(embedding, {
        jurisdictions,
        sourceTypes,
        k,
        maxDistance: 1 - minSimilarity,
        excludeActs: actsExcludedForEra(options.era ?? "current"),
    });

    const seen = new Set<number>();
    const merged: { chunk: GroundedChunk; exact: boolean }[] = [];
    for (const chunk of exact) if (!seen.has(chunk.id)) (seen.add(chunk.id), merged.push({ chunk, exact: true }));
    for (const chunk of semantic) if (!seen.has(chunk.id)) (seen.add(chunk.id), merged.push({ chunk, exact: false }));

    return merged.slice(0, Math.max(k, exact.length)).map((m, i) => toPassage(m.chunk, i, m.exact));
};

// ── Tool the live advocate calls ────────────────────────────────────────────

export const SEARCH_LAW_TOOL = {
    type: "function" as const,
    name: "search_law",
    description:
        "Search the official Indian statute text (BNS, BNSS, BSA and other ingested government sources) for provisions relevant to the client's situation. " +
        "You MUST call this before stating any section number, punishment, procedure or time limit. Pass the legal issue in plain words, or name a provision (e.g. 'Section 482 BNSS'). " +
        "Only cite what this tool returns.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The legal issue or provision to look up." },
            era: {
                type: "string",
                enum: ["current", "before_2024_07_01"],
                description:
                    "Criminal-law regime. Use 'current' when the offence happened on or after 1 July 2024 (BNS/BNSS/BSA). " +
                    "Use 'before_2024_07_01' for earlier offences (IPC/CrPC/Evidence Act). Ask the client when it happened if you do not know. Civil laws are unaffected.",
            },
        },
        required: ["query"],
        additionalProperties: false,
    },
};

export interface SearchLawResult {
    found: boolean;
    passages: LawPassage[];
    /** Instruction for the model, not shown to the client. */
    note: string;
}

export const searchLaw = async (
    query: string,
    ctx: { state?: string | null; k?: number; minSimilarity?: number; era?: LawEra }
): Promise<SearchLawResult> => {
    const passages = await retrieveGrounded(query, ctx);

    if (passages.length === 0) {
        return {
            found: false,
            passages: [],
            note:
                "No sufficiently relevant provision was found in the knowledge base. Do NOT state a section number or punishment from memory. " +
                "Tell the client you cannot confirm the exact provision, and advise them to consult an enrolled advocate.",
        };
    }

    return {
        found: true,
        passages,
        note: "Cite only the provisions in `passages`, using their `citation` label. Do not add section numbers that are not listed here.",
    };
};

// ── Citation verification ───────────────────────────────────────────────────

export type CitationStatus = "verified" | "unverified_not_retrieved" | "unverified_act_not_loaded";

export interface CheckedCitation {
    actShort: string;
    section: string;
    status: CitationStatus;
    raw: string;
}

// Compares every "Section N of <Act>" in what the advocate said against the
// passages actually retrieved in this consultation.
export const verifyCitations = (
    advocateText: string,
    retrieved: Pick<LawPassage, "actShort" | "section">[]
): CheckedCitation[] => {
    const shown = new Set(retrieved.filter((p) => p.actShort && p.section).map((p) => `${p.actShort}|${p.section}`));

    return extractSectionRefs(advocateText).map((ref) => ({
        actShort: ref.actShort,
        section: ref.section,
        raw: ref.raw,
        status: !ref.ingested
            ? "unverified_act_not_loaded"
            : shown.has(`${ref.actShort}|${ref.section}`)
              ? "verified"
              : "unverified_not_retrieved",
    }));
};
