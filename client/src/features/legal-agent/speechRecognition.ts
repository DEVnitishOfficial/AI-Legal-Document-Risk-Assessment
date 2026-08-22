// The Web Speech API (SpeechRecognition) has no official TS DOM types in
// this project's lib target, and is only implemented (prefixed) in
// Chrome/Edge/Safari — Firefox has none at all. This module isolates the
// `any`-typed feature detection so ChatInput.tsx stays clean, and callers
// fall back to server-side Whisper transcription when this returns null.
export const getSpeechRecognitionCtor = (): any => {
    if (typeof window === "undefined") return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export const isSpeechRecognitionSupported = (): boolean => getSpeechRecognitionCtor() !== null;
