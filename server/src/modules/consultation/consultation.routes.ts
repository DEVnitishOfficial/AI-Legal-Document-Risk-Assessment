import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { aiRateLimiter, standardRateLimiter } from "../../common/middleware/rateLimit.middleware";
import * as c from "./consultation.controller";

const router = Router();
router.use(authMiddleware);

router.get("/options", standardRateLimiter, c.options);
router.get("/", standardRateLimiter, c.list);
router.post("/", standardRateLimiter, c.create);

router.get("/:id", standardRateLimiter, c.get);
router.get("/:id/turns", c.turns); // polled during a live call, so not rate limited like the rest
router.post("/:id/connect", aiRateLimiter, c.connect); // starts billed audio
router.post("/:id/end", standardRateLimiter, c.end);
router.delete("/:id", standardRateLimiter, c.remove);

export default router;
