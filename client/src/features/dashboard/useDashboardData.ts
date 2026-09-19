import { useEffect, useState } from "react";
import API from "../../services/api";

// The Dashboard is a summary of two existing lists — documents and chats — so
// it needs no endpoint of its own. Local updaters let row actions (favorite,
// rename, delete) reflect immediately without refetching.
export function useDashboardData() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      API.get("/documents/get-documents"),
      API.get("/legal-agent/conversations"),
    ])
      .then(([docsRes, chatsRes]) => {
        if (cancelled) return;
        setDocuments(docsRes.data.data);
        setChats(chatsRes.data.data.conversations);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const updateDocument = (updated: any) =>
    setDocuments((docs) => docs.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));

  const removeDocument = (id: number) => setDocuments((docs) => docs.filter((d) => d.id !== id));

  return { documents, chats, loading, failed, updateDocument, removeDocument };
}
