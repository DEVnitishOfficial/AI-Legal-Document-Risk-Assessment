import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { requireAdmin } from "../../common/middleware/admin.middleware";
import { standardRateLimiter } from "../../common/middleware/rateLimit.middleware";
import * as c from "./advocate.controller";
import { advocatePhotoUpload } from "./advocate.upload";

// GET /advocates — any signed-in user sees ACTIVE advocates (never the AI config).
export const advocateRoutes = Router();
advocateRoutes.get("/", authMiddleware, c.listAdvocates);
advocateRoutes.get("/:slug", authMiddleware, c.getAdvocate);

// /admin/advocates — admin only. Role is re-checked against the DB per request.
export const adminAdvocateRoutes = Router();
adminAdvocateRoutes.use(authMiddleware, requireAdmin, standardRateLimiter);

adminAdvocateRoutes.get("/", c.adminList);
adminAdvocateRoutes.post("/", c.adminCreate);
adminAdvocateRoutes.get("/:id", c.adminGet);
adminAdvocateRoutes.patch("/:id", c.adminUpdate);
adminAdvocateRoutes.delete("/:id", c.adminDelete);

adminAdvocateRoutes.post("/:id/credentials", c.adminAddCredential);
adminAdvocateRoutes.patch("/:id/credentials/:credentialId", c.adminUpdateCredential);
adminAdvocateRoutes.delete("/:id/credentials/:credentialId", c.adminDeleteCredential);

adminAdvocateRoutes.put("/:id/ai-config", c.adminUpdateAiConfig);

adminAdvocateRoutes.post("/:id/photo", advocatePhotoUpload, c.adminSetPhoto);
adminAdvocateRoutes.delete("/:id/photo", c.adminRemovePhoto);

adminAdvocateRoutes.put("/:id/account", c.adminLinkAccount);
adminAdvocateRoutes.delete("/:id/account", c.adminUnlinkAccount);
