// Splits the text of an Indian central Act (extracted from the official
// gazette PDF) into its numbered sections.
//
// What the extracted text looks like (verified against BNS, BNSS and BSA):
//  * sections start a line as "103. (1) Whoever…" or "104.Whoever…";
//  * every page carries a gazette header ("THE GAZETTE OF INDIA EXTRAORDINARY
//    [Part II—Sec. 1]"), a rule of underscores and a lone page number;
//  * the marginal headings ("Punishment for murder") are NOT reliably present,
//    so no heading is ever guessed here.
//
// A line is only accepted as the start of a section when its number is the
// next one in sequence. That is what keeps numbered lists and illustrations
// inside a section from being mistaken for new sections.

export interface ParsedSection {
  /** "103", or "43A" for lettered sections in older Acts. */
  number: string;
  /** Section text with page furniture removed. */
  text: string;
}

export interface ParseReport {
  sections: ParsedSection[];
  /** Sequence numbers we expected but never saw. */
  missing: number[];
}

const PAGE_NOISE: RegExp[] = [
  /^_{4,}\s*$/, // page rule
  /^\s*\d{1,3}\s*$/, // lone page number
  /GAZETTE OF INDIA/i, // running header
  /^\s*\d*\s*SEC\.\s*\d+\s*\]?\s*$/i, // "SEC. 1]"
  /^\s*\d*\s*THE BHARATIYA [A-Z ]+,?\s*2023\s*\d*\s*$/i, // running title (any of the 2023 codes)
  /^\s*\d*\s*THE [A-Z ,]+ACT,?\s*\d{4}\s*\d*\s*$/i, // running title of other Acts
];

const isNoise = (line: string) => PAGE_NOISE.some((re) => re.test(line));

// "103. (1) …", "104.Whoever …", "43A. Compensation …", or a bare "111." with
// the text on the following line (the BNS PDF does this for a few sections).
// In amended Acts a substituted section is wrapped in a footnote marker, so it
// may begin "[61." or "50[52." — the bracket is required for the numeric
// prefix so that "52." can never be misread as "5" + "2".
const SECTION_START = /^(?:\d{1,3}\s?\[|\[)?\s*(\d{1,3})([A-Z]{0,2})\.\s?(?=[A-Z(“‘"'\[]|$)/;

export const cleanStatuteText = (raw: string): string[] =>
  raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
    .filter((l) => l.trim() !== "" && !isNoise(l));

// Older Acts carry amendment footnotes at the foot of each page ("1. Subs. by
// Act 26 of 1955, s. 117…"). Their numbers can coincide with the next section
// number, so they must never be taken for a section start.
const FOOTNOTE =
  /^\d{1,3}\.\s*(?:Subs\b|Ins\b|Omitted|Rep\b|Cf\.|See\b|Now\b|Came\b|The words|Added|Substituted|Inserted|Repealed|Renumbered|Vide\b|Clause\b.*\bsubs)/i;

// One sequential pass starting at `startIdx` (a line that begins section 1).
const parseFrom = (lines: string[], startIdx: number) => {
  const sections: ParsedSection[] = [];
  let current: { number: string; lines: string[] } | null = null;
  let lastInt = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    // Amendment footnotes are not law text: drop them from section bodies too.
    // (Wrapped continuation lines of a footnote can still remain.)
    if (FOOTNOTE.test(line)) continue;
    const m = SECTION_START.exec(line);
    const int = m ? Number(m[1]) : NaN;
    const suffix = m ? m[2] : "";

    // Next in sequence: the following integer, or a lettered section of the
    // one we're already in (43 → 43A).
    const startsNextSection = m && !suffix && int === lastInt + 1;
    const startsLettered = m && suffix && int === lastInt;

    if (startsNextSection || startsLettered) {
      if (current) sections.push({ number: current.number, text: current.lines.join("\n").trim() });
      current = { number: `${int}${suffix}`, lines: [line] };
      if (startsNextSection) lastInt = int;
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before section 1 (title, preamble, chapter headings) are dropped.
  }
  if (current) sections.push({ number: current.number, text: current.lines.join("\n").trim() });
  return { sections, lastInt };
};

const baseCount = (sections: ParsedSection[]) => new Set(sections.map((s) => Number.parseInt(s.number, 10))).size;

const SUBSTANTIVE_CHARS = 100;
const substantiveCount = (sections: ParsedSection[]) => sections.filter((s) => s.text.length >= SUBSTANTIVE_CHARS).length;

// Sanity measure of a parse: a pass that only captured a contents list has the
// right section numbers but almost no text under them.
export const parseQuality = (sections: ParsedSection[]) => {
  const tooShort = sections.filter((s) => s.text.length < 60).length;
  return { tooShort, shortShare: sections.length ? tooShort / sections.length : 1 };
};

export const parseStatuteSections = (raw: string, expectedCount?: number): ParseReport => {
  const lines = cleanStatuteText(raw);

  // A contents list ("1. Short title … 99. Preparation of proposal") looks
  // exactly like sections, and a naive pass would follow it instead of the
  // real text. So try a pass from every line that could be section 1 and keep
  // the one with the most *substantive* sections (real text, not bare
  // headings), then the most section numbers. Total text length is not used:
  // a contents-list pass runs on into the body and would win on length.
  const starts = lines.flatMap((l, i) => {
    const m = FOOTNOTE.test(l.trim()) ? null : SECTION_START.exec(l.trim());
    return m && !m[2] && Number(m[1]) === 1 ? [i] : [];
  });

  let best: { sections: ParsedSection[]; lastInt: number } = { sections: [], lastInt: 0 };
  for (const start of starts) {
    const attempt = parseFrom(lines, start);
    const [a, b] = [substantiveCount(attempt.sections), substantiveCount(best.sections)];
    if (a > b || (a === b && baseCount(attempt.sections) > baseCount(best.sections))) best = attempt;
  }

  const seen = new Set(best.sections.map((s) => Number.parseInt(s.number, 10)));
  const missing: number[] = [];
  const upTo = expectedCount ?? best.lastInt;
  for (let n = 1; n <= upTo; n++) if (!seen.has(n)) missing.push(n);

  return { sections: best.sections, missing };
};

// ── Chunking ────────────────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 2400;

// One chunk per section; a long section is split at its numbered sub-sections
// "(1)", "(2)"… so a chunk never cuts a sub-section in half.
export const chunkSection = (text: string): string[] => {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const parts = text.split(/\n(?=\(\d+[A-Z]?\)\s)/);
  const chunks: string[] = [];
  let buf = "";

  for (const part of parts) {
    if (buf && buf.length + part.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(buf);
      buf = "";
    }
    // A single sub-section longer than the limit is split on sentence breaks.
    if (part.length > MAX_CHUNK_CHARS) {
      for (const piece of part.match(/[^.;]+[.;]?\s*/g) ?? [part]) {
        if (buf && buf.length + piece.length > MAX_CHUNK_CHARS) {
          chunks.push(buf);
          buf = "";
        }
        buf += piece;
      }
    } else {
      buf += (buf ? "\n" : "") + part;
    }
  }
  if (buf.trim()) chunks.push(buf);

  return chunks.map((c) => c.trim()).filter(Boolean);
};
