const { box, arrow, cardinality, svgDoc, GOLD, NAVY } = require("./diagram-kit");
const render = require("./render");

const W = 1800, H = 620;
let body = "";

const node = (x, y, label) => box({ x: x - 28, y: y - 28, w: 56, h: 56, title: label, shape: "ellipse" });
const et = (x, y, text) => cardinality(x, y + 50, text);

const n = {
  1: { x: 110, y: 260 }, 2: { x: 330, y: 260 },
  3: { x: 620, y: 120 }, 4: { x: 620, y: 400 },
  5: { x: 900, y: 260 }, 6: { x: 1100, y: 260 },
  7: { x: 1290, y: 260 }, 8: { x: 1480, y: 260 }, 9: { x: 1670, y: 260 },
};

Object.entries(n).forEach(([k, p]) => { body += node(p.x, p.y, k); });

const crit = (p1, p2, label, labelT) => arrow({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, label, color: GOLD, labelT: labelT ?? 0.5 });
const slack = (p1, p2, label, labelT) => arrow({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, label, dashed: true, labelT: labelT ?? 0.5 });

// edge endpoints adjusted to the circle radius (28) along each line's angle
function edge(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  return { x1: a.x + ux * 28, y1: a.y + uy * 28, x2: b.x - ux * 28, y2: b.y - uy * 28 };
}

const e12 = edge(n[1], n[2]);
body += arrow({ ...e12, label: "A (3 wk)", color: GOLD, labelT: 0.5 });

const e23 = edge(n[2], n[3]);
body += arrow({ ...e23, label: "B (1 wk)", dashed: true, labelT: 0.55 });

const e24 = edge(n[2], n[4]);
body += arrow({ ...e24, label: "C (4 wk)", color: GOLD, labelT: 0.55 });

const e35 = edge(n[3], n[5]);
body += arrow({ ...e35, label: "dummy (0 wk)", dashed: true, labelT: 0.45 });

const e45 = edge(n[4], n[5]);
body += arrow({ ...e45, label: "dummy (0 wk)", color: GOLD, labelT: 0.45 });

const e56 = edge(n[5], n[6]);
body += arrow({ ...e56, label: "D (2 wk)", color: GOLD });

const e67 = edge(n[6], n[7]);
body += arrow({ ...e67, label: "E (1 wk)", color: GOLD });

const e78 = edge(n[7], n[8]);
body += arrow({ ...e78, label: "F (1 wk)", color: GOLD });

const e89 = edge(n[8], n[9]);
body += arrow({ ...e89, label: "G (1 wk)", color: GOLD });

const ets = { 1: 0, 2: 3, 3: 4, 4: 7, 5: 7, 6: 9, 7: 10, 8: 11, 9: 12 };
Object.entries(n).forEach(([k, p]) => { body += et(p.x, p.y, `Wk ${ets[k]}`); });

body += `<text x="${W / 2}" y="${H - 140}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="${GOLD}">Critical path: 1 → 2 → 4 → 5 → 6 → 7 → 8 → 9  (12 weeks of active effort)</text>`;
body += `<text x="${W / 2}" y="${H - 118}" text-anchor="middle" font-family="Arial" font-size="11" fill="#555">Gold = critical path · Dashed = non-critical path with slack · Dummy edges (0 wk) only synchronise the two parallel branches before activity D begins.</text>`;

const legendRow1 = "A = Backend Setup & Auth   B = Document Upload & AI Integration   C = Frontend Foundation & OAuth   D = Prisma Migration & Analysis Enhancement";
const legendRow2 = "E = Legal Assistant Chat Agent + RAG   F = Rebrand & Connect Advocate   G = Documentation & Production Hardening";
body += `<text x="${W / 2}" y="${H - 86}" text-anchor="middle" font-family="Arial" font-size="11" fill="#1a2744">${legendRow1}</text>`;
body += `<text x="${W / 2}" y="${H - 66}" text-anchor="middle" font-family="Arial" font-size="11" fill="#1a2744">${legendRow2}</text>`;

const html = svgDoc(W, H, body, "Figure 2.1 — PERT Chart (Network Diagram)");
render(html, __dirname + "/pert-chart.png");
