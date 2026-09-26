import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { aiRateLimiter, standardRateLimiter } from "../../common/middleware/rateLimit.middleware";
import * as c from "./human.controller";

// /human-consultations — the client (and, for ending / ICE, the advocate) side of a call.
export const humanRoutes = Router();
humanRoutes.use(authMiddleware);
humanRoutes.post("/", aiRateLimiter, c.request); // interrupts a real person, so it is rate limited hard
humanRoutes.post("/:id/cancel", standardRateLimiter, c.cancel);
humanRoutes.post("/:id/end", standardRateLimiter, c.end);
humanRoutes.get("/:id/ice", standardRateLimiter, c.ice);

// /advocate-desk — for a signed-in human advocate. Every handler checks that the
// account is linked to an advocate profile and that the consultation is theirs.
export const deskRoutes = Router();
deskRoutes.use(authMiddleware);
deskRoutes.get("/whoami", c.whoami);
deskRoutes.get("/me", standardRateLimiter, c.desk);
deskRoutes.post("/available", standardRateLimiter, c.setAvailable);
deskRoutes.get("/consultations/:id", standardRateLimiter, c.deskConsultation);
deskRoutes.post("/consultations/:id/accept", standardRateLimiter, c.accept);
deskRoutes.post("/consultations/:id/decline", standardRateLimiter, c.decline);
deskRoutes.put("/consultations/:id/notes", standardRateLimiter, c.notes);
