const { box, elbow, svgDoc, CREAM } = require("./diagram-kit");
const render = require("./render");

const W = 1700, H = 620;
let body = "";

const procY = 90, procH = 110, procW = 260;
const p1 = { x: 60, y: procY, w: procW, h: procH, title: "3.1 Check Cache / Read Stored Text" };
const p2 = { x: 380, y: procY, w: procW, h: procH, title: "3.2 OCR Fallback (if needed)" };
const p3 = { x: 700, y: procY, w: procW, h: procH, title: "3.3 Call AI Provider" };
const p4 = { x: 1020, y: procY, w: procW, h: procH, title: "3.4 Compute Risk Score" };
const p5 = { x: 1340, y: procY, w: procW, h: procH, title: "3.5 Persist Analysis & Mark Document" };
[p1, p2, p3, p4, p5].forEach((p) => { body += box({ ...p, shape: "ellipse" }); });

const d2 = { x: 60, y: 420, w: 260, h: 80 };
const d3 = { x: 1340, y: 420, w: 260, h: 80 };
body += box({ ...d2, title: "D2  Documents", fill: CREAM });
body += box({ ...d3, title: "D3  Analyses", fill: CREAM });

const mid = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const rightMid = (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 });
const leftMid = (b) => ({ x: b.x, y: b.y + b.h / 2 });
const line = (x1, y1, x2, y2, label, labelT) => elbow([{ x: x1, y: y1 }, { x: x2, y: y2 }], { label, labelT: labelT ?? 0.5 });

body += line(rightMid(p1).x, rightMid(p1).y, leftMid(p2).x, leftMid(p2).y, "if unusable", 0.5);
body += line(rightMid(p2).x, rightMid(p2).y, leftMid(p3).x, leftMid(p3).y, "extracted text", 0.5);
body += line(rightMid(p3).x, rightMid(p3).y, leftMid(p4).x, leftMid(p4).y, "riskLevel", 0.5);
body += line(rightMid(p4).x, rightMid(p4).y, leftMid(p5).x, leftMid(p5).y, "riskScore", 0.5);

// D2 <-> p1 (read), D2 -> p5 (mark analyzed)
body += elbow(
  [{ x: d2.x + 60, y: d2.y }, { x: d2.x + 60, y: 340 }, { x: p1.x + 60, y: 340 }, { x: p1.x + 60, y: p1.y + p1.h }],
  { label: "read text", labelSeg: 1 }
);
body += elbow(
  [{ x: p5.x + 60, y: p5.y + p5.h }, { x: p5.x + 60, y: 340 }, { x: d2.x + 200, y: 340 }, { x: d2.x + 200, y: d2.y }],
  { label: "mark analyzed", labelSeg: 1 }
);
// p5 -> D3 (save)
body += elbow(
  [{ x: p5.x + 200, y: p5.y + p5.h }, { x: d3.x + 130, y: d3.y }],
  { label: "save Analysis" }
);

body += `<text x="20" y="${H - 20}" font-family="Arial" font-size="11" fill="#555">Decomposes process 3.0 (Figure 2.4) — the AI/LLM Provider external-entity flow at 3.3 is shown in Figure 2.3 (Context Diagram) and omitted here for clarity.</text>`;

const html = svgDoc(W, H, body, "Figure 2.5 — DFD: Level 2 (Decomposition of Process 3.0 — Analyze Document)");
render(html, __dirname + "/dfd-level2.png");
