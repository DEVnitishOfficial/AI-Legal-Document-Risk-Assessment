const { box, arrow, svgDoc } = require("./diagram-kit");
const render = require("./render");

const W = 1500, H = 820;
let body = "";

const proc = { x: 580, y: 350, w: 340, h: 140 };
body += box({ ...proc, title: "", shape: "ellipse" });
body += `<text x="${proc.x + proc.w / 2}" y="${proc.y + proc.h / 2 - 10}" text-anchor="middle" font-family="Arial" font-size="13" fill="#1a2744">0</text>`;
body += `<text x="${proc.x + proc.w / 2}" y="${proc.y + proc.h / 2 + 12}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="15" fill="#1a2744">NyayMitra AI System</text>`;

const user = { x: 70, y: 40, w: 260, h: 90 };
const msg91 = { x: 1160, y: 40, w: 270, h: 90 };
const ai = { x: 1160, y: 660, w: 270, h: 100 };
const advocate = { x: 70, y: 660, w: 260, h: 100 };

body += box({ ...user, title: "User", fields: ["(Document owner / client)"] });
body += box({ ...msg91, title: "MSG91 OTP Gateway", fields: ["(external SMS service)"] });
body += box({ ...ai, title: "AI / LLM Provider", fields: ["(OpenAI — chat, embeddings,", "realtime voice)"] });
body += box({ ...advocate, title: "Human Advocate", fields: ["(verified legal", "professional)"] });

// Single two-headed connector per entity<->process pair, with a stacked
// two-line label (request, then response) placed at the line's own
// midpoint — avoids the crossing-line / overlapping-label problem that a
// pair of separate arrows produced here.
function biflow(x1, y1, x2, y2, lineA, lineB) {
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a2744" stroke-width="1.5" marker-end="url(#arrowhead)" marker-start="url(#arrowhead)"/>`;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const w = Math.max(lineA.length, lineB.length) * 6.2 + 10;
  s += `<rect x="${mx - w / 2}" y="${my - 20}" width="${w}" height="32" fill="#ffffff"/>`;
  s += `<text x="${mx}" y="${my - 5}" text-anchor="middle" font-family="Arial" font-size="11" fill="#1a2744">${lineA}</text>`;
  s += `<text x="${mx}" y="${my + 11}" text-anchor="middle" font-family="Arial" font-size="11" fill="#1a2744">${lineB}</text>`;
  return s;
}

body += biflow(260, 125, 830, 460, "↑ Document upload / chat & voice query / consultation request", "↓ Risk report / chat reply / live call audio-video");
body += biflow(1370, 125, 1170, 460, "↑ Phone number + OTP request", "↓ OTP code (SMS)");
body += biflow(1340, 655, 1170, 465, "↑ Prompt + context / audio input", "↓ Completion / embedding / audio stream");
body += biflow(300, 655, 810, 475, "↑ Consultation request", "↓ Accept / decline, transcript");

const html = svgDoc(W, H, body, "Figure 2.3 — DFD: Context Diagram (Level 0)");
render(html, __dirname + "/dfd-context.png");
