// One place that turns any failure into a sentence a person can act on. Screens must show
// this instead of `err.message`, which for axios is text like "Request failed with status code 404".

export const NETWORK_MESSAGE = "We can't reach NyayMitra right now. Please check your internet connection and try again.";
export const TIMEOUT_MESSAGE = "This is taking longer than expected. Please try again.";
export const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";
export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

// Login, registration and OTP answer 401/404 about the details the person typed, not about a session.
const CREDENTIAL_PATHS = ["/users/login", "/users/register", "/auth/otp"];

const BY_STATUS: Record<number, string> = {
  400: "Some of the details don't look right. Please check them and try again.",
  401: SESSION_EXPIRED_MESSAGE,
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That can't be done right now. Please refresh and try again.",
  413: "That file is too large. Please choose a smaller one.",
  429: "You're going a little fast. Please wait a moment and try again.",
  502: "A service we depend on is unavailable. Please try again in a moment.",
  503: "NyayMitra is temporarily unavailable. Please try again in a moment.",
  504: TIMEOUT_MESSAGE,
};

export interface ApiFailure {
  message: string;
  status?: number;
}

const isObject = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null;

export const apiErrorStatus = (err: unknown): number | undefined => {
  if (!isObject(err)) return undefined;
  const status = err.response?.status ?? err.status;
  return typeof status === "number" ? status : undefined;
};

// True when the request never got an answer: offline, server down, DNS, CORS, timeout.
export const isNetworkError = (err: unknown): boolean => {
  if (!isObject(err) || err.response) return false;
  if (err.isAxiosError) return true;
  return err instanceof TypeError && /fetch|network|load failed/i.test(err.message);
};

export const isSessionError = (err: unknown): boolean => {
  if (!isObject(err) || err.response?.status !== 401) return false;
  const url = String(err.config?.url ?? "");
  const sentToken = Boolean(err.config?.headers?.Authorization ?? err.config?.headers?.get?.("Authorization"));
  return sentToken && !CREDENTIAL_PATHS.some((p) => url.includes(p));
};

const serverMessage = (err: Record<string, any>): string | null => {
  const data = err.response?.data;
  const message = isObject(data) ? (data.message ?? data.error) : null;
  return typeof message === "string" && message.trim() ? message.trim() : null;
};

const messageForStatus = (status: number, fromServer: string | null, fallback?: string): string => {
  // A crash on the server says "Internal Server Error" — never show that to a person.
  if (status >= 500 && status !== 502 && status !== 503 && status !== 504) return SERVER_MESSAGE;
  return fromServer ?? BY_STATUS[status] ?? fallback ?? SERVER_MESSAGE;
};

// Fired when the server stops accepting the saved login token (see services/api.ts).
export const SESSION_EXPIRED_EVENT = "nyaymitra:session-expired";

// For the few places that use fetch() instead of axios (the streaming chat): turns a failed
// response into an Error carrying a message a person can act on.
export const failedResponseError = async (res: Response): Promise<Error> => {
  const body = await res.json().catch(() => null);
  const fromServer = isObject(body) && typeof body.message === "string" && body.message.trim() ? body.message.trim() : null;

  if (res.status === 401 && localStorage.getItem("token")) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    return new Error(SESSION_EXPIRED_MESSAGE);
  }
  return new Error(messageForStatus(res.status, fromServer));
};

// `fallback` is what the person was trying to do ("Couldn't rename this chat"); it is only used
// when nothing more specific is known, so it never hides a useful server message.
export const apiErrorMessage = (err: unknown, fallback?: string): string => {
  if (isNetworkError(err)) {
    return isObject(err) && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") ? TIMEOUT_MESSAGE : NETWORK_MESSAGE;
  }
  if (!isObject(err)) return fallback ?? SERVER_MESSAGE;

  if (err.response) {
    if (isSessionError(err)) return SESSION_EXPIRED_MESSAGE;
    return messageForStatus(err.response.status, serverMessage(err), fallback);
  }

  // Already a failure we produced (a thunk's rejectWithValue, or an Error we threw ourselves).
  if (typeof err.message === "string" && err.message.trim()) return err.message;
  return fallback ?? SERVER_MESSAGE;
};

export const toApiFailure = (err: unknown): ApiFailure => ({
  message: apiErrorMessage(err),
  status: apiErrorStatus(err),
});
