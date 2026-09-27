// Shared helpers for system (end-to-end, real-app, real-database) tests.
import request from "supertest";
import app from "../../app";
import { prisma } from "../../config/db";

export { app, prisma };

let counter = 0;

/** A guaranteed-unique, obviously-fake email for a throwaway test user. */
export const uniqueEmail = (label: string) => {
  counter += 1;
  return `system-test.${label}.${Date.now()}.${counter}@example.test`;
};

export const TEST_PASSWORD = "SystemTestPass1234";

/**
 * Registers a fresh throwaway user through the real HTTP API and logs them
 * in, returning the bearer token and user id for use in subsequent requests.
 * Exercises the same register -> login path a real signup does.
 */
export const registerAndLogin = async (label: string) => {
  const email = uniqueEmail(label);

  const registerRes = await request(app)
    .post("/api/v1/users/register")
    .send({ name: `System Test ${label}`, email, password: TEST_PASSWORD });

  if (registerRes.status !== 201) {
    throw new Error(`Setup failed: register returned ${registerRes.status}: ${JSON.stringify(registerRes.body)}`);
  }

  const loginRes = await request(app)
    .post("/api/v1/users/login")
    .send({ email, password: TEST_PASSWORD });

  if (loginRes.status !== 200) {
    throw new Error(`Setup failed: login returned ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }

  return {
    email,
    token: loginRes.body.data.token as string,
    userId: loginRes.body.data.user.id as number,
  };
};

/** Deletes a test user and (via cascading FKs) everything they created. */
export const cleanupUser = async (email: string) => {
  await prisma.user.deleteMany({ where: { email } });
};

/**
 * Polls POST /analysis/run (the same endpoint the real client polls) until
 * the background job finishes — either with a result or a reported
 * failure — or the timeout elapses. Requires a real analysis worker to be
 * running (see analysis.queue.system.test.ts) so the job actually gets
 * processed; this alone does not start one.
 */
export const pollAnalysis = async (
  token: string,
  documentId: number,
  { timeoutMs = 30000, intervalMs = 250 }: { timeoutMs?: number; intervalMs?: number } = {}
) => {
  const deadline = Date.now() + timeoutMs;
  let last: any;

  while (Date.now() < deadline) {
    const res = await request(app)
      .post("/api/v1/analysis/run")
      .set("Authorization", `Bearer ${token}`)
      .send({ documentId });
    last = res;

    if (res.body?.data?.analysis || res.body?.data?.failed) {
      return res;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `pollAnalysis timed out after ${timeoutMs}ms waiting on document ${documentId}. Last response: ${JSON.stringify(last?.body)}`
  );
};
