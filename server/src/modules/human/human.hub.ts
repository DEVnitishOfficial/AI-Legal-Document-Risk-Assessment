// Realtime hub for calls with real advocates (WebSocket on the API's own port, path /ws).
//
// It does three jobs:
//  1. tells an advocate's open desk about new requests, and tells a client how their
//     request went;
//  2. lets the two browsers find each other in a call "room" and swap the small
//     setup messages (offer / answer / ICE candidates) WebRTC needs;
//  3. records when the call actually connects, so it can be timed and limited.
//
// The audio and video themselves go directly between the two browsers (or through
// a TURN relay if configured) and never through this server, which is why nothing
// about a call can be recorded here.

import http from "http";
import jwt from "jsonwebtoken";
import WebSocket, { WebSocketServer } from "ws";
import { env } from "../../config/env";
import * as repo from "./human.repository";
import * as presence from "./human.presence";
import { iceServersFor } from "./human.ice";
import * as service from "./human.service";

type Role = "user" | "advocate";

interface Conn {
    ws: WebSocket;
    alive: boolean;
    userId: number | null;
    advocateId: number | null;
    desk: boolean;
    rooms: Set<number>;
    windowStart: number;
    windowCount: number;
}

const conns = new Set<Conn>();
const byUser = new Map<number, Set<Conn>>();
const desks = new Map<number, Set<Conn>>();
const rooms = new Map<number, Map<Role, Conn>>();

const AUTH_TIMEOUT_MS = 8_000;
const HEARTBEAT_MS = 25_000;
const MAX_SIGNAL_CHARS = 20_000;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 300;

const send = (ws: WebSocket, msg: object) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

// ── delivery helpers used by the service ────────────────────────────────────

export const notifyUser = (userId: number, msg: object) => {
    byUser.get(userId)?.forEach((c) => send(c.ws, msg));
};

export const notifyDesk = (advocateId: number, msg: object) => {
    desks.get(advocateId)?.forEach((c) => send(c.ws, msg));
};

export const notifyRoom = (consultationId: number, msg: object) => {
    rooms.get(consultationId)?.forEach((c) => send(c.ws, msg));
};

export const roomOccupancy = (consultationId: number) => rooms.get(consultationId)?.size ?? 0;

export const closeRoom = (consultationId: number) => {
    const room = rooms.get(consultationId);
    room?.forEach((c) => c.rooms.delete(consultationId));
    rooms.delete(consultationId);
};

// ── room membership ─────────────────────────────────────────────────────────

const leaveRoom = (conn: Conn, consultationId: number) => {
    const room = rooms.get(consultationId);
    conn.rooms.delete(consultationId);
    if (!room) return;
    for (const [role, member] of room) {
        if (member === conn) {
            room.delete(role);
            room.forEach((peer) => send(peer.ws, { type: "peer.left", consultationId }));
        }
    }
    if (room.size === 0) rooms.delete(consultationId);
};

const handleJoin = async (conn: Conn, consultationId: number) => {
    const c = await repo.findById(consultationId);
    if (!c || c.advocateKind !== "HUMAN") return send(conn.ws, { type: "error", message: "Consultation not found" });

    const role: Role | null =
        c.userId === conn.userId ? "user" : c.advocate?.userId && c.advocate.userId === conn.userId ? "advocate" : null;
    if (!role) return send(conn.ws, { type: "error", message: "You are not part of this consultation" });
    if (c.status !== "ACCEPTED" && c.status !== "LIVE") {
        return send(conn.ws, { type: "error", message: "This call is not available", status: c.status });
    }

    const room = rooms.get(consultationId) ?? new Map<Role, Conn>();
    rooms.set(consultationId, room);

    // A second tab of the same person takes over; the first is told.
    const previous = room.get(role);
    if (previous && previous !== conn) {
        previous.rooms.delete(consultationId);
        send(previous.ws, { type: "replaced", consultationId });
    }
    room.set(role, conn);
    conn.rooms.add(consultationId);

    const other: Role = role === "user" ? "advocate" : "user";
    const peer = room.get(other);
    send(conn.ws, {
        type: "joined",
        consultationId,
        role,
        peerPresent: !!peer,
        status: c.status,
        startedAt: c.startedAt,
        limitSec: env.HUMAN_CALL_MAX_MINUTES * 60,
        // So each browser can show a correct countdown even if its own clock is off.
        serverNow: new Date().toISOString(),
        iceServers: iceServersFor(conn.userId!),
    });

    if (peer) {
        send(peer.ws, { type: "peer.joined", consultationId });
        // The advocate always makes the offer, and makes a fresh one whenever someone (re)joins.
        const advocate = room.get("advocate");
        if (advocate) send(advocate.ws, { type: "start", consultationId });
    }
};

