const { box, arrow, elbow, svgDoc, NAVY, GOLD, CREAM } = require("./diagram-kit");
const render = require("./render");

const W = 1900, H = 800;
let body = "";

const band = (y, h, label) => {
  let s = `<rect x="20" y="${y}" width="${W - 40}" height="${h}" rx="8" fill="#f7f4ee" stroke="#d8d2c4" stroke-width="1"/>`;
  s += `<text x="40" y="${y + 24}" font-family="Arial" font-size="13" font-weight="700" fill="${GOLD}">${label}</text>`;
  return s;
}

body += band(50, 130, "PRESENTATION LAYER");
body += band(200, 170, "APPLICATION LAYER");
body += band(400, 110, "DATA & QUEUE LAYER");
body += band(585, 150, "EXTERNAL SERVICES");

const client = { x: 800, y: 75, w: 300, h: 85 };
body += box({ ...client, title: "Client (React 18 + Vite SPA)", fields: ["Browser: fetch/SSE, WebRTC getUserMedia"] });

const api = { x: 100, y: 225, w: 270, h: 125 };
const worker = { x: 430, y: 225, w: 270, h: 125 };
const rag = { x: 760, y: 225, w: 270, h: 125 };
const realtime = { x: 1090, y: 225, w: 270, h: 125 };
body += box({ ...api, title: "API (Express)", fields: ["Auth, validation (Zod)", "REST + SSE, rate limiting"] });
body += box({ ...worker, title: "Analysis Worker (BullMQ)", fields: ["OCR fallback", "AI summary / risk scoring"] });
body += box({ ...rag, title: "RAG Retrieval Service", fields: ["Embedding search", "citation verification"] });
body += box({ ...realtime, title: "Realtime Voice Relay", fields: ["Signalling for AI & human", "advocate audio/video"] });

const pg = { x: 200, y: 415, w: 320, h: 80 };
const redis = { x: 660, y: 415, w: 320, h: 80 };
body += box({ ...pg, title: "PostgreSQL + pgvector", fields: ["Relational data + embeddings"] });
body += box({ ...redis, title: "Redis", fields: ["BullMQ job queue, rate-limit store"] });

// External services are positioned to minimise crossings: MSG91 sits
// directly under API (the only caller), OpenAI is centred under the three
// boxes that all call it (Worker, RAG, Realtime).
const msg91 = { x: 170, y: 605, w: 260, h: 80 };
const openai = { x: 600, y: 605, w: 420, h: 80 };
body += box({ ...msg91, title: "MSG91", fields: ["SMS OTP delivery"] });
body += box({ ...openai, title: "OpenAI", fields: ["Chat/completion, embeddings, Realtime voice"] });

const rel = (x1, y1, x2, y2, label, labelT) => arrow({ x1, y1, x2, y2, label, labelT: labelT ?? 0.5 });

// Client <-> application layer
body += rel(client.x + 40, client.y + client.h, api.x + api.w / 2, api.y, "REST / JSON", 0.4);
body += rel(rag.x + rag.w / 2, rag.y, client.x + client.w / 2, client.y + client.h, "SSE token stream", 0.6);
body += rel(client.x + client.w - 40, client.y + client.h, realtime.x + realtime.w / 2, realtime.y, "WebRTC signalling", 0.4);

// API -> data layer
body += rel(api.x + 60, api.y + api.h, pg.x + 80, pg.y, "Prisma ORM", 0.5);
body += rel(api.x + api.w - 30, api.y + api.h, redis.x + 60, redis.y, "enqueueAnalysis()", 0.5);
body += rel(redis.x + 60, redis.y, worker.x + worker.w / 2, worker.y + worker.h, "deliver job", 0.5);

// API -> MSG91: a near-vertical line hugging the left margin, well clear of
// the PostgreSQL box, instead of a diagonal that would cut through it.
body += elbow(
  [{ x: api.x + 20, y: api.y + api.h }, { x: api.x + 20, y: 550 }, { x: msg91.x + 40, y: 550 }, { x: msg91.x + 40, y: msg91.y }],
  { label: "OTP request", labelSeg: 0, labelT: 0.5 }
);

// Worker -> Postgres and RAG -> Postgres: routed through the empty channel
// below the data layer so they don't cut across Redis or each other's labels
// (a straight diagonal here used to land directly on the Redis box).
body += elbow(
  [{ x: worker.x + 60, y: worker.y + worker.h }, { x: worker.x + 60, y: 535 }, { x: pg.x + 100, y: 535 }, { x: pg.x + 100, y: pg.y + pg.h }],
  { label: "save Analysis", labelSeg: 1, labelT: 0.5 }
);
body += elbow(
  [{ x: rag.x + 50, y: rag.y + rag.h }, { x: rag.x + 50, y: 565 }, { x: pg.x + 240, y: 565 }, { x: pg.x + 240, y: pg.y + pg.h }],
  { label: "vector search", labelSeg: 1, labelT: 0.5 }
);

// Application layer -> external services (left-to-right source order matches
// left-to-right entry order on the OpenAI box, so the three lines fan in
// without crossing each other).
body += rel(worker.x + 90, worker.y + worker.h, openai.x + 60, openai.y, "completion", 0.5);
body += rel(rag.x + rag.w / 2, rag.y + rag.h, openai.x + openai.w / 2, openai.y, "embeddings", 0.5);
body += rel(realtime.x + 60, realtime.y + realtime.h, openai.x + openai.w - 60, openai.y, "Realtime API (WebRTC)", 0.5);

const html = svgDoc(W, H, body, "Figure 3.1 — System Architecture");
render(html, __dirname + "/architecture-diagram.png");
