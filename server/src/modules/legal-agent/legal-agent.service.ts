import OpenAI from "openai";
import { env } from "../../config/env";
import { buildSystemPrompt, buildRoutingPrompt, buildStreamingAnswerPrompt, DISCLAIMER } from "./legal-agent.prompt";
import { retrieveRelevantChunks } from "../rag/rag.service";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const MODEL = "gpt-4.1-mini";

export interface ChatTurn {
    role: "user" | "assistant";
    content: string;
}

export interface Citation {
    title: string;
    url: string;
}

export interface ClarifyResult {
    type: "clarify";
    question: string;
    options: string[];
}

export interface AnswerResult {
    type: "answer";
    content: string;
    citations: Citation[];
}

export type AgentResult = ClarifyResult | AnswerResult;

const getLatestUserMessage = (history: ChatTurn[]) =>
    [...history].reverse().find((m) => m.role === "user")?.content ?? "";

// RAG lookup is best-effort: an empty knowledge base (nothing ingested yet)
// or a transient embedding failure shouldn't block the chat from answering
// off the static legal knowledge baked into the system prompt.
export const getRagContext = async (query: string): Promise<string> => {
    try {
        const chunks = await retrieveRelevantChunks(query, 4);
        return chunks.map((c) => `[${c.sourceTitle}](${c.sourceUrl}): ${c.content.slice(0, 500)}`).join("\n\n");
    } catch (err) {
        console.error("RAG retrieval failed, continuing without it:", err);
        return "";
    }
};

// The model occasionally repeats the same source across a couple of
// citation entries — dedupe by URL and cap so the UI never has to render a
// runaway list.
const dedupeCitations = (rawCitations: Citation[]): Citation[] => {
    const seenUrls = new Set<string>();
    return rawCitations
        .filter((c) => (seenUrls.has(c.url) ? false : (seenUrls.add(c.url), true)))
        .slice(0, 5);
};

// Disclaimer is appended server-side unconditionally, not left to the
// model's discretion — same defense-in-depth approach as the
// deterministically-derived riskScore in the document analysis pipeline.
export const appendDisclaimer = (content: string): string => `${content}\n\n_${DISCLAIMER}_`;

const parseJsonResponse = (output: string | null): any => {
    try {
        const cleanOutput = output?.replace(/```json/g, "")?.replace(/```/g, "")?.trim();
        return JSON.parse(cleanOutput || "{}");
    } catch (error) {
        console.error("Failed to parse legal-agent AI response:", output);
        throw new Error("Invalid AI response format");
    }
};

// Single non-streaming call used by the voice-message path — decides
// clarify vs answer AND generates the full answer content together. Kept
// separate from the streaming routing/generation split below so voice
// messages (where transcription already blocks on a round trip) don't need
// the extra complexity of a second streamed call.
export const decideNextStep = async (
    history: ChatTurn[],
    language: "en" | "hi",
    documentContext: string = ""
): Promise<AgentResult> => {
    const ragContext = await getRagContext(getLatestUserMessage(history));
    const systemPrompt = buildSystemPrompt(language, ragContext, documentContext);

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        ],
        response_format: { type: "json_object" },
    });

    const parsed = parseJsonResponse(response.choices[0].message.content);

    // Never trust raw model output — allowlist-validate the shape before it
    // ever reaches the DB or the client, same discipline as analyzeDocument().
    if (parsed.type === "clarify" && typeof parsed.question === "string") {
        return {
            type: "clarify",
            question: parsed.question,
            options: Array.isArray(parsed.options)
                ? parsed.options.filter((o: unknown) => typeof o === "string").slice(0, 4)
                : [],
        };
    }

    const content = typeof parsed.content === "string" ? parsed.content : "";
    const rawCitations = Array.isArray(parsed.citations)
        ? parsed.citations
              .filter((c: any) => c && typeof c.title === "string" && typeof c.url === "string")
              .map((c: any) => ({ title: c.title, url: c.url }))
        : [];

    return {
        type: "answer",
        content: appendDisclaimer(content),
        citations: dedupeCitations(rawCitations),
    };
};

export interface RouteResult {
    type: "clarify" | "answer";
    question?: string;
    options?: string[];
    citations?: Citation[];
}

// Fast/cheap routing pass for the streaming text-message path: decides
// clarify vs answer and (for answer) which citations are relevant, but does
// NOT generate the answer prose — see streamAnswer().
export const routeMessage = async (
    history: ChatTurn[],
    language: "en" | "hi",
    documentContext: string,
    ragContext: string
): Promise<RouteResult> => {
    const systemPrompt = buildRoutingPrompt(language, ragContext, documentContext);

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        ],
        response_format: { type: "json_object" },
    });

    const parsed = parseJsonResponse(response.choices[0].message.content);

    if (parsed.type === "clarify" && typeof parsed.question === "string") {
        return {
            type: "clarify",
            question: parsed.question,
            options: Array.isArray(parsed.options)
                ? parsed.options.filter((o: unknown) => typeof o === "string").slice(0, 4)
                : [],
        };
    }

    const rawCitations = Array.isArray(parsed.citations)
        ? parsed.citations
              .filter((c: any) => c && typeof c.title === "string" && typeof c.url === "string")
              .map((c: any) => ({ title: c.title, url: c.url }))
        : [];

    return { type: "answer", citations: dedupeCitations(rawCitations) };
};

// Generates the final answer prose token-by-token for the streaming path.
// Plain-text completion (no response_format), since JSON mode and streaming
// don't combine into something a client can progressively render.
export async function* streamAnswer(
    history: ChatTurn[],
    language: "en" | "hi",
    documentContext: string,
    ragContext: string
): AsyncGenerator<string> {
    const systemPrompt = buildStreamingAnswerPrompt(language, ragContext, documentContext);

    const stream = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        ],
        stream: true,
    });

    for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta) yield delta;
    }
}
