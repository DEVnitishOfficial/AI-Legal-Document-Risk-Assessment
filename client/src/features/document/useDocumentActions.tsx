import { useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RenameDialog from "../../components/ui/RenameDialog";
import DocumentViewerModal from "../legal-agent/DocumentViewerModal";
import {
  renameDocument,
  setDocumentFavorite,
  deleteDocument,
  documentDisplayName,
} from "./documentApi";

interface UseDocumentActionsOptions {
  /** Called with the document merged with the server's update (keeps `analysis`). */
  onUpdated: (doc: any) => void;
  onDeleted: (id: number) => void;
}

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

// The document actions shared by every screen that lists documents. Returns
// the action functions plus the dialogs they open — render `dialogs` once.
export function useDocumentActions({ onUpdated, onDeleted }: UseDocumentActionsOptions) {
  const [renaming, setRenaming] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const toggleFavorite = async (doc: any) => {
    const next = !doc.isFavorite;
    try {
      const updated = await setDocumentFavorite(doc.id, next);
      onUpdated({ ...doc, ...updated });
      toast.success(next ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't update favorite"));
    }
  };

  const saveRename = async (value: string) => {
    if (!renaming) return;
    try {
      const updated = await renameDocument(renaming.id, value);
      onUpdated({ ...renaming, ...updated });
      toast.success("Document renamed");
      setRenaming(null);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't rename document"));
      throw err; // keeps the dialog open
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteDocument(deleting.id);
      onDeleted(deleting.id);
      toast.success("Document deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't delete document"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const dialogs: ReactNode = (
    <>
      {renaming && (
        <RenameDialog
          title="Rename document"
          label="Document name"
          initialValue={documentDisplayName(renaming)}
          onSave={saveRename}
          onCancel={() => setRenaming(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          danger
          busy={deleteBusy}
          title="Delete this document?"
          message={`“${documentDisplayName(deleting)}” and its analysis report will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete document"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      {viewingId !== null && (
        <DocumentViewerModal documentId={viewingId} onClose={() => setViewingId(null)} />
      )}
    </>
  );

  return {
    toggleFavorite,
    rename: (doc: any) => setRenaming(doc),
    remove: (doc: any) => setDeleting(doc),
    view: (doc: any) => setViewingId(doc.id),
    dialogs,
  };
}
