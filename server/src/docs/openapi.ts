import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Must run before any schema below calls `.openapi()` — it patches
// ZodType's prototype, so it only needs to happen once, before use (not
// before the schemas themselves are *defined* elsewhere; method lookup is
// dynamic, so import order of the schema files below doesn't matter).
extendZodWithOpenApi(z);

import { registerBodySchema, loginBodySchema } from "../modules/user/user.schema";
import { sendOtpBodySchema, verifyOtpBodySchema } from "../modules/otp/otp.schema";
import { createTextBodySchema, updateDocumentBodySchema } from "../modules/document/document.schema";
import { runAnalysisBodySchema } from "../modules/analysis/analysis.schema";
import {
  createConversationBodySchema,
  updateConversationBodySchema,
  sendMessageBodySchema,
  attachDocumentBodySchema,
} from "../modules/legal-agent/legal-agent.schema";
import { idParamSchema } from "../common/schemas/common.schema";

const registry = new OpenAPIRegistry();

const BEARER_AUTH = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "The token returned by login/register/OTP-verify. Sent as `Authorization: Bearer <token>`.",
}).name;

const authed = [{ [BEARER_AUTH]: [] }];

// ── Shared response shapes ─────────────────────────────────────────────────
// This codebase answers everything as either { success: true, data/message }
// or { success: false, message }, so these two wrappers cover almost every
// response in the API — only the few per-endpoint `data` shapes vary.
const ok = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data }).openapi({});
const okMessage = z.object({ success: z.literal(true), message: z.string() }).openapi({});
const errorResponse = z.object({ success: z.literal(false), message: z.string() }).openapi({});

const jsonResponses = <T extends z.ZodTypeAny>(status: number, description: string, schema: T) => ({
  [status]: { description, content: { "application/json": { schema } } },
});
const errorResponses = (...statuses: number[]) =>
  Object.fromEntries(
    statuses.map((s) => [
      s,
      { description: ERROR_DESCRIPTIONS[s] ?? "Error", content: { "application/json": { schema: errorResponse } } },
    ])
  );
const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: "Validation error — the message names the problem field.",
  401: "Missing, invalid, or expired token.",
  403: "Authenticated, but not allowed to do this (wrong owner, or not an admin).",
  404: "Not found.",
  409: "Conflict (e.g. an account already exists with this email/phone).",
  429: "Rate limited — slow down and try again shortly.",
};

// ── Fully-documented endpoints ──────────────────────────────────────────────
// These reuse the exact zod schemas validate.middleware.ts enforces at the
// route (see server/README.md Phase 26) — the request body shown here is
// never out of sync with what the server actually accepts, because it's
// the same schema object, not a hand-copied description of it.

const safeUser = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    role: z.enum(["USER", "ADMIN"]),
    createdAt: z.string(),
  })
  .openapi("User");

registry.registerPath({
  method: "post",
  path: "/users/register",
  tags: ["Auth"],
  summary: "Create an account",
  request: { body: { content: { "application/json": { schema: registerBodySchema } } } },
  responses: {
    ...jsonResponses(201, "Account created", ok(safeUser)),
    ...errorResponses(400, 409),
  },
});

