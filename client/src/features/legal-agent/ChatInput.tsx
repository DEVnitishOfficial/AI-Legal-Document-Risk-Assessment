import { useState } from "react";
import { Send, Paperclip, Mic, Languages } from "lucide-react";
import type { ChatLanguage } from "./types";

interface ChatInputProps {
    onSend: (content: string) => void;
    onAttachClick: () => void;
    language: ChatLanguage;
    onLanguageChange: (lang: ChatLanguage) => void;
    disabled?: boolean;
}

export default function ChatInput({
    onSend,
    onAttachClick,
    language,
    onLanguageChange,
    disabled,
}: ChatInputProps) {
    const [value, setValue] = useState("");

    const submit = () => {
        if (!value.trim() || disabled) return;
        onSend(value.trim());
        setValue("");
    };

    return (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-900 rounded-2xl p-2 max-w-3xl mx-auto">
                <button
                    onClick={onAttachClick}
                    title="Attach a document"
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition shrink-0"
                >
                    <Paperclip size={18} />
                </button>

                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    placeholder={
                        language === "hi" ? "अपना सवाल यहाँ लिखें..." : "Ask about your legal situation..."
                    }
                    rows={1}
                    className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 py-2 max-h-32"
                />

                <button
                    title="Voice input coming soon"
                    disabled
                    className="p-2 rounded-full text-gray-300 dark:text-gray-600 cursor-not-allowed shrink-0"
                >
                    <Mic size={18} />
                </button>

                <button
                    onClick={() => onLanguageChange(language === "en" ? "hi" : "en")}
                    title="Switch response language"
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition shrink-0"
                >
                    <Languages size={14} />
                    {language === "en" ? "EN" : "हिं"}
                </button>

                <button
                    onClick={submit}
                    disabled={disabled || !value.trim()}
                    className="p-2.5 rounded-full bg-purple-600 text-white disabled:opacity-40 transition shrink-0"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
