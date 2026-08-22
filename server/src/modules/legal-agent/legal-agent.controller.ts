import fs from "fs";
import path from "path";
import { Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { decideNextStep, ChatTurn } from "./legal-agent.service";
import { transcribeAudio, synthesizeSpeech } from "../speech/speech.service";
import {
    createConversation,
    listConversations,
    getConversationWithMessages,
    appendMessage,
    setConversationTitle,
    updateConversationLanguage,
    linkDocumentToConversation,
    getConversationDocumentsText,
    getMessageById,
    setMessageAudioUrl,
} from "./legal-agent.repository";

type OwnedConversation = Awaited<ReturnType<typeof getOwnedConversation>>;

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

// Shared by the text and voice message endpoints — the only difference
// between them is how `content` was obtained (typed vs. transcribed), the
// clarify/answer/document-context/title logic is identical either way.
const processUserMessage = async (
    conversation: OwnedConversation,
    content: string,
    userMessageExtra: { kind?: string; audioUrl?: string } = {}
) => {
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
    const attachedDocs = await getConversationDocumentsText(conversation.id);
    const documentTexts = await Promise.all(
        attachedDocs.map(async (doc) => {
            try {
                const text = doc.filePath ? await extractTextFromPDF(doc.filePath) : doc.content ?? "";
                return `Document "${doc.title ?? doc.filePath ?? "attached document"}":\n${text.slice(0, 3000)}`;
            } catch (err) {
                console.error(`Failed to read attached document ${doc.id}:`, err);
                return "";
            }
        })
    );
    const documentContext = documentTexts.filter(Boolean).join("\n\n");

    const result = await decideNextStep(history, language, documentContext);

    const userMessageRow = await appendMessage(conversation.id, {
        role: "user",
        content,
        kind: userMessageExtra.kind ?? "text",
        audioUrl: userMessageExtra.audioUrl,
    });

    const assistantMessageRow =
        result.type === "clarify"
            ? await appendMessage(conversation.id, {
                  role: "assistant",
                  content: result.question,
                  kind: "clarify",
                  clarifyOptions: result.options,
              })
            : await appendMessage(conversation.id, {
                  role: "assistant",
                  content: result.content,
                  kind: "text",
                  citations: result.citations,
              });

    if (!conversation.title) {
        await setConversationTitle(conversation.id, content.trim().slice(0, 60));
    }

    return { result, userMessage: userMessageRow[0], message: assistantMessageRow[0] };
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

export const updateConversationHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const conversationId = Number(req.params.id);
        const { language } = req.body;

        if (language !== "en" && language !== "hi") {
            throw new AppError("language must be 'en' or 'hi'", 400);
        }

        await getOwnedConversation(conversationId, req.user?.id);
        const conversation = await updateConversationLanguage(conversationId, language);

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
        const { result, message } = await processUserMessage(conversation, content);

        res.json({ success: true, data: { result, message } });
    } catch (err) {
        console.error("Error occurred while sending legal-agent message:", err);
        next(err);
    }
};

export const sendVoiceMessageHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const conversationId = Number(req.params.id);

        if (!req.file) {
            throw new AppError("audio file is required", 400);
        }

        const conversation = await getOwnedConversation(conversationId, req.user?.id);
        const language = conversation.language === "hi" ? "hi" : "en";

        const transcript = await transcribeAudio(req.file.path, language);

        if (!transcript.trim()) {
            throw new AppError("Could not transcribe audio — please try again", 400);
        }

        const { result, userMessage, message } = await processUserMessage(conversation, transcript, {
            kind: "voice",
            audioUrl: req.file.path,
        });

        res.json({ success: true, data: { result, userMessage, message } });
    } catch (err) {
        console.error("Error occurred while sending legal-agent voice message:", err);
        next(err);
    }
};

export const getMessageAudioHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        const messageId = Number(req.params.messageId);
        const message = await getMessageById(messageId);

        if (!message) {
            throw new AppError("Message not found", 404);
        }

        await getOwnedConversation(message.conversationId, req.user?.id);

        // Assistant replies are text-only when created — synthesize once and
        // cache to disk keyed by message id so repeat playback is free.
        let audioPath = message.audioUrl;
        if (!audioPath || !fs.existsSync(audioPath)) {
            const buffer = await synthesizeSpeech(message.content);
            const dir = path.join("uploads", "audio");
            fs.mkdirSync(dir, { recursive: true });
            audioPath = path.join(dir, `message-${messageId}.mp3`);
            fs.writeFileSync(audioPath, buffer);
            await setMessageAudioUrl(messageId, audioPath);
        }

        res.setHeader("Content-Type", "audio/mpeg");
        fs.createReadStream(audioPath).pipe(res);
    } catch (err) {
        next(err);
    }
};
