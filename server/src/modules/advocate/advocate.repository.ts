import { prisma } from "../../config/db";
import type { Prisma } from "../../generated/prisma/client";

const withDetails = {
  credentials: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  aiConfig: true,
} satisfies Prisma.AdvocateInclude;

export const listAdvocates = (where: Prisma.AdvocateWhereInput = {}) =>
  prisma.advocate.findMany({
    where,
    include: withDetails,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

export const findAdvocateById = (id: number) =>
  prisma.advocate.findUnique({ where: { id }, include: withDetails });

export const findAdvocateBySlug = (slug: string) =>
  prisma.advocate.findUnique({ where: { slug }, include: withDetails });

export const slugExists = async (slug: string) =>
  (await prisma.advocate.count({ where: { slug } })) > 0;

export const countByKind = (kind: "AI" | "HUMAN") => prisma.advocate.count({ where: { kind } });

export const createAdvocate = (
  data: Prisma.AdvocateCreateInput
) => prisma.advocate.create({ data, include: withDetails });

export const updateAdvocate = (id: number, data: Prisma.AdvocateUpdateInput) =>
  prisma.advocate.update({ where: { id }, data, include: withDetails });

export const deleteAdvocate = (id: number) => prisma.advocate.delete({ where: { id } });

export const addCredential = (advocateId: number, data: Omit<Prisma.AdvocateCredentialUncheckedCreateInput, "advocateId">) =>
  prisma.advocateCredential.create({ data: { ...data, advocateId } });

export const findCredential = (id: number) => prisma.advocateCredential.findUnique({ where: { id } });

export const updateCredential = (id: number, data: Prisma.AdvocateCredentialUpdateInput) =>
  prisma.advocateCredential.update({ where: { id }, data });

export const deleteCredential = (id: number) => prisma.advocateCredential.delete({ where: { id } });

// Enrolments an admin has actually checked against the Bar Council record.
export const countVerifiedEnrolments = (advocateId: number) =>
  prisma.advocateCredential.count({ where: { advocateId, type: "ENROLMENT", verified: true } });

export const upsertAiConfig = (
  advocateId: number,
  data: Partial<{
    model: string;
    voice: string;
    temperature: number;
    personaPrompt: string;
    maxSessionMinutes: number;
    ragConfig: Prisma.InputJsonValue;
  }>
) =>
  prisma.advocateAiConfig.update({
    where: { advocateId },
    // Every admin edit bumps the version so a session can record which
    // configuration it ran under.
    data: { ...data, version: { increment: 1 } },
  });

// Credentials written by the system (e.g. after a statute ingest) carry an
// "auto:" identifier so they can be refreshed without touching anything an
// admin entered by hand.
export const replaceAutoCredentials = (
  advocateId: number,
  rows: Omit<Prisma.AdvocateCredentialUncheckedCreateInput, "advocateId">[]
) =>
  prisma.$transaction([
    prisma.advocateCredential.deleteMany({ where: { advocateId, identifier: { startsWith: "auto:" } } }),
    prisma.advocateCredential.createMany({ data: rows.map((r) => ({ ...r, advocateId })) }),
  ]);
