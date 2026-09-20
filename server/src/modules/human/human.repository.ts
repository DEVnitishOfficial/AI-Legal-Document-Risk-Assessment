import { prisma } from "../../config/db";
import type { Prisma } from "../../generated/prisma/client";

type Status = "REQUESTED" | "ACCEPTED" | "LIVE" | "ENDED" | "DECLINED" | "EXPIRED" | "CANCELLED" | "FAILED" | "LOBBY";

const withParties = {
    advocate: { select: { id: true, userId: true, displayName: true, photoUrl: true } },
    user: { select: { id: true, name: true } },
} satisfies Prisma.ConsultationInclude;

export type HumanConsultation = NonNullable<Awaited<ReturnType<typeof findById>>>;

export const findById = (id: number) => prisma.consultation.findUnique({ where: { id }, include: withParties });

export const create = (data: Prisma.ConsultationUncheckedCreateInput) =>
    prisma.consultation.create({ data, include: withParties });

// Moves a consultation between statuses only if it is still in one of the expected
// ones, so two simultaneous actions (accept + cancel, end + end) cannot both win.
export const transition = async (
    id: number,
    from: Status[],
    data: Prisma.ConsultationUncheckedUpdateManyInput
): Promise<boolean> => {
    const res = await prisma.consultation.updateMany({ where: { id, status: { in: from } }, data });
    return res.count === 1;
};

export const update = (id: number, data: Prisma.ConsultationUncheckedUpdateInput) =>
    prisma.consultation.update({ where: { id }, data });

export const findAdvocateByUserId = (userId: number) =>
    prisma.advocate.findUnique({
        where: { userId },
        select: {
            id: true,
            kind: true,
            status: true,
            verificationStatus: true,
            acceptingConsultations: true,
            displayName: true,
            photoUrl: true,
            userId: true,
        },
    });

export const pendingForAdvocate = (advocateId: number) =>
    prisma.consultation.findMany({
        where: { advocateId, status: "REQUESTED" },
        orderBy: { requestedAt: "asc" },
        include: withParties,
    });

export const activeForAdvocate = (advocateId: number) =>
    prisma.consultation.findMany({
        where: { advocateId, status: { in: ["ACCEPTED", "LIVE"] } },
        orderBy: { id: "desc" },
        include: withParties,
    });

export const historyForAdvocate = (advocateId: number) =>
    prisma.consultation.findMany({
        where: { advocateId, status: { in: ["ENDED", "DECLINED", "EXPIRED", "CANCELLED"] } },
        orderBy: { id: "desc" },
        take: 50,
        include: withParties,
    });

export const countPending = (advocateId: number) =>
    prisma.consultation.count({ where: { advocateId, status: "REQUESTED" } });

export const busyAdvocateIds = async (ids: number[]): Promise<Set<number>> => {
    if (ids.length === 0) return new Set();
    const rows = await prisma.consultation.findMany({
        where: { advocateId: { in: ids }, status: { in: ["ACCEPTED", "LIVE"] } },
        select: { advocateId: true },
    });
    return new Set(rows.map((r) => r.advocateId).filter((x): x is number => x !== null));
};

export const openForUser = (userId: number) =>
    prisma.consultation.findFirst({
        where: { userId, status: { in: ["LOBBY", "LIVE", "REQUESTED", "ACCEPTED"] } },
        orderBy: { id: "desc" },
    });

// ── used by the sweeper ─────────────────────────────────────────────────────

export const staleRequests = (olderThan: Date) =>
    prisma.consultation.findMany({
        where: { advocateKind: "HUMAN", status: "REQUESTED", requestedAt: { lt: olderThan } },
        include: withParties,
    });

export const staleAccepted = (olderThan: Date) =>
    prisma.consultation.findMany({
        where: { advocateKind: "HUMAN", status: "ACCEPTED", respondedAt: { lt: olderThan } },
        include: withParties,
    });

export const liveHuman = () =>
    prisma.consultation.findMany({ where: { advocateKind: "HUMAN", status: "LIVE" }, include: withParties });
