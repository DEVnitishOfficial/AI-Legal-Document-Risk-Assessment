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
