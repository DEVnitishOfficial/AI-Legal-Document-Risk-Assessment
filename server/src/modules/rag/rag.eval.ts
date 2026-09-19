// Run with: npm run rag:eval
// Measures grounded retrieval against the golden set and checks the citation
// parser/verifier. Exits non-zero on any failure so it can gate a release.

import { extractSectionRefs, retrieveGrounded, verifyCitations, DEFAULT_RAG } from "./rag.grounded";
import { ADJACENT_QUERIES, CITATION_CASES, NEGATIVE_QUERIES, POSITIVE_CASES } from "./rag.golden";
import { summariseStatutes } from "./rag.repository";

const TOP_K = 8;
let failures = 0;
const fail = (msg: string) => {
    failures++;
    console.log(`  FAIL  ${msg}`);
};

const main = async () => {
    console.log("\n== Loaded statutes ==");
    for (const s of await summariseStatutes()) {
        console.log(`  ${s.actShort.padEnd(5)} ${String(s.sections).padStart(4)} sections, ${String(s.chunks).padStart(4)} chunks  (${s.sourceDomain})`);
    }

    // minSimilarity 0 here: we want the raw scores so the threshold can be
    // judged from data, then check the configured threshold separately.
    console.log(`\n== Retrieval: expected provision in top ${TOP_K} ==`);
    const positiveScores: number[] = [];
    let hits = 0;
    let top1 = 0;

    for (const c of POSITIVE_CASES) {
        const passages = await retrieveGrounded(c.query, { k: TOP_K, minSimilarity: 0, era: c.era });
        const keys = passages.map((p) => `${p.actShort}|${p.section}`);
        const rank = keys.findIndex((k) => c.expect.includes(k));
        const found = rank >= 0;
        if (found) {
            hits++;
            positiveScores.push(passages[rank].similarity);
            if (rank === 0) top1++;
        }
        console.log(
            `  ${found ? "ok  " : "MISS"} ${found ? `#${rank + 1}` : "  "} sim=${found ? passages[rank].similarity.toFixed(3) : "  -  "}  ${c.query}  -> want ${c.expect.join("/")}, got ${keys.slice(0, 3).join(", ")}`
        );
        if (!found) failures++;
    }
    console.log(`  hit@${TOP_K}: ${hits}/${POSITIVE_CASES.length}   hit@1: ${top1}/${POSITIVE_CASES.length}`);

    // A repealed code must never come back as current law (and the new codes must
    // not come back for a pre-July-2024 offence), whatever the similarity.
    console.log("\n== Era isolation ==");
    const OLD_CODES = ["IPC", "CrPC", "IEA"];
    const NEW_CODES = ["BNS", "BNSS", "BSA"];
    for (const q of ["police arrest without warrant", "anticipatory bail", "electronic evidence certificate", "punishment for cheating", "maintenance for wife"]) {
        const current = (await retrieveGrounded(q, { k: 20, minSimilarity: 0 })).map((p) => p.actShort ?? "");
        const legacy = (await retrieveGrounded(q, { k: 20, minSimilarity: 0, era: "before_2024_07_01" })).map((p) => p.actShort ?? "");
        const oldInCurrent = current.filter((a) => OLD_CODES.includes(a)).length;
        const newInLegacy = legacy.filter((a) => NEW_CODES.includes(a)).length;
        const ok = oldInCurrent === 0 && newInLegacy === 0;
        console.log(
            `  ${ok ? "ok  " : "LEAK"} ${q}  (current era: ${current.filter((a) => NEW_CODES.includes(a)).length} new-code hits, ${oldInCurrent} repealed; legacy era: ${legacy.filter((a) => OLD_CODES.includes(a)).length} old-code hits, ${newInLegacy} new-code)`
        );
        if (!ok) failures++;
    }

    console.log("\n== Out-of-scope questions (should fall below the threshold) ==");
    const negativeTop: number[] = [];
    for (const q of NEGATIVE_QUERIES) {
        const raw = await retrieveGrounded(q, { k: 1, minSimilarity: 0 });
        const top = raw[0]?.similarity ?? 0;
        negativeTop.push(top);
        const kept = await retrieveGrounded(q, { k: 1, minSimilarity: DEFAULT_RAG.minSimilarity });
        console.log(`  ${kept.length === 0 ? "ok  " : "LEAK"} top sim=${top.toFixed(3)}  ${q}`);
        if (kept.length > 0) fail(`"${q}" returned passages at the configured threshold ${DEFAULT_RAG.minSimilarity}`);
    }

    console.log("\n== Adjacent-domain questions (reported, not failed) ==");
    let adjacentLeaks = 0;
    for (const q of ADJACENT_QUERIES) {
        const raw = await retrieveGrounded(q, { k: 1, minSimilarity: 0 });
        const top = raw[0]?.similarity ?? 0;
        const leaks = top >= DEFAULT_RAG.minSimilarity;
        if (leaks) adjacentLeaks++;
        console.log(`  ${leaks ? "pass-through" : "excluded    "} top sim=${top.toFixed(3)} (${raw[0]?.citation ?? "-"})  ${q}`);
    }
    console.log(`  ${adjacentLeaks}/${ADJACENT_QUERIES.length} reach the model — it must judge relevance itself`);

    const worstPositive = Math.min(...positiveScores);
    const bestNegative = Math.max(...negativeTop);
    console.log("\n== Threshold calibration ==");
    console.log(`  lowest similarity of a correct hit : ${worstPositive.toFixed(3)}`);
    console.log(`  highest similarity of an unrelated : ${bestNegative.toFixed(3)}`);
    console.log(`  configured minSimilarity           : ${DEFAULT_RAG.minSimilarity}`);
    if (worstPositive < DEFAULT_RAG.minSimilarity) fail("threshold would drop a correct hit — lower it");

    console.log("\n== Citation parsing ==");
    for (const c of CITATION_CASES) {
        const got = extractSectionRefs(c.text).map((r) => `${r.actShort}|${r.section}`).sort();
        const want = [...c.refs].sort();
        const ok = JSON.stringify(got) === JSON.stringify(want);
        console.log(`  ${ok ? "ok  " : "FAIL"} ${JSON.stringify(c.text)} -> [${got.join(", ")}]`);
        if (!ok) failures++;
    }

    console.log("\n== Citation verification ==");
    const shown = [{ actShort: "BNS", section: "103" }];
    const checked = verifyCitations(
        "Murder is Section 103 of BNS, cheating is Section 318 of BNS, and earlier it was Section 302 of the IPC.",
        shown
    );
    const status = Object.fromEntries(checked.map((c) => [`${c.actShort}|${c.section}`, c.status]));
    const expected: Record<string, string> = {
        "BNS|103": "verified",
        "BNS|318": "unverified_not_retrieved",
        "IPC|302": "unverified_act_not_loaded",
    };
    for (const [k, v] of Object.entries(expected)) {
        const ok = status[k] === v;
        console.log(`  ${ok ? "ok  " : "FAIL"} ${k} -> ${status[k]}`);
        if (!ok) failures++;
    }

    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURE(S)`}`);
    process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
