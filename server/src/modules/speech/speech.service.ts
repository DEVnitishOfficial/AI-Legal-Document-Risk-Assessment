import fs from "fs";
import OpenAI from "openai";
import { env } from "../../config/env";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const transcribeAudio = async (filePath: string, language?: "en" | "hi"): Promise<string> => {
    const response = await client.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        // Whisper accepts ISO-639-1 language hints; omitting it lets it
        // auto-detect, which matters for Hinglish/code-switched speech.
        ...(language ? { language } : {}),
    });

    return response.text;
};

// TTS input has a ~4096 character limit; slice defensively the same way
// analyzeDocument() and embedText() bound their inputs.
export const synthesizeSpeech = async (text: string): Promise<Buffer> => {
    const response = await client.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text.slice(0, 4000),
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};