const handleSignal = (conn: Conn, consultationId: number, data: unknown) => {
    const room = rooms.get(consultationId);
    if (!room || !conn.rooms.has(consultationId)) return;
    if (JSON.stringify(data ?? null).length > MAX_SIGNAL_CHARS) return;
    for (const member of room.values()) {
        if (member !== conn) send(member.ws, { type: "signal", consultationId, data });
    }
};

// ── connection handling ─────────────────────────────────────────────────────

const authenticate = async (conn: Conn, token: unknown) => {
    try {
        const payload = jwt.verify(String(token), env.JWT_SECRET) as { id?: number };
        if (typeof payload.id !== "number") throw new Error("bad token");
        conn.userId = payload.id;
    } catch {
        send(conn.ws, { type: "error", message: "Sign in again" });
        conn.ws.close(4401, "unauthorized");
        return;
    }
    const advocate = await repo.findAdvocateByUserId(conn.userId!);
    conn.advocateId = advocate && advocate.kind === "HUMAN" ? advocate.id : null;

    if (!byUser.has(conn.userId!)) byUser.set(conn.userId!, new Set());
    byUser.get(conn.userId!)!.add(conn);
    send(conn.ws, { type: "auth.ok", userId: conn.userId, advocateId: conn.advocateId });
};

const openDesk = (conn: Conn) => {
    if (!conn.advocateId) return send(conn.ws, { type: "error", message: "No advocate profile is linked to this account" });
    if (conn.desk) return;
    conn.desk = true;
    presence.deskOpened(conn.advocateId);
    if (!desks.has(conn.advocateId)) desks.set(conn.advocateId, new Set());
    desks.get(conn.advocateId)!.add(conn);
    send(conn.ws, { type: "desk.state", available: presence.wantsToBeAvailable(conn.advocateId) });
};

const cleanup = (conn: Conn) => {
    conns.delete(conn);
    for (const id of [...conn.rooms]) leaveRoom(conn, id);
    if (conn.userId !== null) {
        const set = byUser.get(conn.userId);
        set?.delete(conn);
        if (set && set.size === 0) byUser.delete(conn.userId);
    }
    if (conn.desk && conn.advocateId) {
        conn.desk = false;
        desks.get(conn.advocateId)?.delete(conn);
        if (desks.get(conn.advocateId)?.size === 0) desks.delete(conn.advocateId);
        presence.deskClosed(conn.advocateId);
    }
};

const onMessage = async (conn: Conn, raw: WebSocket.RawData) => {
    const now = Date.now();
    if (now - conn.windowStart > RATE_WINDOW_MS) {
        conn.windowStart = now;
        conn.windowCount = 0;
    }
    if (++conn.windowCount > RATE_MAX) {
        conn.ws.close(4429, "too many messages");
        return;
    }

    let msg: any;
    try {
        msg = JSON.parse(raw.toString());
    } catch {
        return;
    }

    if (conn.userId === null) {
        if (msg?.type === "auth") await authenticate(conn, msg.token);
        return;
    }

    const consultationId = Number(msg?.consultationId);
    switch (msg?.type) {
        case "desk.open":
            return openDesk(conn);
        case "join":
            if (Number.isInteger(consultationId)) await handleJoin(conn, consultationId);
            return;
        case "signal":
            if (Number.isInteger(consultationId)) handleSignal(conn, consultationId, msg.data);
            return;
        case "connected": {
            if (!Number.isInteger(consultationId) || !conn.rooms.has(consultationId)) return;
            const live = await service.markLive(consultationId);
            if (live) notifyRoom(consultationId, { type: "call.live", consultationId, ...live, serverNow: new Date().toISOString() });
            return;
        }
        case "leave":
            if (Number.isInteger(consultationId)) leaveRoom(conn, consultationId);
            return;
        case "ping":
            return send(conn.ws, { type: "pong" });
    }
};

export const attachHub = (server: http.Server) => {
    const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 64 * 1024 });

    wss.on("connection", (ws) => {
        const conn: Conn = {
            ws,
            alive: true,
            userId: null,
            advocateId: null,
            desk: false,
            rooms: new Set(),
            windowStart: Date.now(),
            windowCount: 0,
        };
        conns.add(conn);

        const authTimer = setTimeout(() => {
            if (conn.userId === null) ws.close(4401, "auth timeout");
        }, AUTH_TIMEOUT_MS);

        ws.on("pong", () => (conn.alive = true));
        ws.on("message", (raw) => void onMessage(conn, raw).catch((e) => console.error("Hub message error:", e)));
        ws.on("error", () => undefined);
        ws.on("close", () => {
            clearTimeout(authTimer);
            cleanup(conn);
        });
    });

    // Drop connections that stopped answering, so a closed laptop does not keep an advocate "online".
    const heartbeat = setInterval(() => {
        for (const conn of conns) {
            if (!conn.alive) {
                conn.ws.terminate();
                continue;
            }
            conn.alive = false;
            conn.ws.ping();
        }
    }, HEARTBEAT_MS);
    heartbeat.unref();
    wss.on("close", () => clearInterval(heartbeat));

    return wss;
};
