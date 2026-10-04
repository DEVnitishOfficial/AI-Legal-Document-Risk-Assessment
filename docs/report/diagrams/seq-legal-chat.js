const { lifeline, seqMsg, seqSelf, svgDoc } = require("./diagram-kit");
const render = require("./render");

const W = 1800, H = 920;
const topY = 40, bottomY = 860;
let body = "";

const cols = {
  user: 120, client: 390, api: 660, rag: 930, vector: 1200, ai: 1470, db: 1700,
};
const labels = {
  user: "User", client: "Client (React SPA)", api: "API (Express, SSE)",
  rag: "RAG Retrieval Service", vector: "Vector Store (pgvector)", ai: "AI / LLM Provider", db: "Database (Postgres)",
};
Object.entries(cols).forEach(([k, x]) => { body += lifeline(x, labels[k], topY, bottomY, k === "rag" || k === "client" ? 190 : 170); });

let y = 140;
const step = 54;
const msg = (from, to, label, opts) => { body += seqMsg(cols[from], cols[to], y, label, opts); y += step; };

msg("user", "client", "Type / speak legal question (English or Hindi)");
msg("client", "api", "POST /legal-agent/conversations/:id/messages (SSE) { content }");
msg("api", "rag", "retrieve(content)");
msg("rag", "vector", "embedding similarity search (pgvector)");
msg("vector", "rag", "top-k LegalKnowledgeChunk rows", { dashed: true });
msg("rag", "api", "grounded context + source citations", { dashed: true });
msg("api", "ai", "stream completion(prompt + grounded context)");
msg("ai", "api", "token stream (SSE)", { dashed: true });
body += seqSelf(cols.api, y, "verify each citation against the retrieved chunk text", 90); y += step + 10;
msg("api", "client", "forward token stream (SSE)");
msg("client", "user", "render reply incrementally, word-by-word");
msg("api", "db", "save Message (role = assistant, citations)");

const html = svgDoc(W, H, body, "Figure 2.8 — Sequence Diagram: Legal Assistant Chat (RAG)");
render(html, __dirname + "/seq-legal-chat.png");
