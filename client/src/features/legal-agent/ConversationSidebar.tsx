import { Plus, MessageSquare } from "lucide-react";
import type { Conversation } from "./types";

interface ConversationSidebarProps {
    conversations: Conversation[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onNew: () => void;
}

export default function ConversationSidebar({
    conversations,
    activeId,
    onSelect,
    onNew,
}: ConversationSidebarProps) {
    return (
        <div className="hidden md:flex w-64 shrink-0 border-r border-cream-200 dark:border-white/10 flex-col h-full min-h-0 bg-white dark:bg-navy-900">
            <div className="p-3">
                <button
                    onClick={onNew}
                    className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
                >
                    <Plus size={16} /> New conversation
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1">
                {conversations.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-cream-100/40 px-2 py-4 text-center">
                        No conversations yet
                    </p>
                )}
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={`w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg text-[13px] border-l-2 transition-colors ${
                            c.id === activeId
                                ? "bg-cream-100 dark:bg-navy-800 text-navy-950 dark:text-white border-gold-500 font-medium"
                                : "text-gray-500 dark:text-cream-100/50 border-transparent hover:bg-cream-50 dark:hover:bg-navy-800/60"
                        }`}
                    >
                        <MessageSquare size={14} className="mt-0.5 shrink-0 opacity-60" />
                        <span className="truncate">{c.title || "New conversation"}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
