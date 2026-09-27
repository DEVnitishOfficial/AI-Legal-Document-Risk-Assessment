import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the repository layer so this exercises only the service's business
// logic (duplicate checks, hashing, error codes) with no real database.
vi.mock("./user.repository", () => ({
  findUserByEmail: vi.fn(),
  findUserByPhone: vi.fn(),
  createUser: vi.fn(),
  findUserById: vi.fn(),
}));

import * as userRepo from "./user.repository";
import { registerUser, loginUser, getCurrentUser } from "./user.service";
import { AppError } from "../../common/errors/AppError";

const mockedRepo = vi.mocked(userRepo);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerUser", () => {
  it("rejects registration when the email is already taken", async () => {
    mockedRepo.findUserByEmail.mockResolvedValue({ id: 1, email: "a@b.com" } as any);

    await expect(
      registerUser({ name: "A", email: "a@b.com", password: "secret123" })
    ).rejects.toMatchObject({ statusCode: 409 } satisfies Partial<AppError>);

    expect(mockedRepo.createUser).not.toHaveBeenCalled();
  });

  it("rejects registration when the phone is already taken", async () => {
    mockedRepo.findUserByEmail.mockResolvedValue(null);
    mockedRepo.findUserByPhone.mockResolvedValue({ id: 2, phone: "9999999999" } as any);

    await expect(
      registerUser({ name: "A", email: "new@b.com", phone: "9999999999", password: "secret123" })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockedRepo.createUser).not.toHaveBeenCalled();
  });

  it("hashes the password and never returns it on success", async () => {
    mockedRepo.findUserByEmail.mockResolvedValue(null);
    mockedRepo.createUser.mockResolvedValue({
      id: 3,
      name: "A",
      email: "new@b.com",
      phone: null,
      password: "$2b$10$hashedvalue",
      createdAt: new Date(),
    } as any);

    const result = await registerUser({ name: "A", email: "new@b.com", password: "plaintext-pw" });

    expect(mockedRepo.createUser).toHaveBeenCalledTimes(1);
    const createArg = mockedRepo.createUser.mock.calls[0][0];
    // The password handed to the repository must be a bcrypt hash, not the
    // plaintext the caller supplied.
    expect(createArg.password).not.toBe("plaintext-pw");
    expect(createArg.password).toMatch(/^\$2[aby]\$/);

    expect(result).not.toHaveProperty("password");
    expect(result.email).toBe("new@b.com");
  });
});

describe("loginUser", () => {
  it("rejects when no account exists for the email", async () => {
    mockedRepo.findUserByEmail.mockResolvedValue(null);

    await expect(loginUser("nobody@example.com", "whatever")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("rejects when the password does not match", async () => {
    const bcrypt = await import("bcrypt");
    const realHash = await bcrypt.hash("correct-password", 10);
    mockedRepo.findUserByEmail.mockResolvedValue({
      id: 5,
      email: "u@example.com",
      password: realHash,
    } as any);

    await expect(loginUser("u@example.com", "wrong-password")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("returns a token and a password-free user on success", async () => {
    const bcrypt = await import("bcrypt");
    const realHash = await bcrypt.hash("correct-password", 10);
    mockedRepo.findUserByEmail.mockResolvedValue({
      id: 5,
      email: "u@example.com",
      name: "U",
      password: realHash,
    } as any);

    const result = await loginUser("u@example.com", "correct-password");

    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.user).not.toHaveProperty("password");
    expect(result.user.email).toBe("u@example.com");
  });
});

describe("getCurrentUser", () => {
  it("throws 404 when the user id no longer exists", async () => {
    mockedRepo.findUserById.mockResolvedValue(null);
    await expect(getCurrentUser(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns the safe user when found", async () => {
    mockedRepo.findUserById.mockResolvedValue({
      id: 1,
      name: "A",
      email: "a@b.com",
      password: "hash",
    } as any);

    const result = await getCurrentUser(1);
    expect(result).not.toHaveProperty("password");
    expect(result.id).toBe(1);
  });
});
