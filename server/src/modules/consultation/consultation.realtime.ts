// Server side of a live voice call.
//
// The browser talks to OpenAI directly over WebRTC (audio), but the server
// brokers the call: it builds the session config (so the API key and the
// instructions never reach the browser), and then attaches a second
// "sideband" WebSocket to the same call. Everything that must be trusted
// happens on that channel — running search_law, recording the transcript,
// checking citations, enforcing time limits and hanging up.

import WebSocket from "ws";
import { env } from "../../config/env";
import { searchLaw, SEARCH_LAW_TOOL, verifyCitations } from "../rag/rag.grounded";
import * as repo from "./consultation.repository";
import { generateSummary } from "./consultation.summary";
import {
    CORRECTION_INSTRUCTION,
    OPENING_INSTRUCTION,
    WRAP_UP_INSTRUCTION,
} from "./consultation.prompt";
import {
    IDLE_TIMEOUT_MS,
    MAX_CORRECTIONS_PER_SESSION,
    MAX_TURN_CHARS,
    WRAP_UP_WARNING_MS,
} from "./consultation.constants";

const REALTIME_URL = "https://api.openai.com/v1/realtime";
const RECONNECT_LIMIT = 2;

export interface SessionParams {
    consultationId: number;
    userId: number;
    model: string;
    voice: string;
    instructions: string;
    /** Transcription language hint, e.g. "en" | "hi". */
    languageCode: string;
    /** Two-letter state code, injected into every search (the model cannot change it). */
    state: string;
    limitMs: number;
    ragK: number;
    ragMinSimilarity: number;
}

export const buildSessionConfig = (p: SessionParams) => ({
    type: "realtime",
    model: p.model,
    instructions: p.instructions,
    output_modalities: ["audio"],
    max_output_tokens: 800,
    tool_choice: "auto",
    tools: [SEARCH_LAW_TOOL],
    audio: {
        input: {
            transcription: { model: "gpt-4o-transcribe", language: p.languageCode },
            // Low eagerness: don't cut in while the client is still thinking or speaking slowly.
            turn_detection: { type: "semantic_vad", eagerness: "low" },
            noise_reduction: { type: "near_field" },
        },
        output: { voice: p.voice },
    },
});

// The browser's SDP offer goes to OpenAI from here, together with the
// server-built session, so the key and prompt stay on the server.
export const negotiateCall = async (sdpOffer: string, config: object): Promise<{ answerSdp: string; callId: string }> => {
    const form = new FormData();
    form.set("sdp", sdpOffer);
    form.set("session", JSON.stringify(config));

    const res = await fetch(`${REALTIME_URL}/calls`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`OpenAI realtime call failed (${res.status}): ${body.slice(0, 300)}`);

    const callId = (res.headers.get("location") ?? "").split("/").pop() ?? "";
    if (!callId) throw new Error("OpenAI did not return a call id");
    return { answerSdp: body, callId };
};

export const hangupCall = async (callId: string): Promise<void> => {
    try {
        await fetch(`${REALTIME_URL}/calls/${encodeURIComponent(callId)}/hangup`, {
            method: "POST",
            headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
            signal: AbortSignal.timeout(10_000),
        });
    } catch {
        // Best effort: an already-ended call, or a network blip, is not an error.
    }
};

// ── Live sessions ───────────────────────────────────────────────────────────

interface LiveSession {
    params: SessionParams;
    callId: string;
    startedAt: number;
    ws?: WebSocket;
    retrieved: { actShort: string | null; section: string | null }[];
    lastUserSpeech: number;
    corrections: number;
    reconnects: number;
    ended: boolean;
    introduced: boolean;
    timers: NodeJS.Timeout[];
    usage: { limitSec: number; responses: number; inputTokens: number; outputTokens: number };
    noticed: Set<string>;
}

const live = new Map<number, LiveSession>();

export const isLive = (consultationId: number) => live.has(consultationId);
export const liveCount = () => live.size;

const send = (s: LiveSession, event: object) => {
    if (s.ws?.readyState === WebSocket.OPEN) s.ws.send(JSON.stringify(event));
};

// A system message plus a response: the way the server steers the advocate
// mid-call without replacing the session instructions.
const nudge = (s: LiveSession, text: string) => {
    send(s, {
        type: "conversation.item.create",
        item: { type: "message", role: "system", content: [{ type: "input_text", text }] },
    });
    send(s, { type: "response.create" });
};

const record = async (
    s: LiveSession,
    speaker: "USER" | "ADVOCATE" | "SYSTEM",
    kind: "SPEECH" | "SEARCH" | "NOTICE",
    text: string,
    citations?: object
) => {
    try {
        await repo.addTurn({
            consultationId: s.params.consultationId,
            speaker,
            kind,
            text: text.slice(0, MAX_TURN_CHARS),
            citations: citations as never,
            atMs: Date.now() - s.startedAt,
        });
    } catch (err) {
        console.error("Failed to save consultation turn:", err instanceof Error ? err.message : err);
    }
};

