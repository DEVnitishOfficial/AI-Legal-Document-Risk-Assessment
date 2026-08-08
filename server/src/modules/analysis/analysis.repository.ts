import { prisma } from "../../config/db";

export const createAnalysis = async (
    documentId: number,
    summary: string,
    riskLevel: string
) => {
    return prisma.analysis.create({
        data: { documentId, summary, riskLevel },
    });
};

export const getDocumentById = async (documentId: number) => {
    return prisma.document.findUnique({ where: { id: documentId } });
};