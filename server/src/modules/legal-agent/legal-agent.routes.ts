import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { upload } from "../../config/multer";
import {
    createConversationHandler,
    listConversationsHandler,
    getConversationHandler,
    updateConversationHandler,
    sendMessageHandler,
    sendVoiceMessageHandler,
    getMessageAudioHandler,
    attachDocumentHandler,
} from "./legal-agent.controller";

const router = Router();

router.post("/conversations", authMiddleware, createConversationHandler);
router.get("/conversations", authMiddleware, listConversationsHandler);
router.get("/conversations/:id", authMiddleware, getConversationHandler);
router.patch("/conversations/:id", authMiddleware, updateConversationHandler);
router.post("/conversations/:id/messages", authMiddleware, sendMessageHandler);
router.post(
    "/conversations/:id/voice-messages",
    authMiddleware,
    upload.single("audio"),
    sendVoiceMessageHandler
);
router.get("/messages/:messageId/audio", authMiddleware, getMessageAudioHandler);
router.post("/conversations/:id/documents", authMiddleware, attachDocumentHandler);

export default router;
