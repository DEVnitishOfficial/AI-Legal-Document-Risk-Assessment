import { useState, useCallback, useEffect } from "react";
import API, { API_BASE_URL } from "../../services/api";
import toast from "react-hot-toast";
import { readSseEvents } from "./sse";
import type { AttachedDocument, ChatLanguage, Conversation, Message } from "./types";

export function useLegalChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [attachedDocuments, setAttachedDocuments] = useState<AttachedDocument[]>([]);
    const [language, setLanguageState] = useState<ChatLanguage>("en");
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    // Set to the id of the assistant message currently receiving streamed
    // tokens — lets the UI distinguish "waiting for the model to start
    // responding" (show a thinking indicator) from "tokens are actively
    // arriving" (the growing bubble itself is the indicator).
    const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

    const loadConversations = useCallback(async () => {
        setLoadingConversations(true);
        try {
            const res = await API.get("/legal-agent/conversations");
            setConversations(res.data.data.conversations);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to load conversations");
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const selectConversation = useCallback(async (id: number) => {
        setActiveId(id);
        setLoadingMessages(true);
        try {
            const res = await API.get(`/legal-agent/conversations/${id}`);
            const conversation: Conversation = res.data.data.conversation;
            setMessages(conversation.messages || []);
            setAttachedDocuments((conversation.documents || []).map((d) => d.document));
            setLanguageState(conversation.language);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to load conversation");
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const startNewConversation = useCallback(async () => {
        try {
            const res = await API.post("/legal-agent/conversations", { language });
            const conversation: Conversation = res.data.data.conversation;
            setConversations((prev) => [conversation, ...prev]);
            setActiveId(conversation.id);
            setMessages([]);
            setAttachedDocuments([]);
            return conversation.id;
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to start a new conversation");
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    // Chat can be used before any conversation exists yet (e.g. typing into
    // an empty state) — lazily create one on the first message instead of
    // forcing the user through an explicit "New conversation" click first.
    const ensureConversation = useCallback(async () => {
        if (activeId) return activeId;
        return startNewConversation();
    }, [activeId, startNewConversation]);

    const sendMessage = useCallback(
        async (content: string) => {
            const trimmed = content.trim();
            if (!trimmed) return;

            const conversationId = await ensureConversation();
            if (!conversationId) return;

            const optimisticId = Date.now();
            const streamingId = optimisticId + 1;

            const optimisticUserMessage: Message = {
                id: optimisticId,
                conversationId,
                role: "user",
                content: trimmed,
                kind: "text",
                clarifyOptions: null,
                citations: null,
                audioUrl: null,
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimisticUserMessage]);
            setSending(true);

            const bumpConversation = () =>
                setConversations((prev) =>
                    prev
                        .map((c) =>
                            c.id === conversationId
                                ? { ...c, title: c.title || trimmed.slice(0, 60), updatedAt: new Date().toISOString() }
                                : c
                        )
                        .sort((a, b) => (a.id === conversationId ? -1 : b.id === conversationId ? 1 : 0))
                );

            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE_URL}/legal-agent/conversations/${conversationId}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ content: trimmed }),
                });

                if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    throw new Error(body?.message || `Request failed (${res.status})`);
                }

                for await (const event of readSseEvents(res)) {
                    if (event.type === "user_message") {
                        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? event.message : m)));
                    } else if (event.type === "delta") {
                        setMessages((prev) => {
                            const alreadyStreaming = prev.some((m) => m.id === streamingId);
                            if (!alreadyStreaming) {
                                setStreamingMessageId(streamingId);
                                return [
                                    ...prev,
                                    {
                                        id: streamingId,
                                        conversationId,
                                        role: "assistant",
                                        content: event.text,
                                        kind: "text",
                                        clarifyOptions: null,
                                        citations: null,
                                        audioUrl: null,
                                        createdAt: new Date().toISOString(),
                                    },
                                ];
                            }
                            return prev.map((m) =>
                                m.id === streamingId ? { ...m, content: m.content + event.text } : m
                            );
                        });
                    } else if (event.type === "done") {
                        setMessages((prev) => [...prev.filter((m) => m.id !== streamingId), event.message]);
                        setStreamingMessageId(null);
                        bumpConversation();
                    } else if (event.type === "error") {
                        toast.error(event.message || "Something went wrong generating a response");
                    }
                }
            } catch (err: any) {
                toast.error(err?.message || "Failed to send message");
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId && m.id !== streamingId));
                setStreamingMessageId(null);
            } finally {
                setSending(false);
            }
        },
        [ensureConversation]
    );

    const changeLanguage = useCallback(
        async (lang: ChatLanguage) => {
            setLanguageState(lang);
            if (!activeId) return;

            try {
                await API.patch(`/legal-agent/conversations/${activeId}`, { language: lang });
                setConversations((prev) =>
                    prev.map((c) => (c.id === activeId ? { ...c, language: lang } : c))
                );
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to switch language");
            }
        },
        [activeId]
    );

    const attachDocument = useCallback(
        async (documentId: number) => {
            const conversationId = await ensureConversation();
            if (!conversationId) return;

            try {
                const res = await API.post(`/legal-agent/conversations/${conversationId}/documents`, {
                    documentId,
                });
                setAttachedDocuments((prev) => [...prev, res.data.data.link.document]);
                toast.success("Document attached to this conversation");
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to attach document");
            }
        },
        [ensureConversation]
    );

    return {
        conversations,
        activeId,
        messages,
        attachedDocuments,
        language,
        loadingConversations,
        loadingMessages,
        sending,
        streamingMessageId,
        selectConversation,
        startNewConversation,
        sendMessage,
        changeLanguage,
        attachDocument,
    };
}
