import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { aiRateLimiter, standardRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { upload } from "../../config/multer";
import { validate } from "../../common/middleware/validate.middleware";
import { idParamSchema } from "../../common/schemas/common.schema";
import {
    createConversationBodySchema,
    updateConversationBodySchema,
    sendMessageBodySchema,
    attachDocumentBodySchema,
} from "./legal-agent.schema";
import {
    createConversationHandler,
    listConversationsHandler,
    getConversationHandler,
    updateConversationHandler,
    deleteConversationHandler,
    sendMessageHandler,
    sendVoiceMessageHandler,
    getMessageAudioHandler,
    attachDocumentHandler,
} from "./legal-agent.controller";

const router = Router();
const conversationIdParams = validate({ params: idParamSchema() });

router.post(
    "/conversations",
    authMiddleware,
    validate({ body: createConversationBodySchema }),
    createConversationHandler
);
router.get("/conversations", authMiddleware, listConversationsHandler);
router.get("/conversations/:id", authMiddleware, conversationIdParams, getConversationHandler);
router.patch(
    "/conversations/:id",
    authMiddleware,
    conversationIdParams,
    validate({ body: updateConversationBodySchema }),
    updateConversationHandler
);
router.delete(
    "/conversations/:id",
    authMiddleware,
    standardRateLimiter,
    conversationIdParams,
    deleteConversationHandler
);
router.post(
    "/conversations/:id/messages",
    authMiddleware,
    aiRateLimiter,
    conversationIdParams,
    validate({ body: sendMessageBodySchema }),
    sendMessageHandler
);
router.post(
    "/conversations/:id/voice-messages",
    authMiddleware,
    aiRateLimiter,
    conversationIdParams,
    upload.single("audio"),
    sendVoiceMessageHandler
);
router.get(
    "/messages/:messageId/audio",
    authMiddleware,
    standardRateLimiter,
    validate({ params: idParamSchema("messageId") }),
    getMessageAudioHandler
);
router.post(
    "/conversations/:id/documents",
    authMiddleware,
    conversationIdParams,
    validate({ body: attachDocumentBodySchema }),
    attachDocumentHandler
);

export default router;
