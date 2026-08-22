import fs from "fs";
import path from "path";
import { Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import { extractTextFromPDF } from "../../common/utils/pdf";
import {
    decideNextStep,
    routeMessage,
    streamAnswer,
    getRagContext,
    appendDisclaimer,
    ChatTurn,
} from "./legal-agent.service";
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

// Best-effort document context: a failed extraction (e.g. a
// scanned/image-only PDF pdf-parse can't read) shouldn't block the chat
// turn, just means that document's content is unavailable. Shared by both
// the streaming text-message path and the non-streaming voice path.
const buildDocumentContext = async (conversation: OwnedConversation): Promise<string> => {
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
    return documentTexts.filter(Boolean).join("\n\n");
};

// Used by the voice-message endpoint — single non-streaming call that
// decides clarify vs answer AND generates the full content together (see
// legal-agent.service.ts::decideNextStep for why voice doesn't stream).
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

    const documentContext = await buildDocumentContext(conversation);
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

// Streams the assistant's answer token-by-token over SSE so the client can
// render it as it's generated. Clarify responses are short enough that
// streaming them wouldn't help, but they're sent through the same SSE
// framing so the client only needs one code path to parse either outcome.
export const sendMessageHandler = async (req: any, res: Response, next: NextFunction) => {
    let streaming = false;

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

        const documentContext = await buildDocumentContext(conversation);
        const ragContext = await getRagContext(content);

        // Routing decision happens before any streaming starts — we can't
        // retroactively switch to a clarify question after tokens have
        // already been sent to the client.
        const route = await routeMessage(history, language, documentContext, ragContext);

        const userMessageRow = await appendMessage(conversationId, { role: "user", content, kind: "text" });

        streaming = true;
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const sendEvent = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
        sendEvent({ type: "user_message", message: userMessageRow[0] });

        let assistantMessageRow;

        if (route.type === "clarify") {
            assistantMessageRow = await appendMessage(conversationId, {
                role: "assistant",
                content: route.question!,
                kind: "clarify",
                clarifyOptions: route.options,
            });
        } else {
            let fullText = "";
            for await (const deltaText of streamAnswer(history, language, documentContext, ragContext)) {
                fullText += deltaText;
                sendEvent({ type: "delta", text: deltaText });
            }

            assistantMessageRow = await appendMessage(conversationId, {
                role: "assistant",
                content: appendDisclaimer(fullText),
                kind: "text",
                citations: route.citations ?? [],
            });
        }

        if (!conversation.title) {
            await setConversationTitle(conversationId, content.trim().slice(0, 60));
        }

        sendEvent({ type: "done", message: assistantMessageRow[0] });
        res.end();
    } catch (err) {
        console.error("Error occurred while sending legal-agent message:", err);

        if (streaming) {
            try {
                res.write(
                    `data: ${JSON.stringify({
                        type: "error",
                        message: "Something went wrong generating a response.",
                    })}\n\n`
                );
                res.end();
            } catch {
                // Response already closed — nothing more we can do.
            }
        } else {
            next(err);
        }
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

        let transcript: string;
        try {
            transcript = await transcribeAudio(req.file.path, language);
        } catch (err) {
            // Whisper rejects unsupported/corrupt audio with its own
            // APIError — surface that as a clean 400 instead of an opaque
            // 500 (same discipline as the rest of this codebase: never let
            // an unwrapped upstream error reach the client as "Internal
            // Server Error").
            console.error("Whisper transcription failed:", err);
            throw new AppError("Could not process this audio — please try recording again", 400);
        }

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
