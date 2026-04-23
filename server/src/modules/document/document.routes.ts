import { Router } from "express";
import { uploadDoc } from "./document.controller";
import { upload } from "../../config/multer";
import { authMiddleware } from "../../common/middleware/auth.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadDoc
);

export default router;