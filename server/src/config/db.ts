import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  user: env.DB_USER,
  host: "localhost",
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: 5432,
});

pool.connect()
  .then(() => console.log("✅ DB Connected"))
  .catch((err) => console.error("❌ DB Error", err));