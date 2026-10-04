const { box, arrow, svgDoc, CREAM } = require("./diagram-kit");
const render = require("./render");

const W = 1600, H = 760;
let body = "";

const user = { x: 690, y: 30, w: 220, h: 70 };
body += box({ ...user, title: "User" });

const procY = 190, procH = 120, procW = 210;
const procs = {
  p1: { x: 60, y: procY, w: procW, h: procH, title: "1.0  Authenticate & Manage User" },
  p2: { x: 340, y: procY, w: procW, h: procH, title: "2.0  Upload & Extract Document" },
  p3: { x: 620, y: procY, w: procW, h: procH, title: "3.0  Analyze Document (AI)" },
  p4: { x: 900, y: procY, w: procW, h: procH, title: "4.0  Legal Assistant Chat (RAG)" },
  p5: { x: 1180, y: procY, w: procW, h: procH, title: "5.0  Connect Advocate" },
};
Object.values(procs).forEach((p) => { body += box({ ...p, shape: "ellipse" }); });

const storeY = 480, storeH = 70, storeW = 210;
const stores = {
  d1: { x: 60, y: storeY, w: storeW, h: storeH, title: "D1  Users" },
  d2: { x: 340, y: storeY, w: storeW, h: storeH, title: "D2  Documents" },
  d3: { x: 620, y: storeY, w: storeW, h: storeH, title: "D3  Analyses" },
  d4: { x: 900, y: storeY, w: storeW, h: storeH, title: "D4  Conversations / Messages" },
  d5: { x: 900, y: storeY + 110, w: storeW, h: storeH, title: "D5  LegalKnowledgeChunk" },
  d6: { x: 1180, y: storeY, w: storeW, h: storeH, title: "D6  Consultations" },
};
Object.values(stores).forEach((s) => { body += box({ ...s, fill: CREAM }); });

const topMid = (b) => ({ x: b.x + b.w / 2, y: b.y });
const bottomMid = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h });
const leftMid = (b) => ({ x: b.x, y: b.y + b.h / 2 });
const rightMid = (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 });
const rel = (from, to, label, labelT) => arrow({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, label, labelT: labelT ?? 0.5 });

// User <-> processes it talks to directly
body += rel({ x: user.x + 20, y: user.y + user.h }, { x: procs.p1.x + procs.p1.w - 30, y: procs.p1.y }, "register / login / OTP", 0.65);
body += rel({ x: user.x + 70, y: user.y + user.h }, topMid(procs.p2), "upload / paste text", 0.65);
body += rel(topMid(procs.p3), { x: user.x + 130, y: user.y + user.h }, "risk report", 0.35);
body += rel({ x: user.x + 150, y: user.y + user.h }, { x: procs.p4.x + 40, y: procs.p4.y }, "chat / voice query", 0.65);
body += rel({ x: user.x + user.w - 20, y: user.y + user.h }, { x: procs.p5.x + 30, y: procs.p5.y }, "consultation request", 0.7);

// Process <-> data store
body += rel(bottomMid(procs.p1), topMid(stores.d1), "user record");
body += rel(bottomMid(procs.p2), topMid(stores.d2), "document + extracted text");
body += rel({ x: procs.p3.x + 40, y: procs.p3.y + procH }, { x: stores.d2.x + storeW - 30, y: stores.d2.y }, "read text", 0.4);
body += rel({ x: procs.p3.x + procW - 40, y: procs.p3.y + procH }, topMid(stores.d3), "risk result", 0.6);
body += rel(bottomMid(procs.p4), topMid(stores.d4), "message history");
body += rel({ x: procs.p4.x + procW - 30, y: procs.p4.y + 60 }, leftMid(stores.d5), "vector search", 0.5);
body += rel(bottomMid(procs.p5), topMid(stores.d6), "consultation record");

// Inter-process: document record needed before analysis can run
body += rel(rightMid(procs.p2), leftMid(procs.p3), "documentId");

body += `<text x="20" y="${H - 40}" font-family="Arial" font-size="11" fill="#555">External-entity flows (User's risk report / chat reply, MSG91 OTP, the AI/LLM provider, and the human advocate hand-off) are shown in Figure 2.3 (Context Diagram) and omitted here for clarity.</text>`;
body += `<text x="20" y="${H - 20}" font-family="Arial" font-size="11" fill="#555">Process 5.0 also reads the advocate's profile from D1 (Users) when matching a consultation request; omitted above to avoid a diagram-spanning crossing line.</text>`;

const html = svgDoc(W, H, body, "Figure 2.4 — DFD: Level 1");
render(html, __dirname + "/dfd-level1.png");
