import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";
import { logger } from "./logger";

// pg's pool closes idle connections after 10 s, so a quiet server keeps opening fresh
// sockets. That is wasteful anywhere, and on a machine with a busy network stack it can
// surface as random failures (EADDRINUSE). Keep connections for a few minutes instead.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  idleTimeoutMillis: 5 * 60_000,
  connectionTimeoutMillis: 10_000,
});

export const prisma = new PrismaClient({ adapter });

prisma
  .$connect()
  .then(() => logger.info("Database connected"))
  .catch((err) => logger.error({ err }, "Database connection failed"));
