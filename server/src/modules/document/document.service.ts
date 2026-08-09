import * as docRepo from "./document.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { AppError } from "../../common/errors/AppError";

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