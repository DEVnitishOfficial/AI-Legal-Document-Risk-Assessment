import { AppError } from "../../common/errors/AppError";
import { env } from "../../config/env";
import * as advocates from "../advocate/advocate.repository";
import { findUserById } from "../user/user.repository";
import { DEFAULT_RAG } from "../rag/rag.grounded";
import { summariseStatutes } from "../rag/rag.repository";
import * as repo from "./consultation.repository";
import { buildSessionConfig, endSession, isLive, negotiateCall, recoverStaleSessions, startSession } from "./consultation.realtime";
import { buildInstructions } from "./consultation.prompt";
import { toPublic } from "./consultation.shape";
import { CONSULT_LANGUAGES, ConsultLanguage, INDIAN_STATES, STALE_LOBBY_MS } from "./consultation.constants";

type Consultation = NonNullable<Awaited<ReturnType<typeof repo.findConsultation>>>;

const DAY_MS = 24 * 60 * 60 * 1000;

// The account name is user-typed text that ends up in the model's instructions,
// so only a single plain first name is allowed through — anything else (digits,
// punctuation, a sentence) is dropped rather than risk instructions in a name.
const safeFirstName = (name?: string | null): string | null => {
    const first = name?.trim().split(/\s+/)[0] ?? "";
    return /^\p{L}[\p{L}'’-]{0,29}$/u.test(first) ? first : null;
};

export { toPublic };

const getOwned = async (userId: number, id: number): Promise<Consultation> => {
    if (!Number.isInteger(id)) throw new AppError("Invalid consultation id", 400);
    const c = await repo.findConsultation(id);
    if (!c) throw new AppError("Consultation not found", 404);
    if (c.userId !== userId) throw new AppError("Forbidden", 403);
    return c;
};

const remainingSeconds = async (userId: number): Promise<number> => {
    const used = await repo.secondsUsedSince(userId, new Date(Date.now() - DAY_MS));
    return Math.max(0, env.DAILY_CONSULT_MINUTES * 60 - used);
};

export const getOptions = async (userId: number) => ({
    states: Object.entries(INDIAN_STATES).map(([code, name]) => ({ code, name })),
    languages: Object.entries(CONSULT_LANGUAGES).map(([code, l]) => ({ code, name: l.name.split(" (")[0] })),
    dailyMinutes: env.DAILY_CONSULT_MINUTES,
    remainingSeconds: await remainingSeconds(userId),
});

export const createConsultation = async (
    userId: number,
    body: { advocateId?: unknown; state?: unknown; language?: unknown; consent?: unknown }
) => {
    if (body.consent !== true) {
        throw new AppError("You need to accept the recording and AI notice before joining.", 400);
    }
    const advocateId = Number(body.advocateId);
    const state = typeof body.state === "string" ? body.state.toUpperCase() : "";
    const language = typeof body.language === "string" ? body.language : "";

    if (!Number.isInteger(advocateId)) throw new AppError("Choose an advocate", 400);
    if (!(state in INDIAN_STATES)) throw new AppError("Choose a valid state", 400);
    if (!(language in CONSULT_LANGUAGES)) throw new AppError("Choose a supported language", 400);

    const advocate = await advocates.findAdvocateById(advocateId);
    if (!advocate || advocate.status !== "ACTIVE") throw new AppError("This advocate is not available", 404);
    if (advocate.kind !== "AI" || !advocate.aiConfig) {
        throw new AppError("This is a human advocate — use Request consultation instead.", 400);
    }
    if (!advocate.acceptingConsultations) throw new AppError("This advocate is not accepting consultations right now", 409);

    // Close records left live by a restart, and drop lobbies nobody joined.
    await recoverStaleSessions();
    await repo.failStaleLobbies(new Date(Date.now() - STALE_LOBBY_MS));

    const open = await repo.findOpenConsultationForUser(userId);
    if (open?.status === "LIVE" || open?.status === "REQUESTED" || open?.status === "ACCEPTED") {
        throw new AppError("You already have a consultation in progress. End it before starting another.", 409);
    }
    // A lobby the user walked away from is replaced, not blocked on.
    if (open?.status === "LOBBY") {
        await repo.updateConsultation(open.id, { status: "FAILED", endReason: "superseded" });
    }

    if ((await remainingSeconds(userId)) < 60) {
        throw new AppError(
            `You have used today's ${env.DAILY_CONSULT_MINUTES} minutes of live consultation. Please try again tomorrow.`,
            429
        );
    }

    const created = await repo.createConsultation({
        userId,
        advocateId: advocate.id,
        advocateName: advocate.displayName,
        state,
        language,
        consentAt: new Date(),
    });
    return toPublic(created);
};

export const connect = async (userId: number, id: number, sdp: unknown) => {
    const c = await getOwned(userId, id);
    if (c.advocateKind === "HUMAN") throw new AppError("This is a call with a human advocate", 400);
    if (c.status !== "LOBBY") throw new AppError("This consultation can no longer be joined", 409);
    if (typeof sdp !== "string" || !sdp.startsWith("v=0") || sdp.length > 100_000) {
        throw new AppError("Invalid connection offer", 400);
    }

    const advocate = c.advocateId ? await advocates.findAdvocateById(c.advocateId) : null;
    const cfg = advocate?.aiConfig;
    if (!advocate || advocate.kind !== "AI" || advocate.status !== "ACTIVE" || !advocate.acceptingConsultations || !cfg) {
        throw new AppError("This advocate is no longer available", 409);
    }

    const remaining = await remainingSeconds(userId);
    if (remaining < 60) throw new AppError("You have used today's live consultation minutes.", 429);
    const limitMs = Math.min(cfg.maxSessionMinutes * 60, remaining) * 1000;

    const rag = (cfg.ragConfig as { k?: number; minSimilarity?: number } | null) ?? {};
    const language = c.language as ConsultLanguage;
    const loaded = await summariseStatutes();
    const user = await findUserById(userId);

    const params = {
        consultationId: c.id,
        userId,
        model: cfg.model,
        voice: cfg.voice,
        languageCode: CONSULT_LANGUAGES[language].transcription,
        state: c.state,
        limitMs,
        ragK: rag.k ?? DEFAULT_RAG.k,
        ragMinSimilarity: rag.minSimilarity ?? DEFAULT_RAG.minSimilarity,
        instructions: buildInstructions({
            languageName: CONSULT_LANGUAGES[language].name,
            stateCode: c.state,
            stateName: INDIAN_STATES[c.state] ?? c.state,
            today: new Date().toISOString().slice(0, 10),
            loadedActs: loaded.map((a) => ({ actShort: a.actShort, actName: a.act ?? a.actShort })),
            persona: cfg.personaPrompt,
            clientName: safeFirstName(user?.name),
        }),
    };

    // Claim the lobby first so two simultaneous connects can't both start a call.
    const claimed = await repo.claimLobby(c.id);
    if (!claimed) throw new AppError("This consultation can no longer be joined", 409);

    let negotiated;
    try {
        negotiated = await negotiateCall(sdp, buildSessionConfig(params));
    } catch (err) {
        console.error("Realtime negotiation failed:", err instanceof Error ? err.message : err);
        await repo.updateConsultation(c.id, { status: "LOBBY" });
        throw new AppError("Could not start the call. Please try again in a moment.", 502);
    }

    const startedAt = new Date();
    await repo.updateConsultation(c.id, {
        callId: negotiated.callId,
        startedAt,
        model: cfg.model,
        aiConfigVersion: cfg.version,
        usage: { limitSec: Math.round(limitMs / 1000) },
    });
    startSession(params, negotiated.callId);

    return { answer: negotiated.answerSdp, startedAt, limitSec: Math.round(limitMs / 1000) };
};

export const endConsultation = async (userId: number, id: number) => {
    let c = await getOwned(userId, id);
    if (c.advocateKind === "HUMAN") throw new AppError("This is a call with a human advocate", 400);

    if (c.status === "LIVE") {
        if (isLive(c.id)) await endSession(c.id, "user_ended");
        else await recoverStaleSessions();
    } else if (c.status === "LOBBY") {
        await repo.updateConsultation(c.id, { status: "FAILED", endReason: "left_lobby" });
    }

    c = await getOwned(userId, id);
    return toPublic(c, true);
};

export const getConsultation = async (userId: number, id: number) => toPublic(await getOwned(userId, id), true);

export const listConsultations = (userId: number) => repo.listConsultations(userId);

export const getTurns = async (userId: number, id: number, afterId: number) => {
    await getOwned(userId, id);
    return repo.turnsAfter(id, Number.isInteger(afterId) && afterId > 0 ? afterId : 0);
};

export const deleteConsultation = async (userId: number, id: number) => {
    const c = await getOwned(userId, id);
    if (c.status === "LIVE" || c.status === "REQUESTED" || c.status === "ACCEPTED") {
        throw new AppError("End or cancel the consultation before deleting it", 409);
    }
    await repo.deleteConsultation(id);
};
