import OpenAI from "openai";
import { env } from "../../config/env";
import { verifyCitations } from "../rag/rag.grounded";
import * as repo from "./consultation.repository";
import { DISCLAIMER } from "./consultation.constants";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const SUMMARY_MODEL = "gpt-4.1-mini";

interface RetrievedRef {
    citation: string;
    actShort: string | null;
    section: string | null;
    excerpt: string;
}

const SYSTEM = `You write a case summary for a client, from the transcript of a voice consultation with an AI legal guide for India.

Rules:
- Use ONLY what the client said and what the advocate said in the transcript. Do not add facts, advice or provisions that were not discussed.
- Mention a legal provision only if it appears in RETRIEVED PASSAGES. Refer to it as "Section N of <Act short name>". If the advocate said something not supported by those passages, leave it out.
- Never name a court judgment.
- If a section of the summary was not discussed, return an empty list or an empty string for it.
- Write for the client, in plain English, in the second person ("you").

Return JSON with exactly these keys:
{
  "situation": string,                 // 2-4 sentences: what happened, when, where, who
  "keyFacts": string[],                // dates, amounts, parties, documents mentioned
  "questionsAsked": string[],          // what the advocate asked the client
  "provisions": [{ "citation": string, "plainMeaning": string }],
  "options": [{ "title": string, "steps": string[], "forum": string, "timeline": string, "likelyReaction": string, "risks": string }],
  "recommendation": { "text": string, "rationale": string },
  "nextSteps": string[],
  "deadlines": string[],
  "openQuestions": string[]            // things the client should still find out or confirm with an advocate
}`;

const collectStrings = (v: unknown, out: string[] = []): string[] => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
    else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
    return out;
};

export const generateSummary = async (consultationId: number): Promise<void> => {
    try {
        const turns = await repo.allTurns(consultationId);
        const speech = turns.filter((t) => t.kind === "SPEECH");
        const userWords = speech.filter((t) => t.speaker === "USER").length;

        // Nothing meaningful was said (a call that dropped straight away).
        if (userWords < 1 || speech.length < 2) {
            await repo.updateConsultation(consultationId, { summaryStatus: "SKIPPED" });
            return;
        }

        const retrieved: RetrievedRef[] = turns
            .filter((t) => t.kind === "SEARCH")
            .flatMap((t) => (Array.isArray(t.citations) ? (t.citations as unknown as RetrievedRef[]) : []));
        const uniqueRetrieved = [...new Map(retrieved.map((r) => [r.citation, r])).values()];

        const transcript = speech.map((t) => `${t.speaker === "USER" ? "CLIENT" : "ADVOCATE"}: ${t.text}`).join("\n");
        const passages = uniqueRetrieved.map((r) => `[${r.citation}] ${r.excerpt}`).join("\n\n") || "(none retrieved)";

        const completion = await client.chat.completions.create({
            model: SUMMARY_MODEL,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content: `TRANSCRIPT:\n${transcript}\n\nRETRIEVED PASSAGES:\n${passages}` },
            ],
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

        // Same check as during the call: anything cited that was not retrieved is flagged.
        const checked = verifyCitations(
            collectStrings(parsed).join("\n"),
            uniqueRetrieved.map((r) => ({ actShort: r.actShort, section: r.section }))
        );

        await repo.updateConsultation(consultationId, {
            summary: {
                ...parsed,
                provisionsChecked: checked.map(({ actShort, section, status }) => ({ actShort, section, status })),
                unverifiedMentions: checked.filter((c) => c.status !== "verified").map((c) => `${c.actShort} s.${c.section}`),
                disclaimer: DISCLAIMER,
                model: SUMMARY_MODEL,
                generatedAt: new Date().toISOString(),
            } as object,
            summaryStatus: "READY",
        });
    } catch (err) {
        console.error(`Summary failed for consultation ${consultationId}:`, err instanceof Error ? err.message : err);
        await repo.updateConsultation(consultationId, { summaryStatus: "FAILED" }).catch(() => undefined);
    }
};
