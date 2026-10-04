const { box, arrow, svgDoc, NAVY, GOLD } = require("./diagram-kit");
const render = require("./render");

const W = 1400, H = 1420;
let body = "";

const cx = 500; // main column centre x
const actAt = (x, y, title, w = 340) => box({ x: x - w / 2, y, w, h: 70, title, rx: 10 });
const act = (y, title, w = 340) => actAt(cx, y, title, w);
const dec = (y, title, w = 280) => box({ x: cx - w / 2, y, w, h: 100, title, shape: "diamond" });
const dot = (y, r = 12) => `<circle cx="${cx}" cy="${y}" r="${r}" fill="${NAVY}"/>`;
const endDot = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="#ffffff" stroke="${NAVY}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="7" fill="${NAVY}"/>`;
const rel = (x1, y1, x2, y2, label, labelT) => arrow({ x1, y1, x2, y2, label, labelT: labelT ?? 0.5 });

const sideX = 1180;

let y = 40;
body += dot(y);
body += `<text x="${cx + 24}" y="${y + 5}" font-family="Arial" font-size="12" fill="${NAVY}">Start</text>`;

const a1y = y + 50; body += act(a1y, "Select file / paste text, submit");
body += rel(cx, y + 12, cx, a1y);

const a2y = a1y + 140; body += act(a2y, "Validate input (Section 4.3 / FR-4)");
body += rel(cx, a1y + 70, cx, a2y);

const d1y = a2y + 140; body += dec(d1y, "Valid?");
body += rel(cx, a2y + 70, cx, d1y);

// "no" branch from D1 to the side column, vertically centred on the diamond
const e1y = d1y + 15;
body += actAt(sideX, e1y, "Show validation error", 300);
body += rel(cx + 140, d1y + 50, sideX - 150, e1y + 35, "no", 0.5);
body += endDot(sideX, e1y + 130);
body += rel(sideX, e1y + 70, sideX, e1y + 117);

const a3y = d1y + 140; body += act(a3y, "Save Document (pending); enqueueAnalysis()");
body += rel(cx, d1y + 100, cx, a3y, "yes", 0.4);

const a4y = a3y + 140; body += act(a4y, "Extract text — stored text → PDF layer → OCR fallback");
body += rel(cx, a3y + 70, cx, a4y);

const d2y = a4y + 140; body += dec(d2y, "Text usable?");
body += rel(cx, a4y + 70, cx, d2y);

const e2y = d2y + 15;
body += actAt(sideX, e2y, "Mark FAILED; notify user", 300);
body += rel(cx + 140, d2y + 50, sideX - 150, e2y + 35, "no", 0.5);
body += endDot(sideX, e2y + 130);
body += rel(sideX, e2y + 70, sideX, e2y + 117);

const a5y = d2y + 140; body += act(a5y, "Call AI provider — summarise, classify, score risk");
body += rel(cx, d2y + 100, cx, a5y, "yes", 0.4);

const a6y = a5y + 140; body += act(a6y, "Persist Analysis; mark Document COMPLETED");
body += rel(cx, a5y + 70, cx, a6y);

const a7y = a6y + 140; body += act(a7y, "Client polls; display Risk Report (Figure 3.6)");
body += rel(cx, a6y + 70, cx, a7y);

const endY = a7y + 130;
body += endDot(cx, endY);
body += rel(cx, a7y + 70, cx, endY - 13);

const html = svgDoc(W, H, body, "Figure 2.12 — Activity Diagram: Upload Document to Risk Report");
render(html, __dirname + "/activity-diagram.png");
