import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";

// A scanned document can run to dozens of pages; OCR-ing all of them would
// be slow and (if this ever moves to a paid OCR API) costly for little
// extra benefit — the document's risky clauses are almost always findable
// well within the first few pages. Same cost-control instinct as the
// AI prompt's own 4000-character cap in analysis.service.ts.
const MAX_OCR_PAGES = 5;

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];

/** OCRs a scanned PDF (no usable text layer) by rasterizing its pages and reading them. */
export const ocrPdf = async (filePath: string): Promise<string> => {
  const doc = await pdf(filePath, { scale: 2 });
  const worker = await createWorker("eng");

  try {
    const pages: string[] = [];
    let pageIndex = 0;
    for await (const pageImage of doc) {
      if (pageIndex >= MAX_OCR_PAGES) break;
      const { data } = await worker.recognize(pageImage);
      pages.push(data.text);
      pageIndex += 1;
    }
    return pages.join("\n\n").trim();
  } finally {
    await worker.terminate();
  }
};

/** OCRs a directly-uploaded photo/scan (jpg/png) of a document. */
export const ocrImage = async (filePath: string): Promise<string> => {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(filePath);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
};
