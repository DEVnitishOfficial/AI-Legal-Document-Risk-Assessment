import { AppError } from "../../common/errors/AppError";
import { env } from "../../config/env";
import * as advocateRepo from "../advocate/advocate.repository";
import { CONSULT_LANGUAGES, INDIAN_STATES } from "../consultation/consultation.constants";
import { toPublic } from "../consultation/consultation.shape";
import * as repo from "./human.repository";
import type { HumanConsultation } from "./human.repository";
import * as presence from "./human.presence";
import * as hub from "./human.hub";
import { iceServersFor } from "./human.ice";

const MAX_NOTES_CHARS = 8000;
const MAX_PENDING_PER_ADVOCATE = 5;
const NOT_A_PARTICIPANT = "You are not part of this consultation";

// ── small helpers ───────────────────────────────────────────────────────────

const clean = (value: unknown, max: number): string =>
    typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";

// The advocate sees a first name and last initial, never an email or phone number.
const clientName = (name?: string | null): string => {
    const parts = (name ?? "").trim().split(/\s+/).filter((p) => /^\p{L}[\p{L}'’-]*$/u.test(p));
    if (parts.length === 0) return "Client";
    const first = parts[0].slice(0, 30);
    return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
};

const expiresAt = (c: HumanConsultation) =>
    c.status === "REQUESTED" && c.requestedAt ? new Date(c.requestedAt.getTime() + env.HUMAN_REQUEST_TTL_SECONDS * 1000) : null;

// What the advocate sees of a consultation (with their own notes, and no contact details).
export const deskShape = (c: HumanConsultation) => ({
    id: c.id,
    status: c.status,
    clientName: clientName(c.user.name),
    state: c.state,
    stateName: INDIAN_STATES[c.state] ?? c.state,
    language: c.language,
    subject: c.subject,
    requestedAt: c.requestedAt,
    expiresAt: expiresAt(c),
    respondedAt: c.respondedAt,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    durationSec: c.durationSec,
    endReason: c.endReason,
    declineReason: c.declineReason,
    privateNotes: c.privateNotes,
    sharedNotes: c.sharedNotes,
    limitSec: env.HUMAN_CALL_MAX_MINUTES * 60,
});

const getHuman = async (id: number): Promise<HumanConsultation> => {
    if (!Number.isInteger(id)) throw new AppError("Invalid consultation id", 400);
    const c = await repo.findById(id);
    if (!c || c.advocateKind !== "HUMAN") throw new AppError("Consultation not found", 404);
    return c;
};

const advocateAccount = async (userId: number) => {
    const advocate = await repo.findAdvocateByUserId(userId);
    if (!advocate || advocate.kind !== "HUMAN") {
        throw new AppError("No advocate profile is linked to your account", 403);
    }
    return advocate;
};

const advocateOwning = async (userId: number, id: number) => {
    const advocate = await advocateAccount(userId);
    const c = await getHuman(id);
    if (c.advocateId !== advocate.id) throw new AppError(NOT_A_PARTICIPANT, 403);
    return { advocate, c };
};

const eligibility = (a: { status: string; verificationStatus: string; acceptingConsultations: boolean }) => {
    if (a.status !== "ACTIVE") return "Your profile is not published yet. Ask the NyayMitra admin to activate it.";
    if (a.verificationStatus !== "VERIFIED") return "Your Bar Council enrolment has not been verified yet.";
    if (!a.acceptingConsultations) return "Consultations are switched off for your profile. Ask the NyayMitra admin.";
    return null;
};

// ── availability shown to clients ───────────────────────────────────────────

export type Availability = "AVAILABLE" | "BUSY" | "OFFLINE";

export const availabilityFor = async (humanAdvocateIds: number[]): Promise<Map<number, Availability>> => {
    const busy = await repo.busyAdvocateIds(humanAdvocateIds);
    const result = new Map<number, Availability>();
    for (const id of humanAdvocateIds) {
        result.set(id, !presence.isOnline(id) ? "OFFLINE" : busy.has(id) ? "BUSY" : "AVAILABLE");
    }
    return result;
};

// ── the client's side ───────────────────────────────────────────────────────

export const requestConsultation = async (
    userId: number,
    body: { advocateId?: unknown; state?: unknown; language?: unknown; subject?: unknown; consent?: unknown }
) => {
    if (body.consent !== true) throw new AppError("Please accept the notice before requesting a consultation.", 400);

    const advocateId = Number(body.advocateId);
    const state = typeof body.state === "string" ? body.state.toUpperCase() : "";
    const language = typeof body.language === "string" ? body.language : "";
    const subject = clean(body.subject, 600);

    if (!Number.isInteger(advocateId)) throw new AppError("Choose an advocate", 400);
    if (!(state in INDIAN_STATES)) throw new AppError("Choose a valid state", 400);
    if (!(language in CONSULT_LANGUAGES)) throw new AppError("Choose a supported language", 400);
    if (subject.length < 10) throw new AppError("Please describe your issue in a sentence or two (at least 10 characters).", 400);

    const advocate = await advocateRepo.findAdvocateById(advocateId);
    if (!advocate || advocate.kind !== "HUMAN" || advocate.status !== "ACTIVE") {
        throw new AppError("This advocate is not available", 404);
    }
    if (advocate.userId === userId) throw new AppError("You can't request a consultation with yourself", 400);
    if (advocate.verificationStatus !== "VERIFIED" || !advocate.acceptingConsultations) {
        throw new AppError("This advocate is not accepting consultations right now", 409);
    }
    if (!presence.isOnline(advocate.id)) {
        throw new AppError(`${advocate.displayName} is offline right now. Please try again later.`, 409);
    }
    if ((await repo.busyAdvocateIds([advocate.id])).has(advocate.id)) {
        throw new AppError(`${advocate.displayName} is in another consultation. Please try again in a little while.`, 409);
    }
    if ((await repo.countPending(advocate.id)) >= MAX_PENDING_PER_ADVOCATE) {
        throw new AppError(`${advocate.displayName} has several requests waiting. Please try again shortly.`, 409);
    }

    const open = await repo.openForUser(userId);
    if (open && open.status !== "LOBBY") {
        throw new AppError("You already have a consultation in progress. Finish or cancel it first.", 409);
    }
    if (open?.status === "LOBBY") await repo.update(open.id, { status: "FAILED", endReason: "superseded" });

    const now = new Date();
    const created = await repo.create({
        userId,
        advocateId: advocate.id,
        advocateName: advocate.displayName,
        advocateKind: "HUMAN",
        state,
        language,
        subject,
        status: "REQUESTED",
        consentAt: now,
        requestedAt: now,
    });

    hub.notifyDesk(advocate.id, { type: "request.new", consultation: deskShape(created) });
    return toPublic(created);
};

export const cancelRequest = async (userId: number, id: number) => {
    const c = await getHuman(id);
    if (c.userId !== userId) throw new AppError("Forbidden", 403);

    if (c.status === "REQUESTED") {
        const ok = await repo.transition(id, ["REQUESTED"], { status: "CANCELLED", endReason: "user_cancelled", respondedAt: new Date() });
        if (ok && c.advocateId) hub.notifyDesk(c.advocateId, { type: "request.update", consultationId: id, status: "CANCELLED", reason: "user_cancelled" });
    } else if (c.status === "ACCEPTED") {
        await endCall(id, "user_left");
    }
    return toPublic((await repo.findById(id))!);
};

// Either party ends the call (or leaves before it has started).
export const endByParticipant = async (userId: number, id: number) => {
    const c = await getHuman(id);
    const role = c.userId === userId ? "user" : c.advocate?.userId === userId ? "advocate" : null;
    if (!role) throw new AppError(NOT_A_PARTICIPANT, 403);
    await endCall(id, role === "user" ? "user_ended" : "advocate_ended");
    const fresh = (await repo.findById(id))!;
    return role === "user" ? toPublic(fresh) : deskShape(fresh);
};

export const iceFor = async (userId: number, id: number) => {
    const c = await getHuman(id);
    const participant = c.userId === userId || c.advocate?.userId === userId;
    if (!participant) throw new AppError(NOT_A_PARTICIPANT, 403);
    return { iceServers: iceServersFor(userId) };
};

// ── the call itself ─────────────────────────────────────────────────────────

// Called when a browser reports the call connected. The first report starts the clock.
export const markLive = async (id: number): Promise<{ startedAt: Date; limitSec: number } | null> => {
    const c = await repo.findById(id);
    if (!c || c.advocateKind !== "HUMAN") return null;
    const limitSec = env.HUMAN_CALL_MAX_MINUTES * 60;

    if (c.status === "LIVE" && c.startedAt) return { startedAt: c.startedAt, limitSec };
    const startedAt = new Date();
    const ok = await repo.transition(id, ["ACCEPTED"], { status: "LIVE", startedAt, usage: { limitSec } });
    if (!ok) {
        const again = await repo.findById(id);
        return again?.status === "LIVE" && again.startedAt ? { startedAt: again.startedAt, limitSec } : null;
    }
    hub.notifyUser(c.userId, { type: "request.update", consultationId: id, status: "LIVE" });
    if (c.advocateId) hub.notifyDesk(c.advocateId, { type: "request.update", consultationId: id, status: "LIVE" });
    return { startedAt, limitSec };
};

export const endCall = async (id: number, reason: string) => {
    const c = await repo.findById(id);
    if (!c || c.advocateKind !== "HUMAN") return null;

    const now = new Date();
    let status: "ENDED" | "CANCELLED" | null = null;
    if (c.status === "LIVE") {
        const durationSec = c.startedAt ? Math.max(0, Math.round((now.getTime() - c.startedAt.getTime()) / 1000)) : 0;
        if (await repo.transition(id, ["LIVE"], { status: "ENDED", endedAt: now, durationSec, endReason: reason })) status = "ENDED";
    } else if (c.status === "ACCEPTED") {
        if (await repo.transition(id, ["ACCEPTED"], { status: "CANCELLED", endedAt: now, endReason: reason })) status = "CANCELLED";
    }
    if (!status) return c;

    hub.notifyRoom(id, { type: "call.ended", consultationId: id, reason, status });
    hub.notifyUser(c.userId, { type: "request.update", consultationId: id, status, reason });
    if (c.advocateId) hub.notifyDesk(c.advocateId, { type: "request.update", consultationId: id, status, reason });
    hub.closeRoom(id);
    return repo.findById(id);
};

// ── the advocate's desk ─────────────────────────────────────────────────────

export const getDesk = async (userId: number) => {
    const advocate = await advocateAccount(userId);
    const [pending, active, history] = await Promise.all([
        repo.pendingForAdvocate(advocate.id),
        repo.activeForAdvocate(advocate.id),
        repo.historyForAdvocate(advocate.id),
    ]);
    return {
        advocate: { id: advocate.id, displayName: advocate.displayName, photoUrl: advocate.photoUrl },
        online: presence.isOnline(advocate.id),
        wantsAvailable: presence.wantsToBeAvailable(advocate.id),
        blockedReason: eligibility(advocate),
        callMaxMinutes: env.HUMAN_CALL_MAX_MINUTES,
        pending: pending.map(deskShape),
        active: active.map(deskShape),
        history: history.map(deskShape),
    };
};

export const setAvailability = async (userId: number, available: unknown) => {
    const advocate = await advocateAccount(userId);
    const on = available === true;
    if (on) {
        const blocked = eligibility(advocate);
        if (blocked) throw new AppError(blocked, 409);
        if (!presence.setAvailable(advocate.id, true)) {
            throw new AppError("Your desk isn't connected yet. Wait a moment and try again.", 409);
        }
    } else {
        presence.setAvailable(advocate.id, false);
    }
    return { online: presence.isOnline(advocate.id), wantsAvailable: presence.wantsToBeAvailable(advocate.id) };
};

export const getDeskConsultation = async (userId: number, id: number) => {
    const { c } = await advocateOwning(userId, id);
    return deskShape(c);
};

export const acceptRequest = async (userId: number, id: number) => {
    const { advocate, c } = await advocateOwning(userId, id);
    if ((await repo.activeForAdvocate(advocate.id)).length > 0) {
        throw new AppError("Finish your current consultation before accepting another.", 409);
    }
    if (c.status !== "REQUESTED") throw new AppError("This request is no longer waiting.", 409);

    const ok = await repo.transition(id, ["REQUESTED"], { status: "ACCEPTED", respondedAt: new Date() });
    if (!ok) throw new AppError("This request is no longer waiting.", 409);

    hub.notifyUser(c.userId, { type: "request.update", consultationId: id, status: "ACCEPTED" });
    return deskShape((await repo.findById(id))!);
};

export const declineRequest = async (userId: number, id: number, reason: unknown) => {
    const { c } = await advocateOwning(userId, id);
    if (c.status !== "REQUESTED") throw new AppError("This request is no longer waiting.", 409);

    const declineReason = clean(reason, 200) || null;
    const ok = await repo.transition(id, ["REQUESTED"], {
        status: "DECLINED",
        respondedAt: new Date(),
        endReason: "declined",
        declineReason,
    });
    if (!ok) throw new AppError("This request is no longer waiting.", 409);

    hub.notifyUser(c.userId, { type: "request.update", consultationId: id, status: "DECLINED", reason: declineReason });
    return deskShape((await repo.findById(id))!);
};

// Two note fields: private (only the advocate ever sees it) and shared (shown to the client after the call).
export const saveNotes = async (userId: number, id: number, body: { privateNotes?: unknown; sharedNotes?: unknown }) => {
    const { c } = await advocateOwning(userId, id);
    if (!["ACCEPTED", "LIVE", "ENDED"].includes(c.status)) {
        throw new AppError("Notes can be added once a consultation has been accepted.", 409);
    }
    const data: { privateNotes?: string | null; sharedNotes?: string | null } = {};
    if (body.privateNotes !== undefined) data.privateNotes = clean(body.privateNotes, MAX_NOTES_CHARS) || null;
    if (body.sharedNotes !== undefined) data.sharedNotes = clean(body.sharedNotes, MAX_NOTES_CHARS) || null;
    await repo.update(id, data);
    return deskShape((await repo.findById(id))!);
};

// ── timeouts ────────────────────────────────────────────────────────────────

const warned = new Set<number>();
const emptySince = new Map<number, number>();
const EMPTY_ROOM_GRACE_MS = 90_000;

// Runs every few seconds: expires unanswered requests and no-shows, ends calls at the
// time limit, and ends live calls both people have left (including after a restart).
export const sweep = async () => {
    const now = Date.now();

    for (const c of await repo.staleRequests(new Date(now - env.HUMAN_REQUEST_TTL_SECONDS * 1000))) {
        if (await repo.transition(c.id, ["REQUESTED"], { status: "EXPIRED", endReason: "no_response", respondedAt: new Date() })) {
            hub.notifyUser(c.userId, { type: "request.update", consultationId: c.id, status: "EXPIRED", reason: "no_response" });
            if (c.advocateId) hub.notifyDesk(c.advocateId, { type: "request.update", consultationId: c.id, status: "EXPIRED", reason: "no_response" });
        }
    }

    for (const c of await repo.staleAccepted(new Date(now - env.HUMAN_JOIN_TTL_SECONDS * 1000))) {
        if (await repo.transition(c.id, ["ACCEPTED"], { status: "EXPIRED", endReason: "no_show", endedAt: new Date() })) {
            hub.notifyUser(c.userId, { type: "request.update", consultationId: c.id, status: "EXPIRED", reason: "no_show" });
            if (c.advocateId) hub.notifyDesk(c.advocateId, { type: "request.update", consultationId: c.id, status: "EXPIRED", reason: "no_show" });
            hub.closeRoom(c.id);
        }
    }

    const limitMs = env.HUMAN_CALL_MAX_MINUTES * 60_000;
    const liveIds = new Set<number>();
    for (const c of await repo.liveHuman()) {
        liveIds.add(c.id);
        const elapsed = c.startedAt ? now - c.startedAt.getTime() : 0;

        if (elapsed >= limitMs) {
            await endCall(c.id, "time_limit");
            continue;
        }
        if (elapsed >= limitMs - 60_000 && !warned.has(c.id)) {
            warned.add(c.id);
            hub.notifyRoom(c.id, { type: "call.warning", consultationId: c.id, secondsLeft: Math.round((limitMs - elapsed) / 1000) });
        }
        if (hub.roomOccupancy(c.id) === 0) {
            const since = emptySince.get(c.id) ?? now;
            emptySince.set(c.id, since);
            if (now - since >= EMPTY_ROOM_GRACE_MS) await endCall(c.id, "connection_lost");
        } else {
            emptySince.delete(c.id);
        }
    }
    for (const id of [...emptySince.keys()]) if (!liveIds.has(id)) emptySince.delete(id);
    for (const id of [...warned]) if (!liveIds.has(id)) warned.delete(id);
};

export const startSweeper = () => {
    const timer = setInterval(() => void sweep().catch((e) => console.error("Human-call sweep failed:", e)), 10_000);
    timer.unref();
    void sweep().catch((e) => console.error("Human-call sweep failed:", e));
};
