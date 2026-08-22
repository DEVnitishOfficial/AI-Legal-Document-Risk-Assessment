import { Router } from "express";
import {
  createTextDocumentController,
  getDocuments,
  uploadDoc,
  getDocumentByIdHandler,
  getDocumentFileHandler,
} from "./document.controller";
import { upload } from "../../config/multer";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { standardRateLimiter } from "../../common/middleware/rateLimit.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  standardRateLimiter,
  upload.single("file"),
  uploadDoc
);

router.post("/text", authMiddleware, standardRateLimiter, createTextDocumentController);
router.get("/get-documents", authMiddleware, getDocuments);
router.get("/:id/file", authMiddleware, getDocumentFileHandler);
router.get("/:id", authMiddleware, getDocumentByIdHandler);

export default router;
