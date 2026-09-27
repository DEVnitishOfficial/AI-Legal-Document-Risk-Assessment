// One-time (and idempotent — safe to re-run) setup for the system-test
// database: creates it if missing, then applies every Prisma migration to
// it. Run via `npm run test:db:setup`.
//
// Deliberately a plain Node script rather than shell so it works the same
// on Windows/PowerShell and POSIX shells without an extra cross-env-style
// dependency.
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import pg from "pg";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.test");

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error(`Could not read ${envPath}.`);
  console.error("Copy server/.env.test.example to server/.env.test and fill in your local Postgres credentials first.");
  process.exit(1);
}

const { DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL } = process.env;

if (!DB_NAME?.includes("_test")) {
  console.error(`Refusing to run: DB_NAME ("${DB_NAME}") in .env.test does not look like a test database name.`);
  process.exit(1);
}

const adminClient = new pg.Client({
  host: "localhost",
  port: 5432,
  user: DB_USER,
  password: DB_PASSWORD,
  database: "postgres", // connect to the default maintenance DB to create the test DB
});

try {
  await adminClient.connect();
  const { rowCount } = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
  if (rowCount === 0) {
    // Database identifiers can't be parameterized — DB_NAME is our own
    // config value (validated above to contain "_test"), not user input.
    await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`Created database "${DB_NAME}".`);
  } else {
    console.log(`Database "${DB_NAME}" already exists.`);
  }
} finally {
  await adminClient.end();
}

console.log("Applying Prisma migrations to the test database...");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, DATABASE_URL },
});

console.log("Test database is ready.");
