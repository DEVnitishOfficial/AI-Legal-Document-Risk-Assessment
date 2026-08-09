import { prisma } from "../../config/db";

export interface AnalysisData {
    summary: string;
    riskLevel: string;
    riskScore: number;
    clauses: string[];
    riskItems: any;
}

export const createAnalysis = async (documentId: number, data: AnalysisData) => {
    // A document can only have one analysis (documentId is unique), so
    // re-running analysis on an already-analyzed document must overwrite
    // the existing row instead of colliding with the unique constraint.
    return prisma.analysis.upsert({
        where: { documentId },
        update: data,
        create: { documentId, ...data },
    });
};

export const getDocumentById = async (documentId: number) => {
    return prisma.document.findUnique({
        where: { id: documentId },
        include: { analysis: true },
    });
};