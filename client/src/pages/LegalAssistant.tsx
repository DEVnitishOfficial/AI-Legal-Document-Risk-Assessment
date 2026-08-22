import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ConversationSidebar from "../features/legal-agent/ConversationSidebar";
import ChatWindow from "../features/legal-agent/ChatWindow";
import ChatInput from "../features/legal-agent/ChatInput";
import AttachDocumentModal from "../features/legal-agent/AttachDocumentModal";
import AttachedDocumentsBar from "../features/legal-agent/AttachedDocumentsBar";
import DocumentViewerModal from "../features/legal-agent/DocumentViewerModal";
import { useLegalChat } from "../features/legal-agent/useLegalChat";

export default function LegalAssistant() {
    const {
        conversations,
        activeId,
        messages,
        attachedDocuments,
        language,
        loadingMessages,
        sending,
        streamingMessageId,
        selectConversation,
        startNewConversation,
        sendMessage,
        changeLanguage,
        attachDocument,
    } = useLegalChat();

    const [showAttachModal, setShowAttachModal] = useState(false);
    const [viewingDocumentId, setViewingDocumentId] = useState<number | null>(null);

    return (
        <div className="flex h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
            <Sidebar />

            <ConversationSidebar
                conversations={conversations}
                activeId={activeId}
                onSelect={selectConversation}
                onNew={startNewConversation}
            />

            <div className="flex-1 flex flex-col min-h-0">
                <ChatWindow
                    messages={messages}
                    loading={loadingMessages}
                    sending={sending}
                    streamingMessageId={streamingMessageId}
                    language={language}
                    onSend={sendMessage}
                    onStarterPick={sendMessage}
                />

                <AttachedDocumentsBar documents={attachedDocuments} onView={setViewingDocumentId} />

                <ChatInput
                    onSend={sendMessage}
                    onAttachClick={() => setShowAttachModal(true)}
                    language={language}
                    onLanguageChange={changeLanguage}
                    disabled={sending}
                />
            </div>

            {showAttachModal && (
                <AttachDocumentModal
                    onClose={() => setShowAttachModal(false)}
                    onAttached={attachDocument}
                />
            )}

            {viewingDocumentId !== null && (
                <DocumentViewerModal
                    documentId={viewingDocumentId}
                    onClose={() => setViewingDocumentId(null)}
                />
            )}
        </div>
    );
}
