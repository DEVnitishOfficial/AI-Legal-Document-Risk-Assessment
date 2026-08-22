// Paragraph-aware chunker: groups paragraphs up to ~CHUNK_SIZE characters
// (roughly 500-800 tokens at ~4 chars/token) with a small overlap so a
// concept split across a paragraph boundary isn't lost from either chunk.
const CHUNK_SIZE = 2800;
const OVERLAP = 300;

export const chunkText = (text: string): string[] => {
    const paragraphs = text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

    const chunks: string[] = [];
    let current = "";

    for (const paragraph of paragraphs) {
        if (current.length + paragraph.length + 1 > CHUNK_SIZE && current) {
            chunks.push(current.trim());
            current = current.slice(Math.max(0, current.length - OVERLAP));
        }
        current += (current ? "\n\n" : "") + paragraph;
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks.filter((c) => c.length > 50); // drop near-empty fragments
};
