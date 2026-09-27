import IORedis from "ioredis";
import { env } from "./env";

// One shared connection, reused by every BullMQ Queue/Worker in this
// process and by the Redis-backed rate limiter. BullMQ requires
// `maxRetriesPerRequest: null` on any connection it's given — it does its
// own retry/backoff bookkeeping and conflicts with ioredis's own command
// retries otherwise (this is BullMQ's own documented requirement).
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("✅ Redis connected");
});
