import { useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RenameDialog from "../../components/ui/RenameDialog";
import { apiErrorMessage } from "../../services/apiError";
import type { Conversation } from "./types";

interface ConversationSidebarProps {
    conversations: Conversation[];
    activeId: number | null;
    /** True while a reply is streaming — the open chat can't be renamed/deleted mid-answer. */
    busy?: boolean;
    onSelect: (id: number) => void;
    onNew: () => void;
    onRename: (id: number, title: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

const ACTION_BTN =
    "p-1 rounded-md text-gray-500 dark:text-cream-100/55 hover:bg-cream-200 dark:hover:bg-navy-700 hover:text-navy-950 dark:hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

export default function ConversationSidebar({
    conversations,
    activeId,
    busy,
    onSelect,
    onNew,
    onRename,
    onDelete,
}: ConversationSidebarProps) {
    const [renaming, setRenaming] = useState<Conversation | null>(null);
    const [deleting, setDeleting] = useState<Conversation | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const saveRename = async (title: string) => {
        if (!renaming) return;
        try {
            await onRename(renaming.id, title);
            toast.success("Chat renamed");
            setRenaming(null);
        } catch (err) {
            throw err; // keeps the dialog open, which shows the reason itself
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        setDeleteError(null);
        try {
            await onDelete(deleting.id);
            toast.success("Chat deleted");
            setDeleting(null);
        } catch (err) {
            setDeleteError(apiErrorMessage(err, "We couldn't delete this chat. Please try again."));
        } finally {
            setDeleteBusy(false);
        }
    };

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
                {conversations.map((c) => {
                    const isActive = c.id === activeId;
                    const locked = isActive && busy;

                    return (
                        <div key={c.id} className="group relative">
                            <button
                                onClick={() => onSelect(c.id)}
                                className={`w-full text-left flex items-start gap-2 pl-3 pr-14 py-2.5 rounded-lg text-[13px] border-l-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${
                                    isActive
                                        ? "bg-cream-100 dark:bg-navy-800 text-navy-950 dark:text-white border-gold-500 font-medium"
                                        : "text-gray-500 dark:text-cream-100/50 border-transparent hover:bg-cream-50 dark:hover:bg-navy-800/60"
                                }`}
                            >
                                <MessageSquare size={14} className="mt-0.5 shrink-0 opacity-60" />
                                <span className="truncate">{c.title || "New conversation"}</span>
                            </button>

                            {!locked && (
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setRenaming(c)}
                                        title="Rename chat"
                                        aria-label={`Rename chat: ${c.title || "New conversation"}`}
                                        className={ACTION_BTN}
                                    >
                                        <Pencil size={13} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeleteError(null);
                                            setDeleting(c);
                                        }}
                                        title="Delete chat"
                                        aria-label={`Delete chat: ${c.title || "New conversation"}`}
                                        className={`${ACTION_BTN} hover:!text-risk-high-fg dark:hover:!text-risk-high-fg-dark`}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {renaming && (
                <RenameDialog
                    title="Rename chat"
                    label="Chat name"
                    initialValue={renaming.title || "New conversation"}
                    onSave={saveRename}
                    onCancel={() => setRenaming(null)}
                />
            )}
            {deleting && (
                <ConfirmDialog
                    danger
                    busy={deleteBusy}
                    error={deleteError}
                    title="Delete this chat?"
                    message={`“${deleting.title || "New conversation"}” and all of its messages will be permanently deleted. This can't be undone.`}
                    confirmLabel="Delete chat"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </div>
    );
}
