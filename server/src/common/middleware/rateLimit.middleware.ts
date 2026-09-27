import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { AppError } from "../errors/AppError";
import { redisConnection } from "../../config/redis";

// Backed by Redis instead of express-rate-limit's default in-memory store,
// so limits survive a `nodemon` restart / deploy instead of silently
// resetting, and would stay correct if this ever ran as more than one
// process (the in-memory store can't be shared across processes at all).
//
// One store per limiter, each with its own key prefix — express-rate-limit
// normally gives each `rateLimit()` call its own isolated MemoryStore
// automatically; sharing a single RedisStore (and therefore one Redis key
// namespace) between aiRateLimiter and standardRateLimiter would merge
// their counts for the same user instead of tracking them separately.
const makeRedisStore = (prefix: string) =>
    new RedisStore({
        // rate-limit-redis's Redis client contract is just "a function that
        // sends raw commands" — ioredis's `.call(command, args[])` overload
        // satisfies it (the spread-args overload trips up TS's overload
        // resolution here, so the array form is used instead).
        sendCommand: (...args: string[]) => redisConnection.call(args[0], args.slice(1)) as any,
        prefix,
    });

// Keyed by authenticated user id rather than IP — every endpoint this is
// applied to sits behind authMiddleware, and IP-based keying would let one
// user burn through the limit from multiple networks or unfairly throttle
// several users behind the same NAT/proxy. Falls back to IP only if
// somehow unauthenticated; express-rate-limit v8 requires IPv6 addresses
// (e.g. dev's "::1") to go through ipKeyGenerator so they're normalized
// consistently rather than compared as raw strings.
// Exported (not just used inline) so it can be unit tested directly instead
// of only indirectly through a live rate-limit trip.
export const keyByUser = (req: any) => (req.user?.id ? String(req.user.id) : ipKeyGenerator(req.ip));

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
    store: makeRedisStore("ratelimit:ai:"),
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
    store: makeRedisStore("ratelimit:standard:"),
});

// POST /analysis/run is polled repeatedly by the client while a background
// analysis job runs (every ~2s, for up to a few minutes on a slow/OCR'd
// document — see client/src/features/document/useDocumentAnalysis.ts) —
// unlike aiRateLimiter's other endpoints, most of those calls don't spend
// any OpenAI cost at all: the actual AI call only happens once per document
// (the queue's deterministic jobId already prevents a duplicate job, and an
// already-analyzed document just returns the cached row). The limit here is
// sized for "polling volume", not "AI spend" — cost control for the AI call
// itself is the worker's concurrency cap (analysis.worker.ts), not this.
export const analysisPollRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyByUser,
    handler,
    store: makeRedisStore("ratelimit:analysis-poll:"),
});
