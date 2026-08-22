export type ChatLanguage = "en" | "hi";

export interface Citation {
    title: string;
    url: string;
}

export interface Message {
    id: number;
    conversationId: number;
    role: "user" | "assistant";
    content: string;
    kind: "text" | "clarify" | "voice";
    clarifyOptions: string[] | null;
    citations: Citation[] | null;
    audioUrl: string | null;
    createdAt: string;
}

export interface AttachedDocument {
    id: number;
    filePath: string | null;
    content: string | null;
    status: string;
    title: string | null;
    documentType: string | null;
    createdAt: string;
}

export interface ConversationDocumentLink {
    id: number;
    conversationId: number;
    documentId: number;
    createdAt: string;
    document: AttachedDocument;
}

export interface Conversation {
    id: number;
    userId: number;
    title: string | null;
    language: ChatLanguage;
    createdAt: string;
    updatedAt: string;
    messages?: Message[];
    documents?: ConversationDocumentLink[];
}