registry.registerPath({
  method: "post",
  path: "/users/login",
  tags: ["Auth"],
  summary: "Sign in with email + password",
  request: { body: { content: { "application/json": { schema: loginBodySchema } } } },
  responses: {
    ...jsonResponses(
      200,
      "Signed in",
      ok(z.object({ user: safeUser, token: z.string() }))
    ),
    ...errorResponses(400, 401, 404),
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me",
  tags: ["Auth"],
  summary: "Get the signed-in user's own profile",
  security: authed,
  responses: {
    ...jsonResponses(200, "The current user", z.object({ success: z.literal(true), user: safeUser })),
    ...errorResponses(401, 404),
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/google",
  tags: ["Auth"],
  summary: "Start Google sign-in (browser redirect, not an API call)",
  responses: { 302: { description: "Redirects to Google" } },
});

registry.registerPath({
  method: "get",
  path: "/auth/google/callback",
  tags: ["Auth"],
  summary: "Google's redirect back after sign-in (not called directly)",
  responses: { 302: { description: "Redirects to the client, with a token on success" } },
});

registry.registerPath({
  method: "post",
  path: "/auth/otp/send",
  tags: ["Auth"],
  summary: "Send a one-time login code by SMS",
  request: { body: { content: { "application/json": { schema: sendOtpBodySchema } } } },
  responses: {
    ...jsonResponses(
      200,
      "Code sent (in local/dev mode, the response includes the code so no real SMS is needed)",
      z.object({ success: z.literal(true), message: z.string(), data: z.object({ success: z.literal(true), devCode: z.string().optional() }) })
    ),
    ...errorResponses(400, 429),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/otp/verify",
  tags: ["Auth"],
  summary: "Verify a code and sign in (creates the account on first use)",
  request: { body: { content: { "application/json": { schema: verifyOtpBodySchema } } } },
  responses: {
    ...jsonResponses(200, "Signed in", ok(z.object({ user: safeUser, token: z.string() }))),
    ...errorResponses(400, 401, 429),
  },
});

// ── Documents ────────────────────────────────────────────────────────────

const documentShape = z
  .object({
    id: z.number(),
    userId: z.number(),
    title: z.string().nullable(),
    documentType: z.string().nullable(),
    status: z.enum(["pending", "processing", "completed", "failed"]),
    filePath: z.string().nullable(),
    isFavorite: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("Document");

registry.registerPath({
  method: "post",
  path: "/documents/upload",
  tags: ["Documents"],
  summary: "Upload a PDF or photo (JPG/PNG) of a document",
  security: authed,
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ file: z.string().openapi({ type: "string", format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    ...jsonResponses(201, "Uploaded — not analyzed yet (see POST /analysis/run)", ok(z.object({ document: documentShape }))),
    ...errorResponses(400, 401),
  },
});

registry.registerPath({
  method: "post",
  path: "/documents/text",
  tags: ["Documents"],
  summary: "Create a document from pasted text (min. 50 characters)",
  security: authed,
  request: { body: { content: { "application/json": { schema: createTextBodySchema } } } },
  responses: {
    ...jsonResponses(201, "Created", ok(z.object({ document: documentShape, preview: z.string() }))),
    ...errorResponses(400, 401),
  },
});

registry.registerPath({
  method: "get",
  path: "/documents/get-documents",
  tags: ["Documents"],
  summary: "List the signed-in user's own documents",
  security: authed,
  responses: {
    ...jsonResponses(200, "The user's documents", z.object({ success: z.literal(true), data: z.array(documentShape) })),
    ...errorResponses(401),
  },
});

registry.registerPath({
  method: "get",
  path: "/documents/{id}",
  tags: ["Documents"],
  summary: "Get one document, with its extracted/pasted text",
  security: authed,
  request: { params: idParamSchema() },
  responses: {
    ...jsonResponses(200, "The document", ok(z.object({ document: documentShape, content: z.string() }))),
    ...errorResponses(400, 401, 403, 404),
  },
});

registry.registerPath({
  method: "get",
  path: "/documents/{id}/file",
  tags: ["Documents"],
  summary: "Stream the original uploaded file (PDF/image), for in-app viewing",
  security: authed,
  request: { params: idParamSchema() },
  responses: {
    200: { description: "The raw file" },
    ...errorResponses(400, 401, 403, 404),
  },
});

registry.registerPath({
  method: "patch",
  path: "/documents/{id}",
  tags: ["Documents"],
  summary: "Rename a document or toggle its favorite flag",
  security: authed,
  request: {
    params: idParamSchema(),
    body: { content: { "application/json": { schema: updateDocumentBodySchema } } },
  },
  responses: {
    ...jsonResponses(200, "Updated", ok(z.object({ document: documentShape }))),
    ...errorResponses(400, 401, 403, 404),
  },
});

registry.registerPath({
  method: "delete",
  path: "/documents/{id}",
  tags: ["Documents"],
  summary: "Delete a document (and its analysis, if any)",
  security: authed,
  request: { params: idParamSchema() },
  responses: {
    ...jsonResponses(200, "Deleted", okMessage),
    ...errorResponses(400, 401, 403, 404),
  },
});

// ── Analysis ─────────────────────────────────────────────────────────────

const analysisShape = z
  .object({
    id: z.number(),
    documentId: z.number(),
    summary: z.string(),
    riskLevel: z.enum(["Low", "Medium", "High"]),
    riskScore: z.number(),
    clauses: z.array(z.string()),
    riskItems: z.array(
      z.object({ clause: z.string(), severity: z.string(), category: z.string(), explanation: z.string() })
    ),
    createdAt: z.string(),
  })
  .openapi("Analysis");

registry.registerPath({
  method: "post",
  path: "/analysis/run",
  tags: ["Analysis"],
  summary: "Start (or poll) a document's background risk analysis",
  description:
    "Runs in the background (BullMQ) — this always answers immediately. The client is expected to poll this " +
    "same endpoint every couple of seconds: it returns `{status:\"queued\"}` while the job runs, the full " +
    "analysis once it finishes (`cached` tells you whether this call started the job or found it already " +
    "done), or `{failed:true}` after the configured retries are exhausted. `retry:true` restarts a " +
    "previously-failed analysis — only send it on the first poll of a fresh attempt, never on routine polls.",
  security: authed,
  request: { body: { content: { "application/json": { schema: runAnalysisBodySchema } } } },
  responses: {
    ...jsonResponses(
      200,
      "Already analyzed (cached), or a terminal failure report",
      z.union([
        ok(z.object({ analysis: analysisShape, cached: z.literal(true) })),
        ok(z.object({ failed: z.literal(true), message: z.string() })),
      ])
    ),
    ...jsonResponses(202, "Queued — poll again shortly", ok(z.object({ status: z.literal("queued") }))),
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

// ── Legal Assistant ──────────────────────────────────────────────────────

const conversationShape = z
  .object({
    id: z.number(),
    userId: z.number(),
    title: z.string().nullable(),
    language: z.enum(["en", "hi"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Conversation");

const messageShape = z
  .object({
    id: z.number(),
    conversationId: z.number(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    kind: z.enum(["text", "voice", "clarify"]),
    citations: z.array(z.object({ title: z.string(), url: z.string() })).nullable(),
    createdAt: z.string(),
  })
  .openapi("Message");

registry.registerPath({
  method: "post",
  path: "/legal-agent/conversations",
  tags: ["Legal Assistant"],
  summary: "Start a new conversation",
  security: authed,
  request: { body: { content: { "application/json": { schema: createConversationBodySchema } } } },
  responses: {
    ...jsonResponses(201, "Created", ok(z.object({ conversation: conversationShape }))),
    ...errorResponses(400, 401),
  },
});

registry.registerPath({
  method: "get",
  path: "/legal-agent/conversations",
  tags: ["Legal Assistant"],
  summary: "List the signed-in user's conversations",
  security: authed,
  responses: {
    ...jsonResponses(200, "The user's conversations", ok(z.object({ conversations: z.array(conversationShape) }))),
    ...errorResponses(401),
  },
});

registry.registerPath({
  method: "get",
  path: "/legal-agent/conversations/{id}",
  tags: ["Legal Assistant"],
  summary: "Get one conversation with its full message history",
  security: authed,
  request: { params: idParamSchema() },
  responses: {
    ...jsonResponses(
      200,
      "The conversation",
      ok(z.object({ conversation: conversationShape.extend({ messages: z.array(messageShape) }) }))
    ),
    ...errorResponses(400, 401, 403, 404),
  },
});

registry.registerPath({
  method: "patch",
  path: "/legal-agent/conversations/{id}",
  tags: ["Legal Assistant"],
  summary: "Rename a conversation or change its reply language",
  security: authed,
  request: {
    params: idParamSchema(),
    body: { content: { "application/json": { schema: updateConversationBodySchema } } },
  },
  responses: {
    ...jsonResponses(200, "Updated", ok(z.object({ conversation: conversationShape }))),
    ...errorResponses(400, 401, 403, 404),
  },
});

registry.registerPath({
  method: "delete",
  path: "/legal-agent/conversations/{id}",
  tags: ["Legal Assistant"],
  summary: "Delete a conversation",
  security: authed,
  request: { params: idParamSchema() },
  responses: {
    ...jsonResponses(200, "Deleted", okMessage),
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

registry.registerPath({
  method: "post",
  path: "/legal-agent/conversations/{id}/messages",
  tags: ["Legal Assistant"],
  summary: "Send a message and stream the reply",
  description:
    "Responds as Server-Sent Events (`text/event-stream`), not a single JSON body: a `user_message` event, " +
    "then either one `clarify` turn or a run of `delta` events as the answer streams token-by-token, then a " +
    "final `done` event with the persisted message (citations included).",
  security: authed,
  request: {
    params: idParamSchema(),
    body: { content: { "application/json": { schema: sendMessageBodySchema } } },
  },
  responses: {
    200: { description: "An SSE stream of events (see description)" },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

registry.registerPath({
  method: "post",
  path: "/legal-agent/conversations/{id}/voice-messages",
  tags: ["Legal Assistant"],
  summary: "Send a voice message (transcribed, then answered in one call — not streamed)",
  security: authed,
  request: {
    params: idParamSchema(),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ audio: z.string().openapi({ type: "string", format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    ...jsonResponses(
      200,
      "The transcribed user message and the assistant's reply",
      ok(z.object({ result: z.any(), userMessage: messageShape, message: messageShape }))
    ),
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

registry.registerPath({
  method: "get",
  path: "/legal-agent/messages/{messageId}/audio",
  tags: ["Legal Assistant"],
  summary: "Get an assistant reply as speech (synthesized once, cached after)",
  security: authed,
  request: { params: idParamSchema("messageId") },
  responses: {
    200: { description: "audio/mpeg stream" },
    ...errorResponses(400, 401, 403, 404),
  },
});

registry.registerPath({
  method: "post",
  path: "/legal-agent/conversations/{id}/documents",
  tags: ["Legal Assistant"],
  summary: "Attach one of the user's own documents to a conversation",
  security: authed,
  request: {
    params: idParamSchema(),
    body: { content: { "application/json": { schema: attachDocumentBodySchema } } },
  },
  responses: {
    ...jsonResponses(201, "Attached", ok(z.object({ link: z.any() }))),
    ...errorResponses(400, 401, 403, 404),
  },
});

// ── Everything else ──────────────────────────────────────────────────────
// Not behind a zod schema (see server/README.md Phase 26 for why: these
// modules already have their own, reasonably thorough hand-rolled
// validation — advocate.validation.ts's reqString/optString/oneOf/etc., and
// consultation/human's business-rule checks against data-driven allowlists).
// Documented here at the path level — method, auth, what it's for — so the
// full API surface is still visible in one place, without re-describing
// validation that already lives correctly elsewhere.
type SimplePathOptions = {
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  tag: string;
  summary: string;
  adminOnly?: boolean;
  extraErrors?: number[];
};

const registerSimplePath = ({ method, path, tag, summary, adminOnly, extraErrors = [] }: SimplePathOptions) => {
  registry.registerPath({
    method,
    path,
    tags: [tag],
    summary: adminOnly ? `${summary} (admin only)` : summary,
    security: authed,
    responses: {
      200: { description: "Success", content: { "application/json": { schema: z.any() } } },
      ...errorResponses(401, ...(adminOnly ? [403] : []), ...extraErrors),
    },
  });
};

// Advocates (public listing)
registerSimplePath({ method: "get", path: "/advocates", tag: "Advocates", summary: "List active advocates (AI + verified human)" });
registerSimplePath({ method: "get", path: "/advocates/{slug}", tag: "Advocates", summary: "Get one advocate's public profile", extraErrors: [404] });

// Advocates (admin)
const adminAdvocatePaths: [SimplePathOptions["method"], string, string][] = [
  ["get", "/admin/advocates", "List every advocate (draft + disabled included)"],
  ["post", "/admin/advocates", "Create an advocate profile"],
  ["get", "/admin/advocates/{id}", "Get one advocate's full admin record"],
  ["patch", "/admin/advocates/{id}", "Update an advocate's profile/status"],
  ["delete", "/admin/advocates/{id}", "Delete an advocate"],
  ["post", "/admin/advocates/{id}/credentials", "Add a credential (enrolment/degree/etc.)"],
  ["patch", "/admin/advocates/{id}/credentials/{credentialId}", "Update a credential"],
  ["delete", "/admin/advocates/{id}/credentials/{credentialId}", "Remove a credential"],
  ["put", "/admin/advocates/{id}/ai-config", "Update the AI advocate's model/voice/persona config"],
  ["post", "/admin/advocates/{id}/photo", "Upload an advocate's photo"],
  ["delete", "/admin/advocates/{id}/photo", "Remove an advocate's photo"],
  ["put", "/admin/advocates/{id}/account", "Link a human advocate to their login account"],
  ["delete", "/admin/advocates/{id}/account", "Unlink a human advocate's login account"],
];
for (const [method, path, summary] of adminAdvocatePaths) {
  registerSimplePath({ method, path, tag: "Admin · Advocates", summary, adminOnly: true, extraErrors: [404] });
}

// AI Consultations (live voice calls with the AI advocate)
const consultationPaths: [SimplePathOptions["method"], string, string][] = [
  ["get", "/consultations/options", "Get available states/languages and today's remaining minutes"],
  ["get", "/consultations", "List the user's past consultations"],
  ["post", "/consultations", "Start a consultation (creates a 'lobby', doesn't connect yet)"],
  ["get", "/consultations/{id}", "Get one consultation"],
  ["get", "/consultations/{id}/turns", "Poll the live transcript (used during an active call)"],
  ["post", "/consultations/{id}/connect", "Send a WebRTC offer, get the answer back (starts the call)"],
  ["post", "/consultations/{id}/end", "End a call"],
  ["delete", "/consultations/{id}", "Delete a consultation record and its transcript"],
];
for (const [method, path, summary] of consultationPaths) {
  registerSimplePath({ method, path, tag: "Consultations (AI)", summary, extraErrors: [403, 404] });
}

// Human consultations (client side) + Advocate Desk (advocate side)
const humanPaths: [SimplePathOptions["method"], string, string][] = [
  ["post", "/human-consultations", "Request a consultation with a real advocate"],
  ["post", "/human-consultations/{id}/cancel", "Cancel a pending request"],
  ["post", "/human-consultations/{id}/end", "End an in-progress call"],
  ["get", "/human-consultations/{id}/ice", "Get ICE/TURN servers for the call"],
];
for (const [method, path, summary] of humanPaths) {
  registerSimplePath({ method, path, tag: "Human Consultations", summary, extraErrors: [403, 404] });
}

const deskPaths: [SimplePathOptions["method"], string, string][] = [
  ["get", "/advocate-desk/whoami", "Check whether the signed-in account is a linked advocate"],
  ["get", "/advocate-desk/me", "Get the advocate's own desk state (requests, in-progress calls)"],
  ["post", "/advocate-desk/available", "Toggle 'Available now'"],
  ["get", "/advocate-desk/consultations/{id}", "Get one request/call from the advocate's side"],
  ["post", "/advocate-desk/consultations/{id}/accept", "Accept a request"],
  ["post", "/advocate-desk/consultations/{id}/decline", "Decline a request"],
  ["put", "/advocate-desk/consultations/{id}/notes", "Save private/shared notes for a call"],
];
for (const [method, path, summary] of deskPaths) {
  registerSimplePath({ method, path, tag: "Advocate Desk", summary, extraErrors: [403, 404] });
}

// RAG ingestion (admin) and Speech
registerSimplePath({ method: "post", path: "/rag/ingest", tag: "Admin · RAG", summary: "Ingest Indian Kanoon judgments (Firecrawl)", adminOnly: true });
registerSimplePath({ method: "get", path: "/rag/status", tag: "Admin · RAG", summary: "Get ingestion status" });
registerSimplePath({ method: "post", path: "/rag/ingest-statutes", tag: "Admin · RAG", summary: "Ingest official central-law statute text", adminOnly: true });
registerSimplePath({ method: "get", path: "/rag/statutes", tag: "Admin · RAG", summary: "Get statute ingestion status", adminOnly: true });
registerSimplePath({ method: "post", path: "/speech/transcribe", tag: "Speech", summary: "Transcribe an audio clip to text (Whisper), no reply generated" });

export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: "3.0.0",
  info: {
    title: "NyayMitra AI API",
    version: "1.0.0",
    description:
      "AI-Powered Legal Document Analyzer and Risk Assessment System (project name) / NyayMitra AI (product name). " +
      "Every request/response shape below for Auth, Documents, Analysis and the Legal Assistant is generated " +
      "directly from this server's real zod validation schemas (see server/README.md Phase 26) — it cannot " +
      "silently drift from what the server actually accepts. Authenticate with the `bearerAuth` scheme using " +
      "the token from login/register/OTP-verify.",
  },
  servers: [{ url: "/api/v1" }],
});
