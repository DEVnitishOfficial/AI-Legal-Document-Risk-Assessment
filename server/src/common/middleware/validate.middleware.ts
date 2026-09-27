import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { AppError } from "../errors/AppError";

interface ValidationTargets {
    body?: ZodType<any>;
    params?: ZodType<any>;
    query?: ZodType<any>;
}

// One place every route's input shape/format check goes through, so a
// malformed request fails the same way everywhere — a clear 400 naming the
// first problem — instead of each handler hand-rolling its own checks (or,
// for several routes before this layer existed, not checking at all and
// letting bad input fall through to a confusing Prisma error, or worse, an
// unhandled one that surfaces as a raw 500).
//
// On success, req.body/params/query are replaced with the *parsed* value —
// so a schema's .default()s, trims, and z.coerce conversions (e.g. an ":id"
// route param string becoming a real number) are what the controller
// actually sees, not the raw request data.
export const validate = (targets: ValidationTargets) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (targets.body) {
                req.body = targets.body.parse(req.body);
            }
            if (targets.params) {
                req.params = targets.params.parse(req.params) as any;
            }
            if (targets.query) {
                req.query = targets.query.parse(req.query) as any;
            }
            next();
        } catch (err) {
            next(toAppError(err));
        }
    };
};

export const zodIssueToMessage = (err: ZodError): string => {
    const first = err.issues[0];
    if (!first) return "Invalid request.";
    const field = first.path.length ? `${first.path.join(".")}: ` : "";
    return `${field}${first.message}`;
};

const toAppError = (err: unknown): AppError => {
    if (err instanceof ZodError) {
        return new AppError(zodIssueToMessage(err), 400);
    }
    return err instanceof AppError ? err : new AppError("Invalid request.", 400);
};
