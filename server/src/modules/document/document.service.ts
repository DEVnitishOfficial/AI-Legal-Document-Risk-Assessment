import * as docRepo from "./document.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";

export const uploadDocument = async (userId: number, filePath: string) => {
  // Save document in DB
  const document = await docRepo.createDocument(userId, filePath);
  console.log('Document saved to DB:', document);

  // Extract text (for future AI use)
  const text = await extractTextFromPDF(filePath);
  console.log('Extracted text:', text.substring(0, 500));

  return {
    document,
    extractedText: text.substring(0, 500), // preview only
  };
};