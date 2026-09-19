import Sidebar from "../components/layout/Sidebar";
import WelcomeHeader from "../features/dashboard/WelcomeHeader";
import StatCards from "../features/dashboard/StatCards";
import RecentDocuments from "../features/dashboard/RecentDocuments";
import RecentChats from "../features/dashboard/RecentChats";
import { useDashboardData } from "../features/dashboard/useDashboardData";
import { useDocumentActions } from "../features/document/useDocumentActions";

// The Dashboard is an overview only — uploading and analyzing live on the
// Documents page, chatting on Legal Assistant.
export default function Dashboard() {
  const { documents, chats, loading, failed, updateDocument, removeDocument } = useDashboardData();

  const actions = useDocumentActions({ onUpdated: updateDocument, onDeleted: removeDocument });

  return (
    <div className="flex h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-7xl mx-auto">
          <WelcomeHeader />

          {failed && (
            <p role="alert" className="text-sm rounded-lg px-4 py-3 bg-risk-high-bg text-risk-high-fg dark:bg-risk-high-bg-dark dark:text-risk-high-fg-dark">
              Couldn't load your workspace. Check your connection and refresh the page.
            </p>
          )}

          <StatCards documents={documents} chats={chats} loading={loading} />

          {/* Side by side only when the documents table (the wider content) fits
              beside a fixed-width chat column; stacked below that. */}
          <div className="grid min-[1400px]:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
            <RecentDocuments documents={documents} loading={loading} actions={actions} />
            <RecentChats chats={chats} loading={loading} />
          </div>
        </div>
      </main>

      {actions.dialogs}
    </div>
  );
}
