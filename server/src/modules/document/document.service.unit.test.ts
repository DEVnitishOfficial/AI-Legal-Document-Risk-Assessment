import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./document.repository", () => ({
  getDocumentById: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  createTextDocument: vi.fn(),
  createDocument: vi.fn(),
}));
vi.mock("../../common/utils/files", () => ({ removeUploadedFile: vi.fn() }));

import * as docRepo from "./document.repository";
import { removeUploadedFile } from "../../common/utils/files";
import { createTextDoc, updateDocument, deleteDocument, uploadDocument } from "./document.service";

const mockedRepo = vi.mocked(docRepo);
const mockedRemoveFile = vi.mocked(removeUploadedFile);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTextDoc", () => {
  it("rejects text under the 50-character minimum", async () => {
    await expect(createTextDoc(1, "too short")).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedRepo.createTextDocument).not.toHaveBeenCalled();
  });

  it("rejects empty/whitespace-only content", async () => {
    await expect(createTextDoc(1, "   ")).rejects.toMatchObject({ statusCode: 400 });
    await expect(createTextDoc(1, undefined as unknown as string)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("accepts content at or above the minimum and caps the preview to 300 chars", async () => {
    const longText = "x".repeat(500);
    mockedRepo.createTextDocument.mockResolvedValue({ id: 1, content: longText } as any);

    const result = await createTextDoc(1, longText);

    expect(mockedRepo.createTextDocument).toHaveBeenCalledWith(1, longText);
    expect(result.preview.length).toBe(300);
  });
});

describe("updateDocument (rename / favorite)", () => {
  const ownedDoc = { id: 10, userId: 1, title: "Old title" };

  it("rejects an empty title", async () => {
    mockedRepo.getDocumentById.mockResolvedValue(ownedDoc as any);
    await expect(updateDocument(10, 1, { title: "   " })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects a title over 120 characters", async () => {
    mockedRepo.getDocumentById.mockResolvedValue(ownedDoc as any);
    await expect(updateDocument(10, 1, { title: "a".repeat(121) })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects a non-boolean isFavorite", async () => {
    mockedRepo.getDocumentById.mockResolvedValue(ownedDoc as any);
    await expect(updateDocument(10, 1, { isFavorite: "yes" as any })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects an update with neither field set", async () => {
    mockedRepo.getDocumentById.mockResolvedValue(ownedDoc as any);
    await expect(updateDocument(10, 1, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects updating a document that belongs to someone else (IDOR guard)", async () => {
    mockedRepo.getDocumentById.mockResolvedValue({ id: 10, userId: 999 } as any);
    await expect(updateDocument(10, 1, { title: "New title" })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockedRepo.updateDocument).not.toHaveBeenCalled();
  });

  it("rejects updating a document that does not exist", async () => {
    mockedRepo.getDocumentById.mockResolvedValue(null);
    await expect(updateDocument(999, 1, { title: "New title" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("applies a valid rename for the owning user", async () => {
    mockedRepo.getDocumentById.mockResolvedValue(ownedDoc as any);
    mockedRepo.updateDocument.mockResolvedValue({ ...ownedDoc, title: "New title" } as any);

    const result = await updateDocument(10, 1, { title: "  New title  " });

    expect(mockedRepo.updateDocument).toHaveBeenCalledWith(10, { title: "New title" });
    expect(result.title).toBe("New title");
  });
});

describe("deleteDocument", () => {
  it("rejects deleting another user's document (IDOR guard)", async () => {
    mockedRepo.getDocumentById.mockResolvedValue({ id: 10, userId: 999, filePath: null } as any);
    await expect(deleteDocument(10, 1)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockedRepo.deleteDocument).not.toHaveBeenCalled();
  });

  it("deletes the DB row before best-effort removing the uploaded file", async () => {
    mockedRepo.getDocumentById.mockResolvedValue({
      id: 10,
      userId: 1,
      filePath: "uploads/some-file.pdf",
    } as any);

    await deleteDocument(10, 1);

    expect(mockedRepo.deleteDocument).toHaveBeenCalledWith(10);
    expect(mockedRemoveFile).toHaveBeenCalledWith("uploads/some-file.pdf");
  });
});

describe("uploadDocument", () => {
  it("just saves the document row, for any file type — no eager text extraction", async () => {
    // Regression test: this used to call pdf-parse unconditionally on the
    // uploaded file (for an unread "preview" field), which threw on any
    // non-PDF file — a real 500 surfaced once image uploads were added.
    // Real text extraction (extension-aware, with OCR fallback) now only
    // happens in the background analysis job (analysis.textExtraction.ts).
    mockedRepo.createDocument.mockResolvedValue({ id: 1, userId: 1, filePath: "uploads/photo.png" } as any);

    const result = await uploadDocument(1, "uploads/photo.png");

    expect(mockedRepo.createDocument).toHaveBeenCalledWith(1, "uploads/photo.png");
    expect(result).toEqual({ document: { id: 1, userId: 1, filePath: "uploads/photo.png" } });
  });
});
