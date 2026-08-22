import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { createTextDoc, uploadDocument } from "./document.service";
import { User } from "../../types/userType";
import { getUserDocuments, getDocumentById } from "./document.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { AppError } from "../../common/errors/AppError";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

interface AuthRequest extends Request {
  user?: User;
}

export const uploadDoc = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const authReq = req as AuthRequest;

    if(!authReq.user || !authReq?.user?.id) {
      throw new AppError("User not authenticated", 401);
    }

    const userId: number = authReq.user?.id;

    if (!authReq.file) {
      throw new AppError("No file uploaded", 400);
    }

    const result = await uploadDocument(userId, authReq.file.path);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error in uploadDoc controller:", err);
    next(err);
  }
};

  export const createTextDocumentController = async (req: Request, res:Response, next:NextFunction) => {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.user || !authReq.user.id) {
      throw new AppError("User not authenticated", 401);
    }

    const userId: number = authReq.user.id;
    const { content } = req.body;

    const result = await createTextDoc(userId, content);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getDocuments = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    const docs = await getUserDocuments(userId);

    res.json({
      success: true,
      data: docs,
    });
  } catch (err) {
    next(err);
  }
};

export const getDocumentByIdHandler = async (req: any, res: Response, next: NextFunction) => {
  try {
    const documentId = Number(req.params.id);
    const doc = await getDocumentById(documentId);

    if (!doc) {
      throw new AppError("Document not found", 404);
    }
    if (doc.userId !== req.user?.id) {
      throw new AppError("Not authorized to access this document", 403);
    }

    // Text-pasted documents already have their content in the DB; file
    // uploads only store a path, so extract on demand for the viewer —
    // same pattern analysis.controller.ts uses when re-reading a document.
    const content = doc.filePath ? await extractTextFromPDF(doc.filePath) : doc.content ?? "";

    res.json({ success: true, data: { document: doc, content } });
  } catch (err) {
    next(err);
  }
};

export const getDocumentFileHandler = async (req: any, res: Response, next: NextFunction) => {
  try {
    const documentId = Number(req.params.id);
    const doc = await getDocumentById(documentId);

    if (!doc) {
      throw new AppError("Document not found", 404);
    }
    if (doc.userId !== req.user?.id) {
      throw new AppError("Not authorized to access this document", 403);
    }
    if (!doc.filePath || !fs.existsSync(doc.filePath)) {
      throw new AppError("No file available for this document", 404);
    }

    const ext = path.extname(doc.filePath).toLowerCase();
    res.setHeader("Content-Type", CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream");
    res.setHeader("Content-Disposition", "inline");
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};