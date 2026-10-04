const { lifeline, seqMsg, seqSelf, svgDoc } = require("./diagram-kit");
const render = require("./render");

const W = 1700, H = 940;
const topY = 40, bottomY = 880;
let body = "";

const cols = {
  user: 110, client: 380, api: 650, relay: 920, ai: 1190, db: 1460,
};
const labels = {
  user: "User", client: "Client (React SPA)", api: "API (Express)",
  relay: "Realtime Voice Relay", ai: "AI Provider (OpenAI Realtime)", db: "Database (Postgres)",
};
Object.entries(cols).forEach(([k, x]) => { body += lifeline(x, labels[k], topY, bottomY, k === "relay" || k === "ai" ? 190 : 160); });

let y = 140;
const step = 52;
const msg = (from, to, label, opts) => { body += seqMsg(cols[from], cols[to], y, label, opts); y += step; };

msg("user", "client", "Choose AI Advocate, “Start consultation”");
msg("client", "api", "POST /consultations");
msg("api", "db", "INSERT Consultation (status = LOBBY)");
msg("api", "client", "201 Created { consultationId }", { dashed: true });
msg("client", "relay", "WebRTC offer (audio)");
msg("relay", "ai", "open Realtime session");
msg("ai", "relay", "session ready", { dashed: true });
msg("relay", "client", "WebRTC answer — call is LIVE", { dashed: true });
body += seqSelf(cols.relay, y, "live speech turns ↔ AI (Realtime API)", 100); y += step + 10;
msg("relay", "db", "save ConsultationTurn (speech / search + citations)");
msg("client", "api", "POST /consultations/{id}/end");
msg("api", "db", "mark ENDED; generateSummary() (Section 7.3)");
msg("api", "client", "200 OK { status: ended, summary }", { dashed: true });

const html = svgDoc(W, H, body, "Figure 2.9 — Sequence Diagram: Connect Advocate (Live AI Consultation)");
render(html, __dirname + "/seq-connect-advocate.png");
