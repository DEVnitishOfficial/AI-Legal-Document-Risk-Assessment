import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../common/utils/pdf", () => ({ extractTextFromPDF: vi.fn() }));
vi.mock("../../common/utils/ocr", () => ({
  ocrPdf: vi.fn(),
  ocrImage: vi.fn(),
  IMAGE_EXTENSIONS: [".png", ".jpg", ".jpeg"],
}));

import { extractTextFromPDF } from "../../common/utils/pdf";
import { ocrPdf, ocrImage } from "../../common/utils/ocr";
import { extractDocumentText } from "./analysis.textExtraction";

const mockedExtractPdf = vi.mocked(extractTextFromPDF);
const mockedOcrPdf = vi.mocked(ocrPdf);
const mockedOcrImage = vi.mocked(ocrImage);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractDocumentText", () => {
  it("uses pasted content as-is, without touching the filesystem or OCR", async () => {
    const result = await extractDocumentText({ content: "Some pasted legal text here.", filePath: null });
    expect(result).toEqual({ text: "Some pasted legal text here.", usedOcr: false });
    expect(mockedExtractPdf).not.toHaveBeenCalled();
    expect(mockedOcrPdf).not.toHaveBeenCalled();
  });

  it("returns empty text when a document has neither content nor a file", async () => {
    const result = await extractDocumentText({ content: null, filePath: null });
    expect(result).toEqual({ text: "", usedOcr: false });
  });

  it("uses the PDF's text layer directly when it has enough real text", async () => {
    const longEnough = "A real lease clause. ".repeat(5); // > 50 chars
    mockedExtractPdf.mockResolvedValue(longEnough);

    const result = await extractDocumentText({ content: null, filePath: "uploads/lease.pdf" });

    expect(result).toEqual({ text: longEnough, usedOcr: false });
    expect(mockedOcrPdf).not.toHaveBeenCalled();
  });

  it("falls back to OCR when the PDF's text layer is too short (a likely scan)", async () => {
    mockedExtractPdf.mockResolvedValue("   "); // scanned PDF: no real text layer
    mockedOcrPdf.mockResolvedValue("Recognized text from the scanned pages.");

    const result = await extractDocumentText({ content: null, filePath: "uploads/scanned.pdf" });

    expect(mockedOcrPdf).toHaveBeenCalledWith("uploads/scanned.pdf");
    expect(result).toEqual({ text: "Recognized text from the scanned pages.", usedOcr: true });
  });

  it("keeps the (empty) pdf-parse text if OCR itself finds nothing, rather than throwing", async () => {
    mockedExtractPdf.mockResolvedValue("");
    mockedOcrPdf.mockResolvedValue("");

    const result = await extractDocumentText({ content: null, filePath: "uploads/blank.pdf" });
    expect(result).toEqual({ text: "", usedOcr: true });
  });

  it("OCRs a directly-uploaded photo of a document without ever calling pdf-parse", async () => {
    mockedOcrImage.mockResolvedValue("Text read from the photo.");

    const result = await extractDocumentText({ content: null, filePath: "uploads/notice.jpg" });

    expect(mockedOcrImage).toHaveBeenCalledWith("uploads/notice.jpg");
    expect(mockedExtractPdf).not.toHaveBeenCalled();
    expect(result).toEqual({ text: "Text read from the photo.", usedOcr: true });
  });

  it("treats .png/.jpeg the same way as .jpg", async () => {
    mockedOcrImage.mockResolvedValue("png text");
    await extractDocumentText({ content: null, filePath: "uploads/a.png" });
    expect(mockedOcrImage).toHaveBeenCalledWith("uploads/a.png");

    mockedOcrImage.mockResolvedValue("jpeg text");
    await extractDocumentText({ content: null, filePath: "uploads/b.jpeg" });
    expect(mockedOcrImage).toHaveBeenCalledWith("uploads/b.jpeg");
  });
});
