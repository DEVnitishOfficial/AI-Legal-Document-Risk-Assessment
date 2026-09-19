// Registry of the official statute sources the advocate is grounded in.
//
// Each entry is a central Act published as a PDF on a government domain.
// `expectedSections` is a sanity check: an ingest whose parser finds a
// different count is rejected instead of silently storing a partial Act.
//
// To add an Act: add an entry here (verify the URL downloads and the section
// count is right) and run the ingest — nothing else needs to change.

export interface StatuteSource {
    /** Short code stored in `act_short` and used in citations, e.g. "BNS". */
    actShort: string;
    /** Full official title. */
    actName: string;
    url: string;
    sourceDomain: string;
    jurisdiction: string;
    expectedSections: number;
    /** Date the Act came into force, when known. */
    effectiveFrom?: string;
    /** Names a person or the model may use for it (lower-case), for citation matching. */
    aliases: string[];
    /** Short plain-language scope, shown on the AI advocate's profile. */
    scope: string;
}

export const STATUTE_SOURCES: StatuteSource[] = [
    {
        actShort: "BNS",
        actName: "Bharatiya Nyaya Sanhita, 2023",
        url: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
        sourceDomain: "mha.gov.in",
        jurisdiction: "IN",
        expectedSections: 358,
        effectiveFrom: "2024-07-01",
        aliases: ["bns", "bharatiya nyaya sanhita", "bharatiya nyaya sanhita, 2023"],
        scope: "Substantive criminal law (offences and punishments) for offences on or after 1 July 2024",
    },
    {
        actShort: "BNSS",
        actName: "Bharatiya Nagarik Suraksha Sanhita, 2023",
        url: "https://www.mha.gov.in/sites/default/files/2024-04/250884_2_english_01042024.pdf",
        sourceDomain: "mha.gov.in",
        jurisdiction: "IN",
        expectedSections: 531,
        effectiveFrom: "2024-07-01",
        aliases: ["bnss", "bharatiya nagarik suraksha sanhita", "bharatiya nagarik suraksha sanhita, 2023"],
        scope: "Criminal procedure — FIR, arrest, bail, investigation, trial",
    },
    {
        actShort: "BSA",
        actName: "Bharatiya Sakshya Adhiniyam, 2023",
        url: "https://www.mha.gov.in/sites/default/files/250882_english_01042024.pdf",
        sourceDomain: "mha.gov.in",
        jurisdiction: "IN",
        expectedSections: 170,
        effectiveFrom: "2024-07-01",
        aliases: ["bsa", "bharatiya sakshya adhiniyam", "bharatiya sakshya adhiniyam, 2023"],
        scope: "Law of evidence, including electronic records",
    },
    // ── Pre-1 July 2024 criminal law ─────────────────────────────────────────
    // Offences committed before 1 July 2024 are still investigated and tried
    // under the CrPC and the Evidence Act, so they stay in the knowledge base.
    {
        actShort: "CrPC",
        actName: "Code of Criminal Procedure, 1973",
        url: "https://www.indiacode.nic.in/indiacode/bitstream/123456789/6796/1/ccp1973.pdf",
        sourceDomain: "indiacode.nic.in",
        jurisdiction: "IN",
        expectedSections: 484,
        effectiveFrom: "1974-04-01",
        aliases: ["crpc", "cr.p.c", "cr.p.c.", "code of criminal procedure", "code of criminal procedure, 1973"],
        scope: "Criminal procedure for offences before 1 July 2024 (replaced by the BNSS for later offences)",
    },
    {
        actShort: "IEA",
        actName: "Indian Evidence Act, 1872",
        url: "https://www.indiacode.nic.in/indiacode/bitstream/123456789/15287/1/indian_evidence_act.pdf",
        sourceDomain: "indiacode.nic.in",
        jurisdiction: "IN",
        expectedSections: 167,
        effectiveFrom: "1872-09-01",
        aliases: ["iea", "indian evidence act", "indian evidence act, 1872", "evidence act", "evidence act, 1872"],
        scope: "Law of evidence for proceedings before 1 July 2024 (replaced by the BSA)",
    },
    // ── Other central laws people commonly need ──────────────────────────────
    {
        actShort: "DV Act",
        actName: "Protection of Women from Domestic Violence Act, 2005",
        url: "https://www.indiacode.nic.in/indiacode/bitstream/123456789/15304/1/domviolence.pdf",
        sourceDomain: "indiacode.nic.in",
        jurisdiction: "IN",
        expectedSections: 37,
        effectiveFrom: "2006-10-26",
        aliases: [
            "dv act",
            "pwdva",
            "domestic violence act",
            "domestic violence act, 2005",
            "protection of women from domestic violence act",
            "protection of women from domestic violence act, 2005",
        ],
        scope: "Civil remedies against domestic violence — protection, residence and monetary orders",
    },
    {
        actShort: "CPA",
        actName: "Consumer Protection Act, 2019",
        url: "https://ncdrc.nic.in/bare_acts/CPA2019.pdf",
        sourceDomain: "ncdrc.nic.in",
        jurisdiction: "IN",
        expectedSections: 107,
        effectiveFrom: "2020-07-20",
        aliases: ["cpa", "consumer protection act", "consumer protection act, 2019"],
        scope: "Consumer complaints, defective goods, deficiency in service, unfair trade practices, product liability",
    },
    {
        actShort: "TPA",
        actName: "Transfer of Property Act, 1882",
        url: "https://www.indiacode.nic.in/bitstream/123456789/2338/1/A1882-04.pdf",
        sourceDomain: "indiacode.nic.in",
        jurisdiction: "IN",
        expectedSections: 137,
        effectiveFrom: "1882-07-01",
        aliases: ["tpa", "transfer of property act", "transfer of property act, 1882"],
        scope: "Sale, mortgage, lease, gift and exchange of immovable property",
    },
    {
        actShort: "RTI",
        actName: "Right to Information Act, 2005",
        url: "https://cic.gov.in/sites/default/files/RTI-Act_English.pdf",
        sourceDomain: "cic.gov.in",
        jurisdiction: "IN",
        expectedSections: 31,
        effectiveFrom: "2005-10-12",
        aliases: ["rti", "rti act", "right to information act", "right to information act, 2005"],
        scope: "Requesting information from public authorities, appeals and information commissions",
    },
    {
        actShort: "POCSO",
        actName: "Protection of Children from Sexual Offences Act, 2012",
        url: "https://www.indiacode.nic.in/indiacode/bitstream/123456789/9318/1/sexualoffencea2012-32.pdf",
        sourceDomain: "indiacode.nic.in",
        jurisdiction: "IN",
        expectedSections: 46,
        effectiveFrom: "2012-11-14",
        aliases: [
            "pocso",
            "pocso act",
            "protection of children from sexual offences act",
            "protection of children from sexual offences act, 2012",
        ],
        scope: "Sexual offences against children and the child-friendly trial procedure",
    },
];

