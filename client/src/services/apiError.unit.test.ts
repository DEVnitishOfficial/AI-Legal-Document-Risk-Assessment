import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  apiErrorMessage,
  isNetworkError,
  isSessionError,
  apiErrorStatus,
  failedResponseError,
  NETWORK_MESSAGE,
  TIMEOUT_MESSAGE,
  SERVER_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from "./apiError";

// Minimal shape of an axios error, built by hand rather than importing
// axios, since these functions only ever read a few known fields off it.
const axiosError = (opts: {
  status?: number;
  data?: any;
  url?: string;
  authHeader?: boolean;
  code?: string;
}) => ({
  isAxiosError: true,
  code: opts.code,
  response: opts.status
    ? {
        status: opts.status,
        data: opts.data,
      }
    : undefined,
  config: {
    url: opts.url ?? "/documents/get-documents",
    headers: opts.authHeader ? { Authorization: "Bearer sometoken" } : {},
  },
});

describe("apiErrorStatus", () => {
  it("reads the status off a response error", () => {
    expect(apiErrorStatus(axiosError({ status: 404 }))).toBe(404);
  });

  it("returns undefined for a non-object or statusless error", () => {
    expect(apiErrorStatus("boom")).toBeUndefined();
    expect(apiErrorStatus(new Error("plain"))).toBeUndefined();
  });
});

describe("isNetworkError", () => {
  it("is true for an axios error with no response at all (offline/CORS/DNS)", () => {
    expect(isNetworkError({ isAxiosError: true })).toBe(true);
  });

  it("is false once a response was actually received, even an error one", () => {
    expect(isNetworkError(axiosError({ status: 500 }))).toBe(false);
  });

  it("is true for a fetch TypeError about a network failure", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });
});

describe("isSessionError", () => {
  it("is true for a 401 on an authenticated request to a non-credential endpoint", () => {
    expect(isSessionError(axiosError({ status: 401, url: "/documents/get-documents", authHeader: true }))).toBe(
      true
    );
  });

  it("is false for a 401 on the login endpoint itself (wrong password, not an expired session)", () => {
    expect(isSessionError(axiosError({ status: 401, url: "/users/login", authHeader: true }))).toBe(false);
  });

  it("is false for a 401 with no Authorization header ever sent", () => {
    expect(isSessionError(axiosError({ status: 401, url: "/documents/get-documents", authHeader: false }))).toBe(
      false
    );
  });
});

describe("apiErrorMessage", () => {
  it("gives the network message when there is no response at all", () => {
    expect(apiErrorMessage({ isAxiosError: true })).toBe(NETWORK_MESSAGE);
  });

  it("gives the timeout message specifically for a timeout error code", () => {
    expect(apiErrorMessage({ isAxiosError: true, code: "ECONNABORTED" })).toBe(TIMEOUT_MESSAGE);
  });

  it("prefers the server's own message when the server sent one", () => {
    const err = axiosError({ status: 400, data: { message: "Pasted text is too short." } });
    expect(apiErrorMessage(err)).toBe("Pasted text is too short.");
  });

  it("never surfaces a raw 500 — always the generic server message", () => {
    const err = axiosError({ status: 500, data: { message: "Internal Server Error" } });
    expect(apiErrorMessage(err)).toBe(SERVER_MESSAGE);
  });

  it("falls back to a known sentence for a 404 with no server message", () => {
    const err = axiosError({ status: 404 });
    expect(apiErrorMessage(err)).toBe("We couldn't find what you were looking for.");
  });

  it("reports an expired session distinctly from a generic 401", () => {
    const err = axiosError({ status: 401, url: "/documents/get-documents", authHeader: true });
    expect(apiErrorMessage(err)).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it("uses the caller-supplied fallback only when nothing more specific is known", () => {
    const err = { message: "" };
    expect(apiErrorMessage(err, "Couldn't rename this chat")).toBe("Couldn't rename this chat");
  });

  it("uses an Error's own message when it isn't an axios/response error", () => {
    expect(apiErrorMessage(new Error("Passwords don't match."))).toBe("Passwords don't match.");
  });
});

describe("failedResponseError (fetch-based streaming chat path)", () => {
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
      },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", { value: originalLocalStorage, configurable: true });
  });

  it("clears the saved token and dispatches a session-expired event on a real 401", async () => {
    window.localStorage.setItem("token", "sometoken");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const res = new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    const err = await failedResponseError(res);

    expect(err.message).toBe(SESSION_EXPIRED_MESSAGE);
    expect(window.localStorage.getItem("token")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "nyaymitra:session-expired" }));
  });

  it("carries the server's message through for a normal error response", async () => {
    const res = new Response(JSON.stringify({ message: "That chat no longer exists." }), { status: 404 });
    const err = await failedResponseError(res);
    expect(err.message).toBe("That chat no longer exists.");
  });
});
