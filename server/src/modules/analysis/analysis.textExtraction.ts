import path from "path";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { ocrPdf, ocrImage, IMAGE_EXTENSIONS } from "../../common/utils/ocr";

// Same threshold createTextDoc (document.service.ts) already uses for
// pasted text — below this there just isn't enough content for a
// meaningful analysis, AI or otherwise.
export const MIN_USABLE_TEXT_LENGTH = 50;

export interface ExtractableDocument {
  filePath: string | null;
  content: string | null;
}

export interface ExtractedText {
  text: string;
  /** True when the text-layer/pasted content wasn't enough and OCR filled the gap. */
  usedOcr: boolean;
}

/**
 * Gets analyzable text out of a document, however it was submitted:
 * pasted text as-is; a normal (born-digital) PDF via its text layer;
 * a scanned PDF or a photographed document via OCR.
 */
export const extractDocumentText = async (doc: ExtractableDocument): Promise<ExtractedText> => {
  if (doc.content) {
    return { text: doc.content, usedOcr: false };
  }

  if (!doc.filePath) {
    return { text: "", usedOcr: false };
  }

  const ext = path.extname(doc.filePath).toLowerCase();

  if (IMAGE_EXTENSIONS.includes(ext)) {
    const text = await ocrImage(doc.filePath);
    return { text, usedOcr: true };
  }

  // PDF path: try the fast, free text-layer extraction first.
  const pdfText = await extractTextFromPDF(doc.filePath);
  if (pdfText.trim().length >= MIN_USABLE_TEXT_LENGTH) {
    return { text: pdfText, usedOcr: false };
  }

  // Little to no text layer — likely a scanned/photographed PDF. Fall back
  // to OCR rather than failing outright.
  const ocrText = await ocrPdf(doc.filePath);
  return { text: ocrText || pdfText, usedOcr: true };
};
