import { Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import { transcribeAudio } from "./speech.service";

// Transcribe-only endpoint: used as the fallback path for the chat input's
// mic button when the browser's live Web Speech API isn't available —
// unlike /legal-agent/conversations/:id/voice-messages, this doesn't touch
// any conversation or call the agent, it just returns text for the client
// to drop into an editable draft.
export const transcribeHandler = async (req: any, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            throw new AppError("audio file is required", 400);
        }

        const language = req.body?.language === "hi" ? "hi" : req.body?.language === "en" ? "en" : undefined;

        let transcript: string;
        try {
            transcript = await transcribeAudio(req.file.path, language);
        } catch (err) {
            console.error("Whisper transcription failed:", err);
            throw new AppError("Could not process this audio — please try recording again", 400);
        }

        res.json({ success: true, data: { transcript } });
    } catch (err) {
        next(err);
    }
};
