import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Mic, Square, Languages, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/api";
import { getSpeechRecognitionCtor, isSpeechRecognitionSupported } from "./speechRecognition";
import type { ChatLanguage } from "./types";

interface ChatInputProps {
    onSend: (content: string) => void;
    onAttachClick: () => void;
    language: ChatLanguage;
    onLanguageChange: (lang: ChatLanguage) => void;
    disabled?: boolean;
}

const pickMimeType = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

// Fallback path for browsers without live SpeechRecognition (Firefox, etc.)
// — batch-transcribes a full recording via the server's Whisper endpoint.
// Deliberately a plain transcription call, not a message send: the result
// just lands in the input box for the user to review/edit, same as the
// live-transcript path.
const transcribeFallback = async (blob: Blob, language: ChatLanguage): Promise<string> => {
    const formData = new FormData();
    formData.append("audio", blob, "voice-input.webm");
    formData.append("language", language);
    const res = await API.post("/speech/transcribe", formData);
    return res.data.data.transcript as string;
};

export default function ChatInput({
    onSend,
    onAttachClick,
    language,
    onLanguageChange,
    disabled,
}: ChatInputProps) {
    const [value, setValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [liveCaptionSupported] = useState(isSpeechRecognitionSupported);

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const baseTextRef = useRef("");
    const finalTranscriptRef = useRef("");

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const submit = () => {
        if (!value.trim() || disabled || isRecording || isTranscribing) return;
        onSend(value.trim());
        setValue("");
    };

    const startTimer = () => {
        setRecordSeconds(0);
        timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    };

    const startLiveRecording = () => {
        const SpeechRecognitionCtor = getSpeechRecognitionCtor();
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

        finalTranscriptRef.current = "";

        recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript as string;
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += transcript + " ";
                } else {
                    interim += transcript;
                }
            }
            setValue((baseTextRef.current + finalTranscriptRef.current + interim).trimStart());
        };

        recognition.onerror = (event: any) => {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                toast.error(
                    language === "hi" ? "माइक्रोफ़ोन तक पहुंच नहीं मिली" : "Microphone access denied"
                );
                stopRecording();
            }
            // Other errors (e.g. transient "no-speech"/"network") are left to
            // onend, which restarts recognition unless the user stopped it.
        };

        recognition.onend = () => {
            if (isRecordingRef.current) {
                try {
                    recognition.start();
                } catch {
                    // Already running or unstartable — nothing more to do.
                }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const startFallbackRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;

            if (blob.size === 0) return;

            setIsTranscribing(true);
            try {
                const transcript = await transcribeFallback(blob, language);
                setValue((baseTextRef.current + transcript).trim());
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Could not transcribe audio");
            } finally {
                setIsTranscribing(false);
            }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
    };

    const startRecording = async () => {
        if (disabled || isTranscribing) return;

        // Whatever's already typed is kept and spoken text is appended after
        // it — lets the mic double as an "edit by speaking more" tool
        // instead of always overwriting the draft.
        baseTextRef.current = value.trim() ? value.trim() + " " : "";

        try {
            if (liveCaptionSupported) {
                startLiveRecording();
            } else {
                await startFallbackRecording();
            }
            isRecordingRef.current = true;
            setIsRecording(true);
            startTimer();
        } catch (err) {
            toast.error(
                language === "hi"
                    ? "माइक्रोफ़ोन तक पहुंच नहीं मिली"
                    : "Couldn't access your microphone — check browser permissions"
            );
        }
    };

    const stopRecording = () => {
        isRecordingRef.current = false;

        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // don't auto-restart on a manual stop
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    const statusLabel = isTranscribing
        ? language === "hi"
            ? "ट्रांसक्राइब हो रहा है..."
            : "Transcribing..."
        : liveCaptionSupported
          ? language === "hi"
              ? "सुन रहे हैं..."
              : "Listening..."
          : language === "hi"
            ? "रिकॉर्डिंग हो रही है..."
            : "Recording...";

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

                <div className="flex-1 flex flex-col min-w-0">
                    {(isRecording || isTranscribing) && (
                        <div className="flex items-center gap-1.5 px-1 pt-1 text-xs text-red-600 dark:text-red-400">
                            {isTranscribing ? (
                                <Loader2 size={11} className="animate-spin" />
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                            {statusLabel}
                            {isRecording && (
                                <span className="text-gray-400 dark:text-gray-500">
                                    {formatSeconds(recordSeconds)}
                                </span>
                            )}
                        </div>
                    )}
                    <textarea
                        value={value}
                        readOnly={isRecording || isTranscribing}
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
                </div>

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={disabled || isTranscribing}
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
                    disabled={disabled || isRecording || isTranscribing || !value.trim()}
                    className="p-2.5 rounded-full bg-purple-600 text-white disabled:opacity-40 transition shrink-0"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
