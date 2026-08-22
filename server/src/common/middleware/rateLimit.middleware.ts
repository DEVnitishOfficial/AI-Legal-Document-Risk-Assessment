import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { AppError } from "../errors/AppError";

// Keyed by authenticated user id rather than IP — every endpoint this is
// applied to sits behind authMiddleware, and IP-based keying would let one
// user burn through the limit from multiple networks or unfairly throttle
// several users behind the same NAT/proxy. Falls back to IP only if
// somehow unauthenticated; express-rate-limit v8 requires IPv6 addresses
// (e.g. dev's "::1") to go through ipKeyGenerator so they're normalized
// consistently rather than compared as raw strings.
const keyByUser = (req: any) => (req.user?.id ? String(req.user.id) : ipKeyGenerator(req.ip));

const handler = (req: any, res: any, next: any) => {
    next(new AppError("Too many requests — please slow down and try again shortly.", 429));
};

// Guards the OpenAI/Firecrawl-cost endpoints (chat messages, voice
// transcription+chat, RAG ingestion) — the ones a runaway client or script
// could turn into a real API bill.
export const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyByUser,
    handler,
});

// Looser guard for cheaper-but-still-real-cost endpoints (TTS synthesis is
// cached after the first call, document upload/analysis already caches).
export const standardRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyByUser,
    handler,
});
