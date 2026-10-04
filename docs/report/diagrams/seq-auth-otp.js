const { lifeline, seqMsg, seqSelf, svgDoc } = require("./diagram-kit");
const render = require("./render");

const W = 1500, H = 940;
const topY = 40, bottomY = 880;
let body = "";

const cols = { user: 110, client: 420, api: 760, msg91: 1100, db: 1360 };
const labels = { user: "User", client: "Client (React SPA)", api: "API (Express)", msg91: "MSG91", db: "Database (Postgres)" };
Object.entries(cols).forEach(([k, x]) => { body += lifeline(x, labels[k], topY, bottomY, k === "client" ? 190 : 160); });

let y = 140;
const step = 52;
const msg = (from, to, label, opts) => { body += seqMsg(cols[from], cols[to], y, label, opts); y += step; };

msg("user", "client", "Enter phone number, tap “Send code”");
msg("client", "api", "POST /auth/otp/send { phone }");
body += seqSelf(cols.api, y, "generate code: crypto.randomInt, bcrypt hash", 90); y += step + 10;
msg("api", "db", "INSERT OtpVerification (codeHash, expiresAt)");
msg("api", "msg91", "send SMS(phone, code)");
msg("msg91", "api", "202 Accepted (queued)", { dashed: true });
msg("api", "client", "200 OK { sent: true }", { dashed: true });
msg("user", "client", "Enter 6-digit code");
msg("client", "api", "POST /auth/otp/verify { phone, code }");
msg("api", "db", "fetch latest unconsumed OtpVerification");
body += seqSelf(cols.api, y, "bcrypt.compare; check expiry + attempts (Section 3.6, Procedure 3)", 90); y += step + 10;
msg("api", "db", "mark consumed; find-or-create User");
msg("api", "client", "200 OK { token }", { dashed: true });

const html = svgDoc(W, H, body, "Figure 2.10 — Sequence Diagram: Authentication (Phone OTP Login)");
render(html, __dirname + "/seq-auth-otp.png");
