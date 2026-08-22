import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Mic, Square, Languages } from "lucide-react";
import toast from "react-hot-toast";
import type { ChatLanguage } from "./types";

interface ChatInputProps {
    onSend: (content: string) => void;
    onSendVoice: (audioBlob: Blob) => void;
    onAttachClick: () => void;
    language: ChatLanguage;
    onLanguageChange: (lang: ChatLanguage) => void;
    disabled?: boolean;
}

const pickMimeType = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

export default function ChatInput({
    onSend,
    onSendVoice,
    onAttachClick,
    language,
    onLanguageChange,
    disabled,
}: ChatInputProps) {
    const [value, setValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const submit = () => {
        if (!value.trim() || disabled) return;
        onSend(value.trim());
        setValue("");
    };

    const startRecording = async () => {
        if (disabled) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = pickMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                if (blob.size > 0) onSendVoice(blob);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordSeconds(0);
            timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
        } catch (err) {
            toast.error(
                language === "hi"
                    ? "माइक्रोफ़ोन तक पहुंच नहीं मिली"
                    : "Couldn't access your microphone — check browser permissions"
            );
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-900 rounded-2xl p-2 max-w-3xl mx-auto">
                <button
                    onClick={onAttachClick}
                    disabled={isRecording}
                    title="Attach a document"
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition shrink-0 disabled:opacity-40"
                >
                    <Paperclip size={18} />
                </button>

                {isRecording ? (
                    <div className="flex-1 flex items-center gap-2 py-2 text-sm text-red-600 dark:text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {language === "hi" ? "रिकॉर्डिंग हो रही है..." : "Recording..."}
                        <span className="text-gray-400 dark:text-gray-500">{formatSeconds(recordSeconds)}</span>
                    </div>
                ) : (
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
                )}

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={disabled && !isRecording}
                    title={isRecording ? "Stop recording" : "Speak your question"}
                    className={`p-2 rounded-full transition shrink-0 disabled:opacity-40 ${
                        isRecording
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                >
                    {isRecording ? <Square size={16} /> : <Mic size={18} />}
                </button>

                <button
                    onClick={() => onLanguageChange(language === "en" ? "hi" : "en")}
                    disabled={isRecording}
                    title="Switch response language"
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition shrink-0 disabled:opacity-40"
                >
                    <Languages size={14} />
                    {language === "en" ? "EN" : "हिं"}
                </button>

                <button
                    onClick={submit}
                    disabled={disabled || isRecording || !value.trim()}
                    className="p-2.5 rounded-full bg-purple-600 text-white disabled:opacity-40 transition shrink-0"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
