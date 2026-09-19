import fs from "fs";
import path from "path";
import { AppError } from "../../common/errors/AppError";
import { removeUploadedFile } from "../../common/utils/files";
import { env } from "../../config/env";
import * as repo from "./advocate.repository";
import {
  AI_CREDENTIAL_TYPES,
  DEFAULT_AI_CONFIG,
  DEFAULT_AI_PROFILE,
  HUMAN_CREDENTIAL_TYPES,
} from "./advocate.constants";
import {
  optBool,
  optInt,
  optOneOf,
  optString,
  oneOf,
  parseAiConfig,
  reqString,
  stringList,
} from "./advocate.validation";

type AdvocateRecord = NonNullable<Awaited<ReturnType<typeof repo.findAdvocateById>>>;

export const PHOTO_DIR = path.resolve("uploads", "advocates");
const PHOTO_URL_PREFIX = "/uploads/advocates/";

const photoUrlOf = (stored: string | null) => (stored ? `${env.SERVER_URL}${stored}` : null);

// ── Output shapes ───────────────────────────────────────────────────────────

const credentialShape = (c: AdvocateRecord["credentials"][number]) => ({
  id: c.id,
  type: c.type,
  title: c.title,
  issuer: c.issuer,
  year: c.year,
  identifier: c.identifier,
  documentUrl: c.documentUrl,
  verified: c.verified,
});

const baseShape = (a: AdvocateRecord) => ({
  id: a.id,
  kind: a.kind,
  displayName: a.displayName,
  slug: a.slug,
  photoUrl: photoUrlOf(a.photoUrl),
  headline: a.headline,
  bio: a.bio,
  languages: a.languages,
  practiceAreas: a.practiceAreas,
  courts: a.courts,
  statesCovered: a.statesCovered,
  yearsExperience: a.yearsExperience,
  verificationStatus: a.verificationStatus,
  verifiedAt: a.verifiedAt,
  acceptingConsultations: a.acceptingConsultations,
  credentials: a.credentials.map(credentialShape),
});

// What any signed-in user may see. Never exposes the model, prompt or config.
export const publicShape = (a: AdvocateRecord) => baseShape(a);

