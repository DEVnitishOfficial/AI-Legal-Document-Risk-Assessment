import { prisma } from "../../config/db";

export const createDocument = async (
  userId: number,
  filePath: string
) => {
  return prisma.document.create({
    data: { userId, filePath },
  });
};

export const createTextDocument = async (
  userId: number,
  content: string
) => {
  return prisma.document.create({
    data: { userId, content, status: "pending" },
  });
};

export const getDocumentById = async (documentId: number) => {
  return prisma.document.findUnique({ where: { id: documentId } });
};

export const getUserDocuments = async (userId: number) => {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    // Only the risk summary — the Documents grid shows a verdict chip per
    // card without needing the full analysis payload.
    include: { analysis: { select: { riskLevel: true, riskScore: true } } },
    // The list never displays document text, and pasted documents can be
    // large — the Dashboard and Documents pages both fetch this on every visit.
    omit: { content: true },
  });
};

export const updateDocument = async (
  documentId: number,
  data: { title?: string; isFavorite?: boolean }
) => {
  return prisma.document.update({
    where: { id: documentId },
    data,
    omit: { content: true },
  });
};

// Analysis and ConversationDocument rows go with it (onDelete: Cascade).
export const deleteDocument = async (documentId: number) => {
  return prisma.document.delete({ where: { id: documentId } });
};

export const markDocumentAnalyzed = async (
  documentId: number,
  title: string | null,
  documentType: string
) => {
  // Documents start with no title, so an existing one was set by the user
  // (renamed before the first analysis) — never overwrite it with the AI's.
  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true },
  });

  return prisma.document.update({
    where: { id: documentId },
    data: { status: "completed", title: existing?.title ?? title, documentType },
  });
};

export const markDocumentFailed = async (documentId: number) => {
  return prisma.document.update({
    where: { id: documentId },
    data: { status: "failed" },
  });
};