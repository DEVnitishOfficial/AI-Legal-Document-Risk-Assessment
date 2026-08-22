import { prisma } from "../../config/db";
import { Prisma } from "../../generated/prisma/client";

export const createConversation = async (userId: number, language: string) => {
    return prisma.conversation.create({ data: { userId, language } });
};

export const listConversations = async (userId: number) => {
    return prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
    });
};

export const getConversationWithMessages = async (conversationId: number) => {
    return prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
    });
};

export const appendMessage = async (
    conversationId: number,
    data: {
        role: string;
        content: string;
        kind?: string;
        clarifyOptions?: Prisma.InputJsonValue;
        citations?: Prisma.InputJsonValue;
    }
) => {
    return prisma.$transaction([
        prisma.message.create({ data: { conversationId, ...data } }),
        prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        }),
    ]);
};

export const setConversationTitle = async (conversationId: number, title: string) => {
    return prisma.conversation.update({ where: { id: conversationId }, data: { title } });
};

export const updateConversationLanguage = async (conversationId: number, language: string) => {
    return prisma.conversation.update({ where: { id: conversationId }, data: { language } });
};

export const linkDocumentToConversation = async (conversationId: number, documentId: number) => {
    return prisma.conversationDocument.upsert({
        where: { conversationId_documentId: { conversationId, documentId } },
        update: {},
        create: { conversationId, documentId },
    });
};

export const getConversationDocumentsText = async (conversationId: number) => {
    const links = await prisma.conversationDocument.findMany({
        where: { conversationId },
        include: { document: true },
    });

    return links.map((l) => l.document);
};