const notice = (s: LiveSession, key: string, text: string) => {
    if (s.noticed.has(key)) return;
    s.noticed.add(key);
    void record(s, "SYSTEM", "NOTICE", text);
};

const runSearchTool = async (s: LiveSession, ev: { call_id: string; name: string; arguments?: string }) => {
    let output: object;

    if (ev.name !== "search_law") {
        output = { error: `Unknown tool ${ev.name}` };
    } else {
        let args: { query?: unknown; era?: unknown } = {};
        try {
            args = JSON.parse(ev.arguments || "{}");
        } catch {
            /* falls through to the empty-query answer */
        }
        const query = typeof args.query === "string" ? args.query.trim().slice(0, 500) : "";
        const era = args.era === "before_2024_07_01" ? "before_2024_07_01" : "current";

        if (!query) {
            output = { found: false, passages: [], note: "The query was empty. Call search_law again with the legal issue." };
        } else {
            try {
                const result = await searchLaw(query, {
                    state: s.params.state === "IN" ? null : s.params.state,
                    k: s.params.ragK,
                    minSimilarity: s.params.ragMinSimilarity,
                    era,
                });
                s.retrieved.push(...result.passages.map((p) => ({ actShort: p.actShort, section: p.section })));

                await record(
                    s,
                    "SYSTEM",
                    "SEARCH",
                    `Looked up: ${query}${era === "before_2024_07_01" ? " (offence before 1 July 2024)" : ""}`,
                    result.passages.map((p) => ({
                        citation: p.citation,
                        actShort: p.actShort,
                        section: p.section,
                        sourceUrl: p.sourceUrl,
                        sourceDomain: p.sourceDomain,
                        similarity: Number(p.similarity.toFixed(3)),
                        excerpt: p.text.slice(0, 500),
                    }))
                );

                output = {
                    found: result.found,
                    passages: result.passages.map((p) => ({ id: p.id, citation: p.citation, text: p.text })),
                    note: result.note,
                };
            } catch (err) {
                console.error("search_law failed:", err instanceof Error ? err.message : err);
                output = {
                    found: false,
                    passages: [],
                    note: "The law lookup failed. Do not state any provision. Tell the client you cannot confirm it right now and suggest an enrolled advocate.",
                };
            }
        }
    }

    send(s, {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: ev.call_id, output: JSON.stringify(output) },
    });
    send(s, { type: "response.create" });
};

// Every provision the advocate said out loud is checked against what was
// actually retrieved. One that was not retrieved (and belongs to a loaded Act)
// makes the advocate verify it and correct itself.
const checkAdvocateSpeech = async (s: LiveSession, text: string) => {
    const checked = verifyCitations(text, s.retrieved);
    await record(
        s,
        "ADVOCATE",
        "SPEECH",
        text,
        checked.map(({ actShort, section, status }) => ({ actShort, section, status }))
    );

    // A long system prompt is not enough to stop the model repeating its
    // introduction whenever the client says "hello" again, so once it has been
    // given, say so in the recent context (no response is triggered by this).
    if (!s.introduced) {
        s.introduced = true;
        send(s, {
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "system",
                content: [
                    {
                        type: "input_text",
                        text: "You have already introduced yourself and given the AI and transcription notice. Do not say it again for the rest of the call unless the client asks who or what you are.",
                    },
                ],
            },
        });
    }

    const unverified = checked.filter((c) => c.status === "unverified_not_retrieved");
    if (unverified.length > 0 && s.corrections < MAX_CORRECTIONS_PER_SESSION) {
        s.corrections++;
        nudge(s, CORRECTION_INSTRUCTION(unverified.map((c) => `section ${c.section} of the ${c.actShort}`)));
    }
};

const handleEvent = async (s: LiveSession, raw: WebSocket.RawData) => {
    let ev: any;
    try {
        ev = JSON.parse(raw.toString());
    } catch {
        return;
    }

    switch (ev.type) {
        case "conversation.item.input_audio_transcription.completed": {
            const text = String(ev.transcript ?? "").trim();
            if (text) {
                s.lastUserSpeech = Date.now();
                await record(s, "USER", "SPEECH", text);
            }
            break;
        }
        case "response.output_audio_transcript.done": {
            const text = String(ev.transcript ?? "").trim();
            if (text) await checkAdvocateSpeech(s, text);
            break;
        }
        case "response.function_call_arguments.done":
            await runSearchTool(s, ev);
            break;
        case "response.done": {
            const u = ev.response?.usage;
            s.usage.responses++;
            s.usage.inputTokens += u?.input_tokens ?? 0;
            s.usage.outputTokens += u?.output_tokens ?? 0;
            break;
        }
        case "error":
            console.error(`Realtime error (consultation ${s.params.consultationId}):`, JSON.stringify(ev.error));
            notice(s, `err:${ev.error?.code ?? "unknown"}`, "The connection to the advocate had a problem. If you cannot hear a reply, end the call and start again.");
            break;
    }
};

const attach = (s: LiveSession, isReconnect: boolean) => {
    const ws = new WebSocket(`${REALTIME_URL}?call_id=${encodeURIComponent(s.callId)}`, {
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });
    s.ws = ws;

    ws.on("open", () => {
        // Let the browser finish connecting its audio before the advocate speaks first.
        if (!isReconnect) setTimeout(() => !s.ended && nudge(s, OPENING_INSTRUCTION), 1200);
    });
    ws.on("message", (raw) => void handleEvent(s, raw).catch((e) => console.error("Realtime event error:", e)));
    ws.on("unexpected-response", (_req, res) => {
        res.resume();
        // The call is gone (the client left, or it timed out): nothing to attach to.
        void endSession(s.params.consultationId, "call_closed");
    });
    ws.on("error", (e) => console.error(`Sideband error (consultation ${s.params.consultationId}):`, e.message));
    ws.on("close", () => {
        if (s.ended || s.ws !== ws) return;
        if (s.reconnects >= RECONNECT_LIMIT) {
            void endSession(s.params.consultationId, "connection_lost");
            return;
        }
        s.reconnects++;
        setTimeout(() => !s.ended && attach(s, true), 1000);
    });
};

export const startSession = (params: SessionParams, callId: string) => {
    const s: LiveSession = {
        params,
        callId,
        startedAt: Date.now(),
        retrieved: [],
        lastUserSpeech: Date.now(),
        corrections: 0,
        reconnects: 0,
        ended: false,
        introduced: false,
        timers: [],
        usage: { limitSec: Math.round(params.limitMs / 1000), responses: 0, inputTokens: 0, outputTokens: 0 },
        noticed: new Set(),
    };
    live.set(params.consultationId, s);

    const wrapAt = params.limitMs - WRAP_UP_WARNING_MS;
    if (wrapAt > 0) s.timers.push(setTimeout(() => !s.ended && nudge(s, WRAP_UP_INSTRUCTION), wrapAt));
    s.timers.push(setTimeout(() => void endSession(params.consultationId, "time_limit"), params.limitMs));
    s.timers.push(
        setInterval(() => {
            if (Date.now() - s.lastUserSpeech > IDLE_TIMEOUT_MS) void endSession(params.consultationId, "idle");
        }, 20_000)
    );
    s.timers.forEach((t) => t.unref());

    attach(s, false);
};

// Ends the call, saves the result and starts the summary. Safe to call twice.
export const endSession = async (consultationId: number, reason: string): Promise<boolean> => {
    const s = live.get(consultationId);
    if (!s || s.ended) return false;
    s.ended = true;
    live.delete(consultationId);

    s.timers.forEach((t) => (clearTimeout(t), clearInterval(t)));
    await hangupCall(s.callId);
    try {
        s.ws?.close();
    } catch {
        /* already closed */
    }

    const durationSec = Math.round((Date.now() - s.startedAt) / 1000);
    await repo
        .updateConsultation(consultationId, {
            status: "ENDED",
            endedAt: new Date(),
            durationSec,
            endReason: reason,
            usage: s.usage,
            summaryStatus: "PENDING",
        })
        .catch((e) => console.error("Failed to close consultation:", e));

    void generateSummary(consultationId);
    return true;
};

export const shutdownAll = async () => {
    await Promise.allSettled([...live.keys()].map((id) => endSession(id, "server_shutdown")));
};

// After a restart the in-memory sessions are gone, but the calls may still be
// running (and billing) at OpenAI. Hang every one up and close its record.
export const recoverStaleSessions = async () => {
    const stale = await repo.findLiveConsultations();
    for (const c of stale) {
        if (live.has(c.id)) continue;
        if (c.callId) await hangupCall(c.callId);
        // Capped at the session's own limit: downtime must not be charged to the user's daily allowance.
        const limitSec = (c.usage as { limitSec?: number } | null)?.limitSec ?? 3600;
        const elapsedSec = c.startedAt ? Math.round((Date.now() - c.startedAt.getTime()) / 1000) : 0;
        const durationSec = Math.min(elapsedSec, limitSec);
        await repo.updateConsultation(c.id, {
            status: "ENDED",
            endedAt: new Date(),
            durationSec,
            endReason: "server_restart",
            summaryStatus: "PENDING",
        });
        void generateSummary(c.id);
    }
    if (stale.length) console.log(`Closed ${stale.length} consultation(s) left live by a restart`);
};
