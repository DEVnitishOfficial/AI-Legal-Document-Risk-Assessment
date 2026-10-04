const { lifeline, seqMsg, seqSelf, svgDoc } = require("./diagram-kit");
const render = require("./render");

const W = 1800, H = 940;
const topY = 40, bottomY = 880;
let body = "";

const cols = {
  user: 120, client: 390, api: 660, queue: 930, worker: 1200, ai: 1470, db: 1700,
};
const labels = {
  user: "User", client: "Client (React SPA)", api: "API (Express)",
  queue: "Queue (Redis / BullMQ)", worker: "Analysis Worker", ai: "AI / LLM Provider", db: "Database (Postgres)",
};
Object.entries(cols).forEach(([k, x]) => { body += lifeline(x, labels[k], topY, bottomY, k === "client" || k === "queue" ? 190 : 160); });

let y = 140;
const step = 48;
const msg = (from, to, label, opts) => { body += seqMsg(cols[from], cols[to], y, label, opts); y += step; };

msg("user", "client", "Select file, click “Analyze”");
msg("client", "api", "POST /documents (multipart upload)");
msg("api", "db", "INSERT Document (status = pending)");
msg("api", "client", "201 Created { documentId }", { dashed: true });
msg("client", "api", "POST /analysis/run { documentId }");
msg("api", "queue", "enqueueAnalysis() — jobId: analysis-{id}");
msg("api", "client", "202 Accepted { status: processing }", { dashed: true });
body += seqSelf(cols.client, y, "poll GET /analysis/run every 3s", 90); y += step + 10;
msg("queue", "worker", "deliver job (BullMQ)");
msg("worker", "db", "read extracted text (OCR fallback if needed)");
msg("worker", "ai", "prompt: summarise + classify + score risk");
msg("ai", "worker", "completion (JSON)", { dashed: true });
msg("worker", "db", "save Analysis; mark Document completed");
msg("api", "client", "200 OK { riskScore, summary, clauses }", { dashed: true });
msg("client", "user", "render risk report");

const html = svgDoc(W, H, body, "Figure 2.7 — Sequence Diagram: Document Analysis");
render(html, __dirname + "/seq-document-analysis.png");
