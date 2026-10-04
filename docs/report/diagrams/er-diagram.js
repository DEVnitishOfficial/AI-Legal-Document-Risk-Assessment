const { box, arrow, elbow, cardinality, svgDoc } = require("./diagram-kit");
const render = require("./render");

const W = 1500, H = 900;
let body = "";

// ── User (hub) ──────────────────────────────────────────────────────────
const user = { x: 610, y: 30, w: 280, h: 110 };
body += box({ ...user, title: "User", fields: ["id (PK)", "name, email, phone", "password (hashed), role", "createdAt"] });

// ── Row 2: direct children of User ──────────────────────────────────────
const doc = { x: 20, y: 210, w: 260, h: 110 };
const conv = { x: 320, y: 210, w: 260, h: 90 };
const consult = { x: 620, y: 210, w: 260, h: 110 };
const advocate = { x: 920, y: 210, w: 270, h: 130 };
const otp = { x: 1230, y: 210, w: 250, h: 110 };

body += box({ ...doc, title: "Document", fields: ["id (PK)", "userId (FK)", "title, status, type", "filePath / content"] });
body += box({ ...conv, title: "Conversation", fields: ["id (PK)", "userId (FK)", "title, language"] });
body += box({ ...consult, title: "Consultation", fields: ["id (PK)", "userId (FK)", "advocateId (FK, nullable)", "state, language, status"] });
body += box({ ...advocate, title: "Advocate", fields: ["id (PK)", "userId (FK, nullable, unique)", "kind (AI / HUMAN), slug", "status, verificationStatus"] });
body += box({ ...otp, title: "OtpVerification", fields: ["id (PK)", "phone (not a FK)", "codeHash, expiresAt", "attempts, consumed"] });

// ── Row 3: grandchildren ─────────────────────────────────────────────────
const analysis = { x: 20, y: 400, w: 260, h: 90 };
const convDoc = { x: 320, y: 400, w: 260, h: 90 };
const message = { x: 320, y: 530, w: 260, h: 90 };
const turn = { x: 620, y: 400, w: 260, h: 90 };
const cred = { x: 920, y: 400, w: 270, h: 90 };
const aiConfig = { x: 920, y: 530, w: 270, h: 90 };
const chunk = { x: 1230, y: 400, w: 250, h: 110 };

body += box({ ...analysis, title: "Analysis", fields: ["id (PK)", "documentId (FK, unique)", "riskLevel, riskScore"] });
body += box({ ...convDoc, title: "ConversationDocument", fields: ["id (PK)", "conversationId (FK)", "documentId (FK)"] });
body += box({ ...message, title: "Message", fields: ["id (PK)", "conversationId (FK)", "role, content, citations"] });
body += box({ ...turn, title: "ConsultationTurn", fields: ["id (PK)", "consultationId (FK)", "speaker, text, citations"] });
body += box({ ...cred, title: "AdvocateCredential", fields: ["id (PK)", "advocateId (FK)", "type, title, verified"] });
body += box({ ...aiConfig, title: "AdvocateAiConfig", fields: ["id (PK)", "advocateId (FK, unique)", "model, voice, persona"] });
body += box({ ...chunk, title: "LegalKnowledgeChunk", fields: ["id (PK)", "sourceUrl (not a FK)", "content, embedding vector(1536)", "actShort, section"] });

// ── Relationships ─────────────────────────────────────────────────────────
const top = (b) => ({ x: b.x + b.w / 2, y: b.y });
const bottom = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h });
const left = (b) => ({ x: b.x, y: b.y + b.h / 2 });
const right = (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 });

const rel = (from, to, label) => arrow({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, label });

body += rel(bottom({ x: user.x + 60, y: user.y, w: 0, h: user.h }), top(doc), "");
body += rel({ x: user.x + 40, y: user.y + user.h }, { x: conv.x + conv.w / 2, y: conv.y }, "");
body += rel({ x: user.x + user.w - 40, y: user.y + user.h }, { x: consult.x + consult.w / 2, y: consult.y }, "");
body += rel({ x: user.x + user.w - 60, y: user.y + user.h }, { x: advocate.x + advocate.w / 2, y: advocate.y }, "");

body += rel(bottom(doc), top(analysis), "1:1");
body += arrow({ x1: doc.x + doc.w, y1: doc.y + doc.h - 15, x2: convDoc.x, y2: convDoc.y + 15, label: "1:N", labelT: 0.12 });
body += rel(bottom(conv), top(convDoc), "1:N");
// conv -> message is routed around the convDoc box (they share the same
// x-column, so a straight line would cut through convDoc and its label
// would land directly on convDoc's title).
body += elbow(
  [right(conv), { x: 600, y: conv.y + conv.h / 2 }, { x: 600, y: message.y + message.h / 2 }, right(message)],
  { label: "1:N" }
);
body += rel(bottom(consult), top(turn), "1:N");
body += rel(bottom(advocate), top(cred), "1:N");
body += arrow({ x1: advocate.x + advocate.w, y1: advocate.y + advocate.h - 25, x2: aiConfig.x + aiConfig.w, y2: aiConfig.y + 20, label: "1:1", labelT: 0.2 });

// Cardinality hints near the User hub
body += cardinality(user.x + 60, user.y + user.h + 16, "1");
body += cardinality(doc.x + doc.w / 2, doc.y - 8, "N");
body += cardinality(conv.x + conv.w / 2, conv.y - 8, "N");
body += cardinality(consult.x + consult.w / 2, consult.y - 8, "N");
body += cardinality(advocate.x + advocate.w / 2, advocate.y - 8, "0..1");

// Legend
body += `<text x="20" y="${H - 20}" font-family="Arial" font-size="11" fill="#555">Standalone entities (no foreign key into the diagram above): OtpVerification (keyed by phone), LegalKnowledgeChunk (retrieved by vector similarity, not joined).</text>`;

const html = svgDoc(W, H, body, "Figure 2.2 — Entity-Relationship Diagram");
render(html, __dirname + "/er-diagram.png");