// What the admin panel sees: everything, including the AI configuration.
export const adminShape = (a: AdvocateRecord) => ({
  ...baseShape(a),
  status: a.status,
  sortOrder: a.sortOrder,
  aiConfig: a.aiConfig,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

// ── Reads ──────────────────────────────────────────────────────────────────

export const listPublicAdvocates = async () =>
  (await repo.listAdvocates({ status: "ACTIVE" })).map(publicShape);

export const getPublicAdvocate = async (slug: string) => {
  const a = await repo.findAdvocateBySlug(slug);
  if (!a || a.status !== "ACTIVE") throw new AppError("Advocate not found", 404);
  return publicShape(a);
};

export const listAdminAdvocates = async () => (await repo.listAdvocates()).map(adminShape);

const getOrThrow = async (id: number): Promise<AdvocateRecord> => {
  if (!Number.isInteger(id)) throw new AppError("Invalid advocate id", 400);
  const a = await repo.findAdvocateById(id);
  if (!a) throw new AppError("Advocate not found", 404);
  return a;
};

export const getAdminAdvocate = async (id: number) => adminShape(await getOrThrow(id));

// ── Create / update ─────────────────────────────────────────────────────────

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "advocate";

const uniqueSlug = async (name: string) => {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await repo.slugExists(slug); i++) slug = `${base}-${i}`;
  return slug;
};

const parseProfile = (body: any) => ({
  headline: optString(body.headline, "headline", 200),
  bio: optString(body.bio, "bio", 2000),
  languages: stringList(body.languages, "languages"),
  practiceAreas: stringList(body.practiceAreas, "practiceAreas"),
  courts: stringList(body.courts, "courts"),
  statesCovered: stringList(body.statesCovered, "statesCovered"),
  yearsExperience: optInt(body.yearsExperience, "yearsExperience", 0, 70),
  sortOrder: optInt(body.sortOrder, "sortOrder", 0, 1000),
});

const dropUndefined = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export const createAdvocate = async (body: any) => {
  const kind = oneOf(body.kind, "kind", ["AI", "HUMAN"] as const);
  const displayName = reqString(body.displayName, "displayName", 100);
  const profile = dropUndefined(parseProfile(body));

  const isAi = kind === "AI";
  const advocate = await repo.createAdvocate({
    kind,
    displayName,
    slug: await uniqueSlug(displayName),
    ...(profile as any),
    // Always starts as a draft: nothing is published until the admin reviews
    // it (and, for humans, verifies enrolment).
    status: "DRAFT",
    acceptingConsultations: false,
    ...(isAi ? { aiConfig: { create: { ...DEFAULT_AI_CONFIG, ...parseAiConfig(body.aiConfig ?? {}) } } } : {}),
  });

  return adminShape(advocate);
};

export const updateAdvocate = async (id: number, body: any, adminId: number) => {
  const current = await getOrThrow(id);
  const data: Record<string, unknown> = dropUndefined({
    displayName: body.displayName === undefined ? undefined : reqString(body.displayName, "displayName", 100),
    ...parseProfile(body),
  });

  const status = optOneOf(body.status, "status", ["DRAFT", "ACTIVE", "DISABLED"] as const);
  const verification = optOneOf(body.verificationStatus, "verificationStatus", ["UNVERIFIED", "VERIFIED"] as const);
  const accepting = optBool(body.acceptingConsultations, "acceptingConsultations");

  const nextVerification = verification ?? current.verificationStatus;
  let nextStatus = status ?? current.status;
  let nextAccepting = accepting ?? current.acceptingConsultations;

  // Trust rule: a human advocate is only shown to the public once an admin
  // has verified their enrolment.
  if (current.kind === "HUMAN" && verification === "VERIFIED" && current.verificationStatus !== "VERIFIED") {
    if ((await repo.countVerifiedEnrolments(id)) === 0) {
      throw new AppError(
        "Add the advocate's Bar Council enrolment and mark it verified (after checking it against the Bar Council record) before verifying the advocate",
        400
      );
    }
  }
  if (current.kind === "HUMAN" && nextVerification !== "VERIFIED") {
    if (nextStatus === "ACTIVE" || nextAccepting) {
      throw new AppError("A human advocate must be verified before being published or accepting consultations", 400);
    }
  }
  if (nextStatus !== "ACTIVE" && accepting === true) {
    throw new AppError("Only an active advocate can accept consultations", 400);
  }
  if (nextStatus !== "ACTIVE") nextAccepting = false;

  if (status !== undefined) data.status = nextStatus;
  data.acceptingConsultations = nextAccepting;

  if (verification !== undefined && verification !== current.verificationStatus) {
    data.verificationStatus = verification;
    data.verifiedAt = verification === "VERIFIED" ? new Date() : null;
    data.verifiedById = verification === "VERIFIED" ? adminId : null;
  }

  return adminShape(await repo.updateAdvocate(id, data as any));
};

export const deleteAdvocate = async (id: number) => {
  const a = await getOrThrow(id);
  await repo.deleteAdvocate(id);
  if (a.photoUrl) await removeUploadedFile(path.join(PHOTO_DIR, path.basename(a.photoUrl)));
};

// ── Credentials ─────────────────────────────────────────────────────────────

const credentialData = (body: any, kind: "AI" | "HUMAN", partial: boolean) => {
  const allowed = kind === "AI" ? AI_CREDENTIAL_TYPES : HUMAN_CREDENTIAL_TYPES;
  const type = partial ? optOneOf(body.type, "type", allowed) : oneOf(body.type, "type", allowed);

  return dropUndefined({
    type,
    title: partial && body.title === undefined ? undefined : reqString(body.title, "title", 160),
    issuer: optString(body.issuer, "issuer", 160),
    year: optInt(body.year, "year", 1900, new Date().getFullYear()),
    identifier: optString(body.identifier, "identifier", 120),
    documentUrl: optString(body.documentUrl, "documentUrl", 500),
    verified: optBool(body.verified, "verified"),
    sortOrder: optInt(body.sortOrder, "sortOrder", 0, 1000),
  });
};

export const addCredential = async (advocateId: number, body: any) => {
  const a = await getOrThrow(advocateId);
  await repo.addCredential(advocateId, credentialData(body, a.kind, false) as any);
  return adminShape(await getOrThrow(advocateId));
};

const getOwnedCredential = async (advocateId: number, credentialId: number) => {
  const c = Number.isInteger(credentialId) ? await repo.findCredential(credentialId) : null;
  if (!c || c.advocateId !== advocateId) throw new AppError("Credential not found", 404);
  return c;
};

export const updateCredential = async (advocateId: number, credentialId: number, body: any) => {
  const a = await getOrThrow(advocateId);
  const current = await getOwnedCredential(advocateId, credentialId);
  const data = credentialData(body, a.kind, true) as any;

  // Un-checking (or re-typing) the only checked enrolment would leave a
  // verified advocate with nothing backing that verification.
  const stopsBeingVerifiedEnrolment =
    current.type === "ENROLMENT" &&
    current.verified &&
    (data.verified === false || (data.type !== undefined && data.type !== "ENROLMENT"));
  if (a.kind === "HUMAN" && a.verificationStatus === "VERIFIED" && stopsBeingVerifiedEnrolment) {
    if ((await repo.countVerifiedEnrolments(advocateId)) <= 1) {
      throw new AppError("Unverify this advocate before changing their only verified enrolment", 400);
    }
  }

  await repo.updateCredential(credentialId, data);
  return adminShape(await getOrThrow(advocateId));
};

export const deleteCredential = async (advocateId: number, credentialId: number) => {
  const a = await getOrThrow(advocateId);
  const c = await getOwnedCredential(advocateId, credentialId);

  // Removing the last checked enrolment of a verified human would leave a
  // published advocate with nothing to trust.
  if (a.kind === "HUMAN" && c.type === "ENROLMENT" && c.verified && a.verificationStatus === "VERIFIED") {
    if ((await repo.countVerifiedEnrolments(advocateId)) <= 1) {
      throw new AppError("Unverify this advocate before removing their only verified enrolment", 400);
    }
  }

  await repo.deleteCredential(credentialId);
  return adminShape(await getOrThrow(advocateId));
};

// ── AI configuration ────────────────────────────────────────────────────────

export const updateAiConfig = async (advocateId: number, body: any) => {
  const a = await getOrThrow(advocateId);
  if (a.kind !== "AI" || !a.aiConfig) throw new AppError("Only an AI advocate has an AI configuration", 400);

  const changes = parseAiConfig(body ?? {});
  if (Object.keys(changes).length === 0) throw new AppError("Nothing to update", 400);

  await repo.upsertAiConfig(advocateId, changes);
  return adminShape(await getOrThrow(advocateId));
};

// ── Photo ───────────────────────────────────────────────────────────────────

// multer trusts the client-declared mimetype, so check the file's real magic bytes.
const looksLikeImage = async (filePath: string) => {
  const fh = await fs.promises.open(filePath, "r");
  try {
    const buf = Buffer.alloc(12);
    await fh.read(buf, 0, 12, 0);
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
    return jpeg || png || webp;
  } finally {
    await fh.close();
  }
};

export const setPhoto = async (advocateId: number, file?: Express.Multer.File) => {
  if (!file) throw new AppError("No image uploaded", 400);

  try {
    await getOrThrow(advocateId);
    if (!(await looksLikeImage(file.path))) {
      throw new AppError("File is not a valid JPEG, PNG or WebP image", 400);
    }
  } catch (err) {
    await removeUploadedFile(file.path);
    throw err;
  }

  const previous = (await repo.findAdvocateById(advocateId))?.photoUrl;
  const updated = await repo.updateAdvocate(advocateId, { photoUrl: `${PHOTO_URL_PREFIX}${file.filename}` });
  if (previous) await removeUploadedFile(path.join(PHOTO_DIR, path.basename(previous)));

  return adminShape(updated);
};

export const removePhoto = async (advocateId: number) => {
  const a = await getOrThrow(advocateId);
  const updated = await repo.updateAdvocate(advocateId, { photoUrl: null });
  if (a.photoUrl) await removeUploadedFile(path.join(PHOTO_DIR, path.basename(a.photoUrl)));
  return adminShape(updated);
};

// ── Startup ─────────────────────────────────────────────────────────────────

// Guarantees the platform's own AI advocate exists so the feature works out of
// the box. Created once; after that it is the admin's to edit.
export const ensureDefaultAiAdvocate = async () => {
  if ((await repo.countByKind("AI")) > 0) return;

  await repo.createAdvocate({
    kind: "AI",
    ...DEFAULT_AI_PROFILE,
    slug: await uniqueSlug(DEFAULT_AI_PROFILE.displayName),
    status: "ACTIVE",
    acceptingConsultations: true,
    aiConfig: { create: { ...DEFAULT_AI_CONFIG } },
  });
  console.log("Created default AI advocate");
};

// Keeps every AI advocate's "knowledge source" credentials in step with what is
// actually loaded in the knowledge base — so the profile never claims an Act it
// can't retrieve. Only system-written ("auto:") credentials are replaced.
export const syncAiKnowledgeCredentials = async (
  loaded: { actShort: string; act: string | null; sections: number; sourceDomain: string | null }[]
) => {
  const today = new Date();
  const rows = [
    ...loaded.map((a, i) => ({
      type: "KNOWLEDGE_SOURCE" as const,
      title: `${a.act ?? a.actShort} (${a.sections} sections)`,
      issuer: a.sourceDomain,
      identifier: `auto:${a.actShort}`,
      verified: true,
      sortOrder: 10 + i,
    })),
    {
      type: "LAST_VERIFIED" as const,
      title: `Knowledge base refreshed ${today.toISOString().slice(0, 10)}`,
      issuer: null,
      year: today.getFullYear(),
      identifier: "auto:last-ingest",
      verified: true,
      sortOrder: 5,
    },
  ];

  const advocates = await repo.listAdvocates({ kind: "AI" });
  for (const a of advocates) await repo.replaceAutoCredentials(a.id, rows);
};
