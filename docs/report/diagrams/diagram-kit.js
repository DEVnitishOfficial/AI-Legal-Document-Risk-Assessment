// Tiny declarative box/arrow SVG builder, shared by every diagram in the
// report (ER, DFD, use-case, sequence). Keeps every diagram visually
// consistent without hand-positioning raw <rect>/<line> tags each time.
const NAVY = "#1a2744";
const GOLD = "#b8860b";
const CREAM = "#faf6ee";
const TEXT_DARK = "#1a2744";
const FONT = "Arial, Helvetica, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Entity/process box with a title band and optional field list.
function box({ x, y, w, h, title, fields = [], fill = "#ffffff", titleFill = NAVY, titleColor = "#ffffff", rx = 6, shape = "rect" }) {
  const titleH = fields.length ? 30 : h;
  let shapeEl;
  if (shape === "ellipse") {
    shapeEl = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${NAVY}" stroke-width="1.5"/>`;
  } else if (shape === "diamond") {
    const cx = x + w / 2, cy = y + h / 2;
    shapeEl = `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" fill="${fill}" stroke="${NAVY}" stroke-width="1.5"/>`;
  } else {
    shapeEl = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${NAVY}" stroke-width="1.5"/>`;
  }

  let inner = shapeEl;
  if (fields.length) {
    inner += `<rect x="${x}" y="${y}" width="${w}" height="${titleH}" rx="${rx}" fill="${titleFill}"/>`;
    inner += `<rect x="${x}" y="${y + titleH - rx}" width="${w}" height="${rx}" fill="${titleFill}"/>`;
    inner += `<line x1="${x}" y1="${y + titleH}" x2="${x + w}" y2="${y + titleH}" stroke="${NAVY}" stroke-width="1.5"/>`;
  }

  const titleY = fields.length ? y + titleH / 2 : y + h / 2;
  inner += `<text x="${x + w / 2}" y="${titleY}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="14" font-weight="700" fill="${fields.length ? titleColor : TEXT_DARK}">${esc(title)}</text>`;

  fields.forEach((f, i) => {
    const fy = y + titleH + 18 + i * 18;
    inner += `<text x="${x + 10}" y="${fy}" font-family="${FONT}" font-size="11.5" fill="${TEXT_DARK}">${esc(f)}</text>`;
  });

  return `<g>${inner}</g>`;
}

