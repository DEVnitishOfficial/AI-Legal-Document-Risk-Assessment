// Golden questions for measuring grounded retrieval. Each positive case names
// the provision(s) a correct answer must be able to cite; a hit means one of
// them appears in the retrieved passages. Negatives are questions the loaded
// statutes cannot answer, so the advocate should end up with no passages.
//
// Expected sections were checked against the official texts by hand — extend
// this list whenever a retrieval bug is found or a new Act is ingested.

export interface GoldenCase {
    query: string;
    /** Any one of these "ACT|section" keys counts as a hit. */
    expect: string[];
    /** Criminal-law regime the question is about; defaults to "current". */
    era?: "current" | "before_2024_07_01";
}

export const POSITIVE_CASES: GoldenCase[] = [
    { query: "What is the punishment for murder?", expect: ["BNS|103"] },
    { query: "Someone cheated me and took my money by deceiving me", expect: ["BNS|318"] },
    { query: "How can I get anticipatory bail before I am arrested?", expect: ["BNSS|482"] },
    { query: "The police are refusing to register my FIR for a cognizable offence", expect: ["BNSS|173"] },
    { query: "Can the police arrest me without a warrant?", expect: ["BNSS|35"] },
    { query: "Is an electronic record such as a WhatsApp chat admissible as evidence?", expect: ["BSA|63"] },
    { query: "What is the punishment for rape?", expect: ["BNS|64"] },
    { query: "Someone stole my mobile phone", expect: ["BNS|303"] },
    { query: "Someone snatched my chain while I was walking", expect: ["BNS|304"] },
    { query: "What is the punishment for defamation?", expect: ["BNS|356"] },
    { query: "A woman died within seven years of marriage and dowry was demanded", expect: ["BNS|80"] },
    { query: "My husband and in-laws are cruel to me for dowry", expect: ["BNS|85", "BNS|86"] },
    { query: "I am accused of a bailable offence, can I get bail as a right?", expect: ["BNSS|478"] },
    { query: "Investigation is not finished in 60 or 90 days, can I get default bail?", expect: ["BNSS|187"] },
    { query: "Someone is threatening me to pay money — extortion", expect: ["BNS|308"] },
    { query: "A person entrusted with my property dishonestly misused it", expect: ["BNS|316"] },
    { query: "When can I use force in private defence of my body?", expect: ["BNS|34", "BNS|35", "BNS|37", "BNS|38"] },
    { query: "A colleague is sexually harassing me at work", expect: ["BNS|75"] },
    { query: "A man keeps following me and contacting me even though I said no", expect: ["BNS|78"] },
    { query: "A mob killed a man because of his caste or religion", expect: ["BNS|103"] },
    // Pre-1 July 2024 criminal law
    { query: "Anticipatory bail for an offence committed in 2022", expect: ["CrPC|438"], era: "before_2024_07_01" },
    { query: "Can police arrest without a warrant for a 2021 case?", expect: ["CrPC|41"], era: "before_2024_07_01" },
    { query: "My husband is not giving maintenance to me and my child", expect: ["BNSS|144", "DV Act|20"] },
    { query: "Certificate needed to prove a computer printout in a 2019 case", expect: ["IEA|65B"], era: "before_2024_07_01" },
    // Other central laws
    { query: "I received a defective product and want to file a consumer complaint", expect: ["CPA|35", "CPA|39", "CPA|83", "CPA|84"] },
    { query: "My husband beats me at home and I want a protection order", expect: ["DV Act|18", "DV Act|12", "DV Act|19"] },
    { query: "How do I get information from a government department under RTI?", expect: ["RTI|6", "RTI|7"] },
    { query: "A child was sexually assaulted, what is the punishment?", expect: ["POCSO|4", "POCSO|3", "POCSO|6", "POCSO|8"] },
    { query: "What are the rules for terminating a lease of a house?", expect: ["TPA|106"] },
    { query: "What is a mortgage of immovable property?", expect: ["TPA|58"] },
    { query: "Section 482 BNSS", expect: ["BNSS|482"] },
    { query: "Section 438 of the Code of Criminal Procedure", expect: ["CrPC|438"] },
    { query: "What does Section 63 of the Bharatiya Sakshya Adhiniyam say?", expect: ["BSA|63"] },
];

// Clearly unrelated: nothing may come back at the configured threshold.
export const NEGATIVE_QUERIES: string[] = [
    "How do I bake a chocolate cake?",
    "What is the capital of France?",
    "Best mutual funds to invest in this year",
    "How do I fix a flat bicycle tyre?",
];

// Legal/financial vocabulary but outside the loaded Acts. A similarity cutoff
// can't reliably exclude these (GST scored 0.328 vs 0.336 for the weakest
// correct hit), so they are reported, not failed: the advocate's prompt and
// the citation verifier are what stop it citing an irrelevant provision.
export const ADJACENT_QUERIES: string[] = [
    "What is the last date to file GST returns?",
    "How is income tax calculated on my salary?",
    "My landlord wants to evict me — what is the notice period?",
];

// Citation-parser cases: text spoken by the advocate → refs that must be found.
export const CITATION_CASES: { text: string; refs: string[] }[] = [
    { text: "This falls under Section 103 of the BNS.", refs: ["BNS|103"] },
    { text: "You can apply under section 482 of the Bharatiya Nagarik Suraksha Sanhita, 2023.", refs: ["BNSS|482"] },
    { text: "BNSS Section 35 lets police arrest without a warrant.", refs: ["BNSS|35"] },
    { text: "Sections 316 and 318 of BNS deal with breach of trust and cheating.", refs: ["BNS|316", "BNS|318"] },
    { text: "Under s. 63 BSA, an electronic record needs a certificate.", refs: ["BSA|63"] },
    { text: "Section 103(1) of the Bharatiya Nyaya Sanhita provides death or life imprisonment.", refs: ["BNS|103"] },
    { text: "Earlier this was Section 302 of the IPC.", refs: ["IPC|302"] },
    { text: "Under Section 438 CrPC you could seek anticipatory bail.", refs: ["CrPC|438"] },
    { text: "Chapter VI of the code covers offences against the body.", refs: [] },
    { text: "You should file this within 3 sections of the process.", refs: [] },
];
