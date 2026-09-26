import { prisma } from "../../config/db";
import type { Prisma } from "../../generated/prisma/client";

export const createConsultation = (data: Prisma.ConsultationUncheckedCreateInput) =>
    prisma.consultation.create({ data });

export const findConsultation = (id: number) => prisma.consultation.findUnique({ where: { id } });

export const updateConsultation = (id: number, data: Prisma.ConsultationUncheckedUpdateInput) =>
    prisma.consultation.update({ where: { id }, data });

export const listConsultations = (userId: number) =>
    prisma.consultation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
            id: true,
            advocateName: true,
            advocateKind: true,
            subject: true,
            state: true,
            language: true,
            status: true,
            startedAt: true,
            endedAt: true,
            durationSec: true,
            summaryStatus: true,
            createdAt: true,
        },
    });

export const deleteConsultation = (id: number) => prisma.consultation.delete({ where: { id } });

export const findOpenConsultationForUser = (userId: number) =>
    prisma.consultation.findFirst({ where: { userId, status: { in: ["LOBBY", "LIVE", "REQUESTED", "ACCEPTED"] } }, orderBy: { id: "desc" } });

// AI calls only: human calls have no server-side session to recover and are handled by the human-call sweeper.
export const findLiveConsultations = () =>
    prisma.consultation.findMany({ where: { status: "LIVE", advocateKind: "AI" } });

export const failStaleLobbies = (olderThan: Date) =>
    prisma.consultation.updateMany({
        where: { status: "LOBBY", createdAt: { lt: olderThan } },
        data: { status: "FAILED", endReason: "lobby_expired" },
    });

// Rolling 24 hours, so the daily allowance doesn't depend on the server's timezone.
export const secondsUsedSince = async (userId: number, since: Date): Promise<number> => {
    const rows = await prisma.consultation.aggregate({
        // Only AI calls cost money, so only they count against the daily allowance.
        where: { userId, status: "ENDED", advocateKind: "AI", endedAt: { gte: since } },
        _sum: { durationSec: true },
    });
    return rows._sum.durationSec ?? 0;
};

export const addTurn = (data: Prisma.ConsultationTurnUncheckedCreateInput) => prisma.consultationTurn.create({ data });

export const turnsAfter = (consultationId: number, afterId: number, take = 200) =>
    prisma.consultationTurn.findMany({
        where: { consultationId, id: { gt: afterId } },
        orderBy: { id: "asc" },
        take,
    });

export const allTurns = (consultationId: number) =>
    prisma.consultationTurn.findMany({ where: { consultationId }, orderBy: { id: "asc" } });

// Atomically moves LOBBY -> LIVE; false if another request got there first.
export const claimLobby = async (id: number): Promise<boolean> => {
    const res = await prisma.consultation.updateMany({ where: { id, status: "LOBBY" }, data: { status: "LIVE" } });
    return res.count === 1;
};
