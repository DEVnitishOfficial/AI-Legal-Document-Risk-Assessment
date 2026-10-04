const { box, arrow, elbow, actor, svgDoc, NAVY } = require("./diagram-kit");
const render = require("./render");

const W = 1560, H = 960;
let body = "";

const boundary = { x: 240, y: 40, w: 1040, h: 760 };
body += `<rect x="${boundary.x}" y="${boundary.y}" width="${boundary.w}" height="${boundary.h}" rx="8" fill="#ffffff" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="6,4"/>`;
body += `<text x="${boundary.x + boundary.w / 2}" y="${boundary.y + 26}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="${NAVY}">NyayMitra AI System</text>`;

const ucW = 270, ucH = 70;
const uc = {
  uc1: { x: 290, y: 90, w: ucW, h: ucH, title: "Register & Login" },
  uc2: { x: 650, y: 90, w: ucW, h: ucH, title: "Upload / Paste Document" },
  uc3: { x: 290, y: 310, w: ucW, h: ucH, title: "View AI Risk Report" },
  uc4: { x: 650, y: 310, w: ucW, h: ucH, title: "Ask Legal Question (Chat, RAG)" },
  uc5: { x: 290, y: 530, w: ucW, h: ucH, title: "Voice Consultation — AI Advocate" },
  uc6: { x: 650, y: 530, w: ucW, h: ucH, title: "Request Human Advocate" },
  uc7: { x: 650, y: 650 + 70, w: ucW, h: ucH, title: "Accept / Decline Consultation" },
  uc8: { x: 290, y: 650 + 70, w: ucW, h: ucH, title: "Manage Advocate Accounts" },
  uc9: { x: 980, y: 90, w: ucW, h: ucH, title: "Verify Phone (OTP)" },
};
Object.values(uc).forEach((u) => { body += box({ ...u, shape: "ellipse" }); });

const user = { x: 100, y: 380 };
const advocate = { x: 1460, y: 380 };
const admin = { x: uc.uc8.x + uc.uc8.w / 2, y: 880 };
body += actor(user.x, user.y, "User");
body += actor(advocate.x, advocate.y, "Human Advocate");
body += actor(admin.x, admin.y, "Admin");

const leftMid = (b) => ({ x: b.x, y: b.y + b.h / 2 });
const rightMid = (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 });
const bottomMid = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h });
const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="1.2"/>`;

// User associations
[uc.uc1, uc.uc2, uc.uc3, uc.uc4, uc.uc5, uc.uc6].forEach((u) => {
  body += line(user.x, user.y, leftMid(u).x, leftMid(u).y);
});

// Human Advocate association
body += line(advocate.x, advocate.y, rightMid(uc.uc7).x, rightMid(uc.uc7).y);

// Admin association (anchored directly below its own use case to avoid
// crossing through the "Accept / Decline Consultation" ellipse that a
// side-anchored line from the right would otherwise cut through)
body += line(admin.x, admin.y - 40, bottomMid(uc.uc8).x, bottomMid(uc.uc8).y);

// <<include>> relation: Register & Login includes Verify Phone (OTP).
// Routed below row 1 (not straight across) so it doesn't cut through the
// "Upload / Paste Document" ellipse sitting between the two endpoints.
const uc1cx = uc.uc1.x + uc.uc1.w / 2, uc9cx = uc.uc9.x + uc.uc9.w / 2;
const routeY = uc.uc1.y + uc.uc1.h + 45;
body += elbow(
  [
    { x: uc1cx, y: uc.uc1.y + uc.uc1.h },
    { x: uc1cx, y: routeY },
    { x: uc9cx, y: routeY },
    { x: uc9cx, y: uc.uc9.y + uc.uc9.h },
  ],
  { dashed: true, label: "«include»", labelSeg: 1 }
);

const html = svgDoc(W, H, body, "Figure 2.6 — Use Case Diagram");
render(html, __dirname + "/usecase-diagram.png");
