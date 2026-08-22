import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Scale, User, Mic, Volume2, Loader2, PauseCircle, ExternalLink, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/api";
import type { Message } from "./types";

// No @tailwindcss/typography plugin is installed, so markdown elements are
// styled explicitly via the `components` map instead of a `prose` class.
const markdownComponents = {
    p: (props: any) => <p className="mb-2 last:mb-0" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    strong: (props: any) => <strong className="font-semibold" {...props} />,
    em: (props: any) => <em className="text-xs opacity-70" {...props} />,
    a: (props: any) => (
        <a className="underline" target="_blank" rel="noreferrer" {...props} />
    ),
};

type PlaybackState = "idle" | "loading" | "playing";

const hostnameOf = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const [playback, setPlayback] = useState<PlaybackState>("idle");
    const [copied, setCopied] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Couldn't copy message");
        }
    };

    const togglePlayback = async () => {
        if (playback === "playing") {
            audioRef.current?.pause();
            setPlayback("idle");
            return;
        }

        setPlayback("loading");
        try {
            const res = await API.get(`/legal-agent/messages/${message.id}/audio`, {
                responseType: "blob",
            });
            const url = URL.createObjectURL(res.data);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setPlayback("idle");
            await audio.play();
            setPlayback("playing");
        } catch (err) {
            toast.error("Couldn't play audio for this message");
            setPlayback("idle");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
        >
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? "bg-gray-300 dark:bg-gray-700" : "bg-purple-600"
                }`}
            >
                {isUser ? (
                    <User size={16} className="text-gray-700 dark:text-gray-200" />
                ) : (
                    <Scale size={16} className="text-white" />
                )}
            </div>

            <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm"
                }`}
            >
                {message.kind === "voice" && (
                    <div
                        className={`flex items-center gap-1 text-xs mb-1 ${
                            isUser ? "text-purple-100" : "text-gray-500 dark:text-gray-400"
                        }`}
                    >
                        <Mic size={11} /> Voice message
                    </div>
                )}

                <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                {isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-current opacity-60 animate-pulse align-text-bottom ml-0.5" />
                )}

                {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-black/10 dark:border-white/10">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                            Sources
                        </p>
                        <div className="space-y-1">
                            {message.citations.map((c, i) => (
                                <a
                                    key={i}
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-start gap-1.5 group"
                                >
                                    <ExternalLink
                                        size={11}
                                        className="mt-0.5 shrink-0 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-xs text-purple-700 dark:text-purple-300 group-hover:underline truncate">
                                            {c.title}
                                        </span>
                                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                            {hostnameOf(c.url)}
                                        </span>
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {!isStreaming && (
                    <div
                        className={`mt-2 flex items-center gap-3 text-xs ${
                            isUser ? "text-purple-100" : "text-gray-500 dark:text-gray-400"
                        }`}
                    >
                        <button
                            onClick={handleCopy}
                            title="Copy message"
                            className={`flex items-center gap-1 transition ${
                                isUser
                                    ? "hover:text-white"
                                    : "hover:text-purple-600 dark:hover:text-purple-300"
                            }`}
                        >
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                            {copied ? "Copied" : "Copy"}
                        </button>

                        {!isUser && message.kind !== "clarify" && (
                            <button
                                onClick={togglePlayback}
                                title={playback === "playing" ? "Pause" : "Listen to this reply"}
                                className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-300 transition"
                            >
                                {playback === "loading" ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : playback === "playing" ? (
                                    <PauseCircle size={13} />
                                ) : (
                                    <Volume2 size={13} />
                                )}
                                {playback === "playing" ? "Playing" : "Listen"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
