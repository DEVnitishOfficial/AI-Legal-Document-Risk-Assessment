import { AppError } from "../../common/errors/AppError";
import {
  REALTIME_MODELS,
  REALTIME_VOICES,
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
  SESSION_MINUTES_MAX,
  SESSION_MINUTES_MIN,
} from "./advocate.constants";

const bad = (msg: string): never => {
  throw new AppError(msg, 400);
};

export const optString = (value: unknown, field: string, max: number): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return bad(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) return bad(`${field} must be ${max} characters or fewer`);
  return trimmed || null;
};

export const reqString = (value: unknown, field: string, max: number): string => {
  if (typeof value !== "string" || !value.trim()) return bad(`${field} is required`);
  if (value.trim().length > max) return bad(`${field} must be ${max} characters or fewer`);
  return value.trim();
};

export const stringList = (value: unknown, field: string, maxItems = 30, maxLen = 80): string[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return bad(`${field} must be a list`);
  if (value.length > maxItems) return bad(`${field} can have at most ${maxItems} items`);

  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return bad(`${field} must only contain text`);
    const t = item.trim();
    if (!t) continue;
    if (t.length > maxLen) return bad(`Each ${field} entry must be ${maxLen} characters or fewer`);
    seen.add(t);
  }
  return [...seen];
};

export const optInt = (value: unknown, field: string, min: number, max: number): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return bad(`${field} must be a whole number from ${min} to ${max}`);
  return n;
};

export const optBool = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return bad(`${field} must be true or false`);
  return value;
};

export const oneOf = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T => {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    return bad(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
};

export const optOneOf = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T | undefined =>
  value === undefined ? undefined : oneOf(value, field, allowed);

export interface ParsedAiConfig {
  model?: string;
  voice?: string;
  temperature?: number;
  personaPrompt?: string;
  maxSessionMinutes?: number;
  ragConfig?: { k: number; minSimilarity: number };
}

export const parseAiConfig = (body: any): ParsedAiConfig => {
  const out: ParsedAiConfig = {};

  if (body.model !== undefined) out.model = oneOf(body.model, "model", REALTIME_MODELS);
  if (body.voice !== undefined) out.voice = oneOf(body.voice, "voice", REALTIME_VOICES);

  if (body.temperature !== undefined) {
    const t = Number(body.temperature);
    if (!Number.isFinite(t) || t < TEMPERATURE_MIN || t > TEMPERATURE_MAX) {
      bad(`temperature must be between ${TEMPERATURE_MIN} and ${TEMPERATURE_MAX}`);
    }
    out.temperature = t;
  }

  if (body.personaPrompt !== undefined) {
    if (typeof body.personaPrompt !== "string") bad("personaPrompt must be text");
    if (body.personaPrompt.length > 4000) bad("personaPrompt must be 4000 characters or fewer");
    out.personaPrompt = body.personaPrompt.trim();
  }

  if (body.maxSessionMinutes !== undefined) {
    out.maxSessionMinutes = optInt(body.maxSessionMinutes, "maxSessionMinutes", SESSION_MINUTES_MIN, SESSION_MINUTES_MAX) as number;
  }

  if (body.ragConfig !== undefined) {
    const k = Number(body.ragConfig?.k);
    const min = Number(body.ragConfig?.minSimilarity);
    if (!Number.isInteger(k) || k < 1 || k > 12) bad("ragConfig.k must be a whole number from 1 to 12");
    if (!Number.isFinite(min) || min < 0 || min > 1) bad("ragConfig.minSimilarity must be between 0 and 1");
    out.ragConfig = { k, minSimilarity: min };
  }

  return out;
};
