import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Scale, User, Mic, Volume2, Loader2, PauseCircle } from "lucide-react";
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

export default function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";
    const [playback, setPlayback] = useState<PlaybackState>("idle");
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

                {message.citations && message.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
                        {message.citations.map((c, i) => (
                            <a
                                key={i}
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-xs text-purple-700 dark:text-purple-300 hover:underline truncate"
                            >
                                {c.title}
                            </a>
                        ))}
                    </div>
                )}

                {!isUser && message.kind !== "clarify" && (
                    <button
                        onClick={togglePlayback}
                        title={playback === "playing" ? "Pause" : "Listen to this reply"}
                        className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition"
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
        </motion.div>
    );
}
