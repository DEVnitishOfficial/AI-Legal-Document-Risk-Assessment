import { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import * as service from "./human.service";
import { findAdvocateByUserId } from "./human.repository";

const userId = (req: Request): number => {
    const id = (req as any).user?.id;
    if (typeof id !== "number") throw new AppError("Unauthorized", 401);
    return id;
};
const idParam = (req: Request) => Number(req.params.id);

// Thin handlers: call the service and wrap the result in the {success, data} envelope.
const handle =
    (fn: (req: Request) => Promise<{ status?: number; data?: Record<string, unknown> }>) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { status = 200, data } = await fn(req);
            res.status(status).json({ success: true, ...(data ? { data } : {}) });
        } catch (err) {
            next(err);
        }
    };

// ── the client ──────────────────────────────────────────────────────────────
export const request = handle(async (req) => ({
    status: 201,
    data: { consultation: await service.requestConsultation(userId(req), req.body ?? {}) },
}));
export const cancel = handle(async (req) => ({ data: { consultation: await service.cancelRequest(userId(req), idParam(req)) } }));
export const end = handle(async (req) => ({ data: { consultation: await service.endByParticipant(userId(req), idParam(req)) } }));
export const ice = handle(async (req) => ({ data: await service.iceFor(userId(req), idParam(req)) }));

// ── the advocate's desk ─────────────────────────────────────────────────────

// Lets the client app ask "is this account an advocate?" without an error for everyone else.
export const whoami = handle(async (req) => {
    const advocate = await findAdvocateByUserId(userId(req));
    return {
        data: {
            advocate:
                advocate && advocate.kind === "HUMAN"
                    ? { id: advocate.id, displayName: advocate.displayName, photoUrl: advocate.photoUrl }
                    : null,
        },
    };
});
export const desk = handle(async (req) => ({ data: await service.getDesk(userId(req)) }));
export const setAvailable = handle(async (req) => ({ data: await service.setAvailability(userId(req), req.body?.available) }));
export const deskConsultation = handle(async (req) => ({
    data: { consultation: await service.getDeskConsultation(userId(req), idParam(req)) },
}));
export const accept = handle(async (req) => ({ data: { consultation: await service.acceptRequest(userId(req), idParam(req)) } }));
export const decline = handle(async (req) => ({
    data: { consultation: await service.declineRequest(userId(req), idParam(req), req.body?.reason) },
}));
export const notes = handle(async (req) => ({
    data: { consultation: await service.saveNotes(userId(req), idParam(req), req.body ?? {}) },
}));
