import { useState } from "react";
import { MessageSquareText, ListChecks, Paperclip } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import PageIntro from "../components/layout/PageIntro";
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
        <div className="flex h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50">
            <Sidebar />

            <ConversationSidebar
                conversations={conversations}
                activeId={activeId}
                onSelect={selectConversation}
                onNew={startNewConversation}
            />

            <div className="flex-1 flex flex-col min-h-0">
                <PageIntro
                    storageKey="legal-assistant"
                    eyebrow="Legal assistant"
                    title="Ask a question about Indian law"
                    description="Describe a legal problem — a bank fraud, a rental dispute, a police case — and get your options explained in plain language, with sources. It gives general information, not legal advice."
                    points={[
                        { icon: MessageSquareText, title: "Ask in your own words", text: "Type it, or tap the mic. English and Hindi both work." },
                        { icon: ListChecks, title: "Answer a few follow-ups", text: "If your situation is unclear, it asks short questions before advising." },
                        { icon: Paperclip, title: "Attach a document", text: "Use the paperclip so answers are based on your actual lease or notice." },
                    ]}
                />

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
