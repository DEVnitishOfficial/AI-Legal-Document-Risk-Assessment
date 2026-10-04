const { box, svgDoc, NAVY } = require("./diagram-kit");
const render = require("./render");

const W = 1900, H = 780;
let body = "";

const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="1.3"/>`;

const root = { x: 790, y: 30, w: 320, h: 60 };
body += box({ ...root, title: "NyayMitra AI System" });

const modW = 230, modH = 50;
const modules = [
  { key: "auth", x: 40, title: "Auth & User" },
  { key: "doc", x: 310, title: "Document" },
  { key: "analysis", x: 580, title: "Analysis" },
  { key: "legal", x: 850, title: "Legal Assistant" },
  { key: "advocate", x: 1120, title: "Connect Advocate" },
  { key: "admin", x: 1390, title: "Admin" },
  { key: "platform", x: 1630, title: "Platform / Shared" },
];
const modY = 180;
modules.forEach((m) => { body += box({ x: m.x, y: modY, w: modW, h: modH, title: m.title }); });

// Root -> each module
const rootBottom = { x: root.x + root.w / 2, y: root.y + root.h };
modules.forEach((m) => {
  body += line(rootBottom.x, rootBottom.y, m.x + modW / 2, modY);
});

const subW = 220, subH = 56;
const subY = 340;
const subGap = 14;
const subModules = {
  auth: ["Register / Login", "OTP (MSG91)", "Google OAuth", "Session / JWT"],
  doc: ["Upload (PDF/JPG/PNG)", "Paste text", "Text extraction", "OCR fallback"],
  analysis: ["Enqueue job (BullMQ)", "AI summary + classify", "Risk scoring", "Result cache"],
  legal: ["Chat (SSE stream)", "RAG retrieval", "Citation verify", "Voice I/O"],
  advocate: ["AI voice consult", "Human request/accept", "WebRTC call", "Consult history"],
  admin: ["Advocate verification", "Role management", "—", "—"],
  platform: ["Validation (Zod)", "Logging (Pino)", "Security headers", "OpenAPI docs"],
};

modules.forEach((m) => {
  const subs = subModules[m.key];
  const colX = m.x + (modW - subW) / 2;
  subs.forEach((label, i) => {
    if (label === "—") return;
    const y = subY + i * (subH + subGap);
    body += box({ x: colX, y, w: subW, h: subH, title: label, titleFill: "#ffffff", titleColor: NAVY, rx: 4 });
    body += `<rect x="${colX}" y="${y}" width="${subW}" height="${subH}" rx="4" fill="none" stroke="${NAVY}" stroke-width="1"/>`;
  });
  // module -> first submodule connector, then a single vertical spine linking the stack
  body += line(m.x + modW / 2, modY + modH, m.x + modW / 2, subY);
  for (let i = 0; i < subs.length - 1; i++) {
    if (subs[i] === "—" || subs[i + 1] === "—") continue;
    const y1 = subY + i * (subH + subGap) + subH;
    const y2 = subY + (i + 1) * (subH + subGap);
    body += line(m.x + modW / 2, y1, m.x + modW / 2, y2);
  }
});

const html = svgDoc(W, H, body, "Figure 3.2 — Module Decomposition");
render(html, __dirname + "/module-decomposition.png");
