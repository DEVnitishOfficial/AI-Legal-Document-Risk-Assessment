import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

const adapter = new PrismaPg(env.DATABASE_URL);

export const prisma = new PrismaClient({ adapter });

prisma
  .$connect()
  .then(() => console.log("✅ DB Connected"))
  .catch((err) => console.error("❌ DB Error", err));
