import { Router } from "express";
import { createTextDocumentController, uploadDoc } from "./document.controller";
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

export default router;