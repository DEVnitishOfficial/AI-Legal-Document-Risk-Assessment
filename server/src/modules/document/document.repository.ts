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

export const getUserDocuments = async (userId: number) => {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const markDocumentAnalyzed = async (
  documentId: number,
  title: string | null,
  documentType: string
) => {
  return prisma.document.update({
    where: { id: documentId },
    data: { status: "completed", title, documentType },
  });
};

export const markDocumentFailed = async (documentId: number) => {
  return prisma.document.update({
    where: { id: documentId },
    data: { status: "failed" },
  });
};