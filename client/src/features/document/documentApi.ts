import API from "../../services/api";

// Thin wrappers over the document endpoints so every screen (Dashboard,
// Documents) performs these actions identically.

export const renameDocument = async (id: number, title: string) => {
  const res = await API.patch(`/documents/${id}`, { title });
  return res.data.data.document;
};

export const setDocumentFavorite = async (id: number, isFavorite: boolean) => {
  const res = await API.patch(`/documents/${id}`, { isFavorite });
  return res.data.data.document;
};

export const deleteDocument = async (id: number) => {
  await API.delete(`/documents/${id}`);
};

export const documentDisplayName = (doc: any): string => {
  if (doc.title) return doc.title;
  if (!doc.filePath) return "Text Document";
  return doc.filePath.split("\\").pop()?.split("/").pop() || "Document";
};
