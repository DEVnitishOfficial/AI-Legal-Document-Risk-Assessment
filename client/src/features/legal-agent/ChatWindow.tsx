import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import type { ChatLanguage, Message } from "./types";
import MessageBubble from "./MessageBubble";
import ClarifyOptions from "./ClarifyOptions";
import EmptyState from "./EmptyState";

interface ChatWindowProps {
    messages: Message[];
    loading: boolean;
    sending: boolean;
    streamingMessageId: number | null;
    language: ChatLanguage;
    onSend: (content: string) => void;
    onStarterPick: (prompt: string) => void;
}

export default function ChatWindow({
    messages,
    loading,
    sending,
    streamingMessageId,
    language,
    onSend,
    onStarterPick,
}: ChatWindowProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    const lastMessage = messages[messages.length - 1];
    const showClarify = !sending && lastMessage?.role === "assistant" && lastMessage.kind === "clarify";
    // Only show the "thinking" dots before the first token arrives — once
    // streaming starts, the growing message bubble itself is the indicator.
    const showThinking = sending && !streamingMessageId;

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-800 bg-amber-50 border-b border-amber-200 dark:text-amber-200 dark:bg-amber-950/40 dark:border-amber-900">
                <AlertTriangle size={14} className="shrink-0" />
                <span>
                    {language === "hi"
                        ? "यह सामान्य कानूनी जानकारी है, कानूनी सलाह नहीं — कार्रवाई से पहले हमेशा एक वकील से सलाह लें।"
                        : "This provides general legal information, not legal advice — always consult a licensed advocate before acting."}
                </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                {messages.length === 0 && !loading ? (
                    <EmptyState onPick={onStarterPick} language={language} />
                ) : (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {messages.map((m) => (
                            <MessageBubble key={m.id} message={m} isStreaming={m.id === streamingMessageId} />
                        ))}

                        {showClarify && (
                            <ClarifyOptions
                                options={lastMessage.clarifyOptions || []}
                                onSelect={onSend}
                                disabled={sending}
                            />
                        )}

                        {showThinking && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-600 shrink-0" />
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                    <span className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>
                )}
            </div>
        </div>
    );
}