// Straight connector with an optional label and arrowhead.
function arrow({ x1, y1, x2, y2, label, dashed = false, color = NAVY, labelBg = "#ffffff", labelT = 0.5 }) {
  const mx = x1 + (x2 - x1) * labelT;
  const my = y1 + (y2 - y1) * labelT;
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" ${dashed ? 'stroke-dasharray="5,4"' : ""} marker-end="url(#arrowhead)"/>`;
  if (label) {
    const w = label.length * 6.2 + 8;
    s += `<rect x="${mx - w / 2}" y="${my - 9}" width="${w}" height="16" fill="${labelBg}"/>`;
    s += `<text x="${mx}" y="${my - 1}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${TEXT_DARK}">${esc(label)}</text>`;
  }
  return s;
}

// Multi-segment connector (for routing around boxes that sit between two
// related entities). `points` is an ordered list of {x,y}; only the final
// segment gets an arrowhead. `labelSeg` picks which segment (0-indexed)
// carries the label, placed at that segment's own midpoint by default.
function elbow(points, { label, dashed = false, color = NAVY, labelBg = "#ffffff", labelSeg, labelT = 0.5 } = {}) {
  let s = "";
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const isLast = i === points.length - 2;
    s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="1.5" ${dashed ? 'stroke-dasharray="5,4"' : ""} ${isLast ? 'marker-end="url(#arrowhead)"' : ""}/>`;
  }
  if (label) {
    const segIdx = labelSeg === undefined ? Math.floor((points.length - 2) / 2) : labelSeg;
    const a = points[segIdx], b = points[segIdx + 1];
    const mx = a.x + (b.x - a.x) * labelT;
    const my = a.y + (b.y - a.y) * labelT;
    const w = label.length * 6.2 + 8;
    s += `<rect x="${mx - w / 2}" y="${my - 9}" width="${w}" height="16" fill="${labelBg}"/>`;
    s += `<text x="${mx}" y="${my - 1}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${TEXT_DARK}">${esc(label)}</text>`;
  }
  return s;
}

// UML actor: stick figure centred on (x,y) with a label below it.
function actor(x, y, label) {
  let s = `<circle cx="${x}" cy="${y - 36}" r="11" fill="#ffffff" stroke="${NAVY}" stroke-width="1.5"/>`;
  s += `<line x1="${x}" y1="${y - 25}" x2="${x}" y2="${y + 6}" stroke="${NAVY}" stroke-width="1.5"/>`;
  s += `<line x1="${x - 16}" y1="${y - 12}" x2="${x + 16}" y2="${y - 12}" stroke="${NAVY}" stroke-width="1.5"/>`;
  s += `<line x1="${x}" y1="${y + 6}" x2="${x - 14}" y2="${y + 28}" stroke="${NAVY}" stroke-width="1.5"/>`;
  s += `<line x1="${x}" y1="${y + 6}" x2="${x + 14}" y2="${y + 28}" stroke="${NAVY}" stroke-width="1.5"/>`;
  s += `<text x="${x}" y="${y + 48}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="700" fill="${TEXT_DARK}">${esc(label)}</text>`;
  return s;
}

function cardinality(x, y, text, anchor = "middle") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="11" font-style="italic" fill="${GOLD}">${esc(text)}</text>`;
}

function svgDoc(width, height, body, title) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#ffffff}</style></head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <polygon points="0 0, 10 4, 0 8" fill="${NAVY}"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
  ${title ? `<text x="${width / 2}" y="28" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="${NAVY}">${esc(title)}</text>` : ""}
  ${body}
</svg>
</body></html>`;
}

// ── Sequence-diagram helpers ────────────────────────────────────────────
// lifeline: a header box with a dashed vertical line running down from it.
function lifeline(x, label, topY, bottomY, w = 170) {
  let s = box({ x: x - w / 2, y: topY, w, h: 44, title: label });
  s += `<line x1="${x}" y1="${topY + 44}" x2="${x}" y2="${bottomY}" stroke="${NAVY}" stroke-width="1" stroke-dasharray="4,4"/>`;
  return s;
}

// seqMsg: a horizontal (or near-horizontal) message arrow between two
// lifeline x-positions at a given y, with its label sitting just above it.
function seqMsg(x1, x2, y, label, { dashed = false, color = NAVY } = {}) {
  let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="1.4" ${dashed ? 'stroke-dasharray="6,4"' : ""} marker-end="url(#arrowhead)"/>`;
  if (label) {
    s += `<text x="${(x1 + x2) / 2}" y="${y - 8}" text-anchor="middle" font-family="${FONT}" font-size="11.5" fill="${TEXT_DARK}">${esc(label)}</text>`;
  }
  return s;
}

// seqSelf: a small self-call loop on a single lifeline (e.g. "poll every 3s").
function seqSelf(x, y, label, w = 70) {
  let s = `<path d="M ${x} ${y} h ${w} v 22 h -${w}" fill="none" stroke="${NAVY}" stroke-width="1.4" marker-end="url(#arrowhead)"/>`;
  s += `<text x="${x + w + 6}" y="${y + 14}" font-family="${FONT}" font-size="11" fill="${TEXT_DARK}">${esc(label)}</text>`;
  return s;
}

module.exports = { box, arrow, elbow, actor, cardinality, lifeline, seqMsg, seqSelf, svgDoc, NAVY, GOLD, CREAM, FONT, esc };
