import { Router } from "express";
import { createTextDocumentController, getDocuments, uploadDoc } from "./document.controller";
import { upload } from "../../config/multer";
import { authMiddleware } from "../../common/middleware/auth.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadDoc
);

router.post("/text", authMiddleware, createTextDocumentController);
router.get("/get-documents", authMiddleware, getDocuments);

export default router;