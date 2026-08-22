import { Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { decideNextStep, ChatTurn } from "./legal-agent.service";
import {
    createConversation,
    listConversations,
    getConversationWithMessages,
    appendMessage,
    setConversationTitle,
    linkDocumentToConversation,
    getConversationDocumentsText,
} from "./legal-agent.repository";

const getOwnedConversation = async (conversationId: number, userId?: number) => {
    const conversation = await getConversationWithMessages(conversationId);

    if (!conversation) {
        throw new AppError("Conversation not found", 404);
    }
    if (conversation.userId !== userId) {
        throw new AppError("Not authorized to access this conversation", 403);
    }

    return conversation;
};

export const createConversationHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const language = req.body?.language === "hi" ? "hi" : "en";
        const conversation = await createConversation(req.user?.id, language);

        res.status(201).json({ success: true, data: { conversation } });
    } catch (err) {
        next(err);
    }
};

export const listConversationsHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const conversations = await listConversations(req.user?.id);
        res.json({ success: true, data: { conversations } });
    } catch (err) {
        next(err);
    }
};

export const getConversationHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const conversationId = Number(req.params.id);
        const conversation = await getOwnedConversation(conversationId, req.user?.id);

        res.json({ success: true, data: { conversation } });
    } catch (err) {
        next(err);
    }
};

export const attachDocumentHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const conversationId = Number(req.params.id);
        const { documentId } = req.body;

        if (!documentId) {
            throw new AppError("documentId is required", 400);
        }

        await getOwnedConversation(conversationId, req.user?.id);
        const link = await linkDocumentToConversation(conversationId, Number(documentId));

        res.status(201).json({ success: true, data: { link } });
    } catch (err) {
        next(err);
    }
};

export const sendMessageHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const conversationId = Number(req.params.id);
        const { content } = req.body;

        if (!content || typeof content !== "string" || !content.trim()) {
            throw new AppError("content is required", 400);
        }

        const conversation = await getOwnedConversation(conversationId, req.user?.id);
        const language = conversation.language === "hi" ? "hi" : "en";

        const history: ChatTurn[] = [
            ...conversation.messages.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
            { role: "user", content },
        ];

        // Best-effort document context: a failed extraction (e.g. a
        // scanned/image-only PDF pdf-parse can't read) shouldn't block the
        // chat turn, just means that document's content is unavailable.
        const attachedDocs = await getConversationDocumentsText(conversationId);
        const documentTexts = await Promise.all(
            attachedDocs.map(async (doc) => {
                try {
                    const text = doc.filePath
                        ? await extractTextFromPDF(doc.filePath)
                        : doc.content ?? "";
                    return `Document "${doc.title ?? doc.filePath ?? "attached document"}":\n${text.slice(0, 3000)}`;
                } catch (err) {
                    console.error(`Failed to read attached document ${doc.id}:`, err);
                    return "";
                }
            })
        );
        const documentContext = documentTexts.filter(Boolean).join("\n\n");

        const result = await decideNextStep(history, language, documentContext);

        await appendMessage(conversationId, { role: "user", content, kind: "text" });

        const assistantMessage =
            result.type === "clarify"
                ? await appendMessage(conversationId, {
                      role: "assistant",
                      content: result.question,
                      kind: "clarify",
                      clarifyOptions: result.options,
                  })
                : await appendMessage(conversationId, {
                      role: "assistant",
                      content: result.content,
                      kind: "text",
                      citations: result.citations,
                  });

        if (!conversation.title) {
            await setConversationTitle(conversationId, content.trim().slice(0, 60));
        }

        res.json({ success: true, data: { result, message: assistantMessage[0] } });
    } catch (err) {
        console.error("Error occurred while sending legal-agent message:", err);
        next(err);
    }
};