// Acts the advocate may mention but that are NOT ingested. Offences committed
// before 1 July 2024 are still tried under the IPC, so it is legitimate to
// discuss — but the advocate has no retrieved text for it (no complete official
// PDF could be obtained yet), so any provision number cited from it is flagged
// as unverified. Also listed: Acts that were investigated and rejected because
// only an outdated or unusable text was available, so they are never verified
// from a wrong version.
export const LEGACY_ACT_ALIASES: Record<string, string[]> = {
    IPC: ["ipc", "indian penal code", "indian penal code, 1860"],
    "IT Act": ["it act", "information technology act", "information technology act, 2000"],
    MVA: ["mv act", "motor vehicles act", "motor vehicles act, 1988"],
    "NI Act": ["ni act", "negotiable instruments act", "negotiable instruments act, 1881"],
    "Contract Act": ["contract act", "indian contract act", "indian contract act, 1872"],
    "Limitation Act": ["limitation act", "limitation act, 1963"],
};

// Which criminal-law regime governs a matter depends on when the offence was
// committed: on/after 1 July 2024 the BNS/BNSS/BSA apply, earlier offences stay
// under the IPC/CrPC/Evidence Act. Retrieval must never mix the two, or the
// advocate could quote a repealed provision as current law. Civil and special
// laws (DV Act, CPA, TPA, RTI, POCSO…) are unaffected and appear in both.
export type LawEra = "current" | "before_2024_07_01";

const NEW_CRIMINAL_CODES = ["BNS", "BNSS", "BSA"];
const OLD_CRIMINAL_CODES = ["IPC", "CrPC", "IEA"];

export const actsExcludedForEra = (era: LawEra): string[] =>
    era === "before_2024_07_01" ? NEW_CRIMINAL_CODES : OLD_CRIMINAL_CODES;

export const getSource =(actShort: string): StatuteSource | undefined =>
    STATUTE_SOURCES.find((s) => s.actShort.toLowerCase() === actShort.toLowerCase());
