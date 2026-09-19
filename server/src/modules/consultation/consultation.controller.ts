import { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import * as service from "./consultation.service";

const userId = (req: Request): number => {
    const id = (req as any).user?.id;
    if (typeof id !== "number") throw new AppError("Unauthorized", 401);
    return id;
};

const idParam = (req: Request) => Number(req.params.id);

export const options = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await service.getOptions(userId(req)) });
    } catch (err) {
        next(err);
    }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const consultation = await service.createConsultation(userId(req), req.body ?? {});
        res.status(201).json({ success: true, data: { consultation } });
    } catch (err) {
        next(err);
    }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: { consultations: await service.listConsultations(userId(req)) } });
    } catch (err) {
        next(err);
    }
};

export const get = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: { consultation: await service.getConsultation(userId(req), idParam(req)) } });
    } catch (err) {
        next(err);
    }
};

// The browser's WebRTC offer; the answer comes back for setRemoteDescription.
export const connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.connect(userId(req), idParam(req), req.body?.sdp);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

export const end = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: { consultation: await service.endConsultation(userId(req), idParam(req)) } });
    } catch (err) {
        next(err);
    }
};

export const turns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const turns = await service.getTurns(userId(req), idParam(req), Number(req.query.after));
        res.json({ success: true, data: { turns } });
    } catch (err) {
        next(err);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.deleteConsultation(userId(req), idParam(req));
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
