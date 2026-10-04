const { box, arrow, svgDoc, NAVY, GOLD } = require("./diagram-kit");
const render = require("./render");

const W = 1700, H = 900;
let body = "";

const state = (x, y, label, w = 200) => box({ x, y, w, h: 60, title: label, rx: 30 });
const start = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="${NAVY}"/>`;
const rel = (x1, y1, x2, y2, label, labelT) => arrow({ x1, y1, x2, y2, label, labelT: labelT ?? 0.5 });

// ── (a) Document Analysis status — Document.status ───────────────────────
body += `<text x="40" y="115" font-family="Arial" font-size="14" font-weight="700" fill="${GOLD}">(a) Document Analysis Status</text>`;

const pending = { x: 40, y: 140, w: 200 };
const processing = { x: 340, y: 140, w: 200 };
const completed = { x: 640, y: 60, w: 200 };
const failed = { x: 640, y: 220, w: 200 };

body += start(20, 170);
body += state(pending.x, pending.y, "PENDING");
body += state(processing.x, processing.y, "PROCESSING");
body += state(completed.x, completed.y, "COMPLETED");
body += state(failed.x, failed.y, "FAILED");

body += rel(29, 170, pending.x, pending.y + 30);
body += rel(pending.x + 200, pending.y + 30, processing.x, processing.y + 30, "enqueueAnalysis()", 0.5);
body += rel(processing.x + 200, processing.y + 20, completed.x, completed.y + 30, "AI call succeeds", 0.5);
body += rel(processing.x + 200, processing.y + 45, failed.x, failed.y + 30, "all retries exhausted", 0.5);
// failed -> processing (explicit retry only)
body += `<path d="M ${failed.x + 100} ${failed.y + 60} C ${failed.x + 100} ${failed.y + 90}, ${processing.x + 100} ${failed.y + 90}, ${processing.x + 100} ${processing.y + 60}" fill="none" stroke="${NAVY}" stroke-width="1.5" marker-end="url(#arrowhead)"/>`;
body += `<rect x="${(failed.x + processing.x) / 2 - 10}" y="${failed.y + 82}" width="200" height="16" fill="#ffffff"/>`;
body += `<text x="${(failed.x + processing.x) / 2 + 90}" y="${failed.y + 94}" text-anchor="middle" font-family="Arial" font-size="11" fill="${NAVY}">explicit user retry only (not auto-retried on poll)</text>`;

body += `<text x="20" y="370" font-family="Arial" font-size="11" fill="#555">Source: document.repository.ts / analysis.controller.ts — see Section 5.5, TC-10 / TC-11 for the system tests driving these transitions.</text>`;

// ── (b) Human Advocate Consultation Request — Consultation.status ────────
body += `<text x="40" y="455" font-family="Arial" font-size="14" font-weight="700" fill="${GOLD}">(b) Human Advocate Consultation Request</text>`;

const accepted = { x: 40, y: 480, w: 220 };
const requested = { x: 40, y: 640, w: 220 };
const declined = { x: 420, y: 560, w: 220 };
const expired = { x: 420, y: 640, w: 220 };
const cancelled = { x: 420, y: 720, w: 220 };

body += start(20, 670);
body += state(requested.x, requested.y, "REQUESTED");
body += state(accepted.x, accepted.y, "ACCEPTED");
body += state(declined.x, declined.y, "DECLINED", 220);
body += state(expired.x, expired.y, "EXPIRED", 220);
body += state(cancelled.x, cancelled.y, "CANCELLED", 220);

body += rel(29, 670, requested.x, requested.y + 30);
// Straight up to ACCEPTED, clear of the fan-out below (no crossing)
body += rel(requested.x + 40, requested.y, accepted.x + 40, accepted.y + 60, "advocate accepts", 0.5);
// Fan out from three distinct points on REQUESTED's right edge to DECLINED/EXPIRED/CANCELLED,
// stacked to the right in the same top-to-bottom order as their exit points.
body += rel(requested.x + 220, requested.y + 10, declined.x, declined.y + 30, "advocate declines", 0.55);
body += rel(requested.x + 220, requested.y + 30, expired.x, expired.y + 30, "HUMAN_REQUEST_TTL elapses", 0.55);
body += rel(requested.x + 220, requested.y + 50, cancelled.x, cancelled.y + 30, "client cancels", 0.55);

body += `<text x="20" y="840" font-family="Arial" font-size="11" fill="#555">Source: ConsultationStatus enum, schema.prisma (Appendix A). The AI-advocate path (same entity) instead runs LOBBY → LIVE → ENDED / FAILED, shown implicitly in Figure 2.9.</text>`;

const html = svgDoc(W, H, body, "Figure 2.11 — State Transition Diagrams");
render(html, __dirname + "/state-diagram.png");
