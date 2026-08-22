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
        <div className="hidden md:flex w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 flex-col h-full min-h-0">
            <div className="p-3">
                <button
                    onClick={onNew}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                >
                    <Plus size={16} /> New conversation
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1">
                {conversations.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-4 text-center">
                        No conversations yet
                    </p>
                )}
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={`w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm transition ${
                            c.id === activeId
                                ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                        }`}
                    >
                        <MessageSquare size={15} className="mt-0.5 shrink-0 opacity-60" />
                        <span className="truncate">{c.title || "New conversation"}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
