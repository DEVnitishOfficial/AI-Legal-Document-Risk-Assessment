import * as docRepo from "./document.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { AppError } from "../../common/errors/AppError";
import { removeUploadedFile } from "../../common/utils/files";

const MAX_TITLE_LENGTH = 120;

const getOwnedDocument = async (documentId: number, userId: number) => {
  if (!Number.isInteger(documentId)) {
    throw new AppError("Invalid document id", 400);
  }

  const doc = await docRepo.getDocumentById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }
  if (doc.userId !== userId) {
    throw new AppError("Not authorized to access this document", 403);
  }
  return doc;
};

export const updateDocument = async (
  documentId: number,
  userId: number,
  input: { title?: unknown; isFavorite?: unknown }
) => {
  const data: { title?: string; isFavorite?: boolean } = {};

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      throw new AppError("Title cannot be empty", 400);
    }
    if (input.title.trim().length > MAX_TITLE_LENGTH) {
      throw new AppError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer`, 400);
    }
    data.title = input.title.trim();
  }

  if (input.isFavorite !== undefined) {
    if (typeof input.isFavorite !== "boolean") {
      throw new AppError("isFavorite must be true or false", 400);
    }
    data.isFavorite = input.isFavorite;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("Nothing to update — send a title or isFavorite", 400);
  }

  await getOwnedDocument(documentId, userId);
  return docRepo.updateDocument(documentId, data);
};

export const deleteDocument = async (documentId: number, userId: number) => {
  const doc = await getOwnedDocument(documentId, userId);

  await docRepo.deleteDocument(documentId);
  // After the row is gone, so a failed DB delete never orphans a live document.
  await removeUploadedFile(doc.filePath);
};

export const uploadDocument = async (userId: number, filePath: string) => {
  // Save document in DB
  const document = await docRepo.createDocument(userId, filePath);

  // Extract text (for future AI use)
  const text = await extractTextFromPDF(filePath);

  return {
    document,
    extractedText: text.substring(0, 500), // preview only
  };
};

export const createTextDoc = async (userId: number, content: string) => {
  if (!content || content.trim().length < 50) {
    throw new AppError(
      "Pasted text is too short. Please paste at least 50 characters.",
      400
    );
  }

  const document = await docRepo.createTextDocument(userId, content);

  return {
    document,
    preview: content.substring(0, 300),
  };
};