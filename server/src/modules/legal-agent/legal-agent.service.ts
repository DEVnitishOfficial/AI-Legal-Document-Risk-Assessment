import OpenAI from "openai";
import { env } from "../../config/env";
import { buildSystemPrompt, DISCLAIMER } from "./legal-agent.prompt";
import { retrieveRelevantChunks } from "../rag/rag.service";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface ChatTurn {
    role: "user" | "assistant";
    content: string;
}

export interface ClarifyResult {
    type: "clarify";
    question: string;
    options: string[];
}

export interface AnswerResult {
    type: "answer";
    content: string;
    citations: { title: string; url: string }[];
}

export type AgentResult = ClarifyResult | AnswerResult;

export const decideNextStep = async (
    history: ChatTurn[],
    language: "en" | "hi",
    documentContext: string = ""
): Promise<AgentResult> => {
    const latestUserMessage = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

    // RAG lookup is best-effort: an empty knowledge base (nothing ingested
    // yet) or a transient embedding failure shouldn't block the chat from
    // answering off the static legal knowledge baked into the system prompt.
    let ragContext = "";
    try {
        const chunks = await retrieveRelevantChunks(latestUserMessage, 4);
        ragContext = chunks
            .map((c) => `[${c.sourceTitle}](${c.sourceUrl}): ${c.content.slice(0, 500)}`)
            .join("\n\n");
    } catch (err) {
        console.error("RAG retrieval failed, continuing without it:", err);
    }

    const systemPrompt = buildSystemPrompt(language, ragContext, documentContext);

    const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
            { role: "system", content: systemPrompt },
            ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        ],
        response_format: { type: "json_object" },
    });

    const output = response.choices[0].message.content;

    let parsed: any;
    try {
        const cleanOutput = output?.replace(/```json/g, "")?.replace(/```/g, "")?.trim();
        parsed = JSON.parse(cleanOutput || "{}");
    } catch (error) {
        console.error("Failed to parse legal-agent AI response:", output);
        throw new Error("Invalid AI response format");
    }

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
    const citations = Array.isArray(parsed.citations)
        ? parsed.citations
              .filter((c: any) => c && typeof c.title === "string" && typeof c.url === "string")
              .map((c: any) => ({ title: c.title, url: c.url }))
        : [];

    // Disclaimer is appended server-side unconditionally, not left to the
    // model's discretion — same defense-in-depth approach as the
    // deterministically-derived riskScore in the document analysis pipeline.
    return {
        type: "answer",
        content: `${content}\n\n_${DISCLAIMER}_`,
        citations,
    };
};
