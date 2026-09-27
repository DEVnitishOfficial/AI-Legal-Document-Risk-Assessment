import * as docRepo from "./document.repository";
import { AppError } from "../../common/errors/AppError";
import { removeUploadedFile } from "../../common/utils/files";

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

// Shape/format of `input` (title length, isFavorite is a real boolean, at
// least one field present) is already guaranteed by document.schema.ts's
// updateDocumentBodySchema at the route — this only does the business
// check (ownership) a database round trip is needed for.
export const updateDocument = async (
  documentId: number,
  userId: number,
  input: { title?: string; isFavorite?: boolean }
) => {
  await getOwnedDocument(documentId, userId);
  return docRepo.updateDocument(documentId, input);
};

export const deleteDocument = async (documentId: number, userId: number) => {
  const doc = await getOwnedDocument(documentId, userId);

  await docRepo.deleteDocument(documentId);
  // After the row is gone, so a failed DB delete never orphans a live document.
  await removeUploadedFile(doc.filePath);
};

export const uploadDocument = async (userId: number, filePath: string) => {
  // Text is deliberately NOT extracted here: it used to call pdf-parse
  // unconditionally (breaking on any non-PDF upload — a real bug this
  // surfaced once image uploads were added), the resulting preview was
  // never actually read by the client, and it duplicated work that
  // analysis.textExtraction.ts already does properly (extension-aware,
  // with OCR fallback) when the background analysis job runs.
  const document = await docRepo.createDocument(userId, filePath);
  return { document };
};

// The 50-character minimum is enforced by document.schema.ts's
// createTextBodySchema at the route.
export const createTextDoc = async (userId: number, content: string) => {
  const document = await docRepo.createTextDocument(userId, content);

  return {
    document,
    preview: content.substring(0, 300),
  };
};