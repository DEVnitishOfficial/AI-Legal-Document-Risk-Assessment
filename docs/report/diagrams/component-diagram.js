const { box, arrow, svgDoc, NAVY, GOLD } = require("./diagram-kit");
const render = require("./render");

const W = 1500, H = 980;
let body = "";

const cx = 750;
const layer = (y, h, label) => {
  let s = `<rect x="40" y="${y}" width="${W - 80}" height="${h}" rx="8" fill="#f7f4ee" stroke="#d8d2c4" stroke-width="1"/>`;
  s += `<text x="60" y="${y + 24}" font-family="Arial" font-size="12" font-weight="700" fill="${GOLD}">${label}</text>`;
  return s;
};
const comp = (x, y, w, h, title, fields) => box({ x, y, w, h, title, fields, rx: 6 });
const rel = (x1, y1, x2, y2, label) => arrow({ x1, y1, x2, y2, label, labelT: 0.5 });

body += layer(40, 90, "CLIENT");
const client = { x: cx - 170, y: 65, w: 340, h: 55 };
body += comp(client.x, client.y, client.w, client.h, "HTTP / SSE Request", []);

body += layer(150, 110, "ROUTING + MIDDLEWARE CHAIN  (every module's routes.ts)");
const router = { x: 120, y: 180, w: 260, h: 60 };
const auth = { x: 420, y: 180, w: 260, h: 60 };
const validate = { x: 720, y: 180, w: 260, h: 60 };
const rate = { x: 1020, y: 180, w: 260, h: 60 };
[router, auth, validate, rate].forEach((b, i) => {
  body += comp(b.x, b.y, b.w, b.h, ["Router", "authMiddleware", "validate(Zod schema)", "rateLimiter"][i], []);
});
body += rel(router.x + router.w, router.y + 30, auth.x, auth.y + 30, "");
body += rel(auth.x + auth.w, auth.y + 30, validate.x, validate.y + 30, "");
body += rel(validate.x + validate.w, validate.y + 30, rate.x, rate.y + 30, "");

body += layer(300, 90, "CONTROLLER  (*.controller.ts)");
const controller = { x: cx - 170, y: 325, w: 340, h: 55 };
body += comp(controller.x, controller.y, controller.w, controller.h, "*.controller.ts", ["req/res only — never touches the database directly (Section 4.4)"]);

body += layer(430, 110, "SERVICE  (*.service.ts) — business logic, plain typed parameters");
const service = { x: cx - 170, y: 460, w: 340, h: 60 };
body += comp(service.x, service.y, service.w, service.h, "*.service.ts", []);

body += layer(580, 150, "DATA ACCESS + EXTERNAL INTEGRATIONS");
const repo = { x: 120, y: 615, w: 300, h: 90 };
const external = { x: 1060, y: 615, w: 300, h: 90 };
body += comp(repo.x, repo.y, repo.w, repo.h, "*.repository.ts", ["Only layer that imports", "the Prisma client"]);
body += comp(external.x, external.y, external.w, external.h, "External client", ["OpenAI / MSG91 / Redis", "— never called from a controller"]);

body += layer(770, 100, "PERSISTENCE");
const db = { x: cx - 160, y: 800, w: 320, h: 55 };
body += comp(db.x, db.y, db.w, db.h, "PostgreSQL (via Prisma)", []);

// Vertical flow
body += rel(cx, client.y + client.h, cx, 180, "");
body += rel(rate.x + rate.w / 2, rate.y + rate.h, controller.x + controller.w - 40, controller.y, "");
body += rel(controller.x + 40, controller.y + controller.h, service.x + 40, service.y, "calls with plain params (Section 4.4)");
body += rel(service.x + 60, service.y + service.h, repo.x + repo.w - 30, repo.y, "data");
body += rel(service.x + service.w - 60, service.y + service.h, external.x + 30, external.y, "integration calls");
body += rel(repo.x + repo.w / 2, repo.y + repo.h, db.x + 40, db.y, "");

body += `<text x="40" y="${H - 20}" font-family="Arial" font-size="11" fill="#555">The same five-layer pattern repeats identically across all seven feature modules (Figure 3.2) — shown here once, generically, rather than seven times.</text>`;

const html = svgDoc(W, H, body, "Figure 3.9 — Component Diagram: Module Layering Pattern");
render(html, __dirname + "/component-diagram.png");
