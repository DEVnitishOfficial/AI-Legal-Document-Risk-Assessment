import { Router } from "express";
import {
  createTextDocumentController,
  getDocuments,
  uploadDoc,
  getDocumentByIdHandler,
  getDocumentFileHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from "./document.controller";
import { upload } from "../../config/multer";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { standardRateLimiter } from "../../common/middleware/rateLimit.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { idParamSchema } from "../../common/schemas/common.schema";
import { createTextBodySchema, updateDocumentBodySchema } from "./document.schema";

const router = Router();
const idParams = validate({ params: idParamSchema() });

router.post(
  "/upload",
  authMiddleware,
  standardRateLimiter,
  upload.single("file"),
  uploadDoc
);

router.post(
  "/text",
  authMiddleware,
  standardRateLimiter,
  validate({ body: createTextBodySchema }),
  createTextDocumentController
);
router.get("/get-documents", authMiddleware, getDocuments);
router.get("/:id/file", authMiddleware, idParams, getDocumentFileHandler);
router.get("/:id", authMiddleware, idParams, getDocumentByIdHandler);
router.patch(
  "/:id",
  authMiddleware,
  standardRateLimiter,
  idParams,
  validate({ body: updateDocumentBodySchema }),
  updateDocumentHandler
);
router.delete("/:id", authMiddleware, standardRateLimiter, idParams, deleteDocumentHandler);

export default router;
