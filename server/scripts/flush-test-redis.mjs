// Clears the test Redis database (BullMQ job history + rate-limit
// counters accumulated by test runs). Safe to run any time — it only
// touches the logical DB index configured for tests (REDIS_URL in
// server/.env.test, normally index 1), never your dev database (index 0).
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import IORedis from "ioredis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
if (result.error) {
  console.error("Could not read server/.env.test — copy .env.test.example first.");
  process.exit(1);
}

if (!process.env.REDIS_URL?.match(/\/[1-9]\d*$/)) {
  console.error(`Refusing to flush: REDIS_URL ("${process.env.REDIS_URL}") doesn't look like a non-default logical DB.`);
  process.exit(1);
}

const redis = new IORedis(process.env.REDIS_URL);
await redis.flushdb();
console.log(`Flushed test Redis database (${process.env.REDIS_URL}).`);
await redis.quit();
