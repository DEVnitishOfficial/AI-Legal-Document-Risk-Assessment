import { useState, useCallback, useEffect } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import type { ChatLanguage, Conversation, Message } from "./types";

export function useLegalChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [language, setLanguageState] = useState<ChatLanguage>("en");
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

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

            const optimisticUserMessage: Message = {
                id: Date.now(),
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

            try {
                const res = await API.post(`/legal-agent/conversations/${conversationId}/messages`, {
                    content: trimmed,
                });
                const assistantMessage: Message = res.data.data.message;
                setMessages((prev) => [...prev, assistantMessage]);

                setConversations((prev) =>
                    prev
                        .map((c) =>
                            c.id === conversationId
                                ? { ...c, title: c.title || trimmed.slice(0, 60), updatedAt: new Date().toISOString() }
                                : c
                        )
                        .sort((a, b) => (a.id === conversationId ? -1 : b.id === conversationId ? 1 : 0))
                );
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to send message");
                setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));
            } finally {
                setSending(false);
            }
        },
        [ensureConversation]
    );

    const sendVoiceMessage = useCallback(
        async (audioBlob: Blob) => {
            const conversationId = await ensureConversation();
            if (!conversationId) return;

            setSending(true);
            try {
                const formData = new FormData();
                formData.append("audio", audioBlob, "voice-message.webm");

                const res = await API.post(
                    `/legal-agent/conversations/${conversationId}/voice-messages`,
                    formData
                );
                const { userMessage, message: assistantMessage } = res.data.data;
                setMessages((prev) => [...prev, userMessage, assistantMessage]);

                setConversations((prev) =>
                    prev
                        .map((c) =>
                            c.id === conversationId
                                ? {
                                      ...c,
                                      title: c.title || userMessage.content.slice(0, 60),
                                      updatedAt: new Date().toISOString(),
                                  }
                                : c
                        )
                        .sort((a, b) => (a.id === conversationId ? -1 : b.id === conversationId ? 1 : 0))
                );
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to send voice message");
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
                await API.post(`/legal-agent/conversations/${conversationId}/documents`, { documentId });
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
        language,
        loadingConversations,
        loadingMessages,
        sending,
        selectConversation,
        startNewConversation,
        sendMessage,
        sendVoiceMessage,
        changeLanguage,
        attachDocument,
    };
}
