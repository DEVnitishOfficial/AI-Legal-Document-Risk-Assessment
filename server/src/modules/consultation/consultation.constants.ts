// Fixed lists and limits for live consultations.

export const CONSULT_LANGUAGES = {
    en: { name: "English", transcription: "en" },
    hi: { name: "Hindi (Devanagari script, plain conversational Hindi)", transcription: "hi" },
} as const;
export type ConsultLanguage = keyof typeof CONSULT_LANGUAGES;

// "IN" = the client is unsure / only central law should be used.
export const INDIAN_STATES: Record<string, string> = {
    IN: "Not sure / central law only",
    AN: "Andaman and Nicobar Islands",
    AP: "Andhra Pradesh",
    AR: "Arunachal Pradesh",
    AS: "Assam",
    BR: "Bihar",
    CH: "Chandigarh",
    CG: "Chhattisgarh",
    DD: "Dadra and Nagar Haveli and Daman and Diu",
    DL: "Delhi",
    GA: "Goa",
    GJ: "Gujarat",
    HR: "Haryana",
    HP: "Himachal Pradesh",
    JK: "Jammu and Kashmir",
    JH: "Jharkhand",
    KA: "Karnataka",
    KL: "Kerala",
    LA: "Ladakh",
    LD: "Lakshadweep",
    MP: "Madhya Pradesh",
    MH: "Maharashtra",
    MN: "Manipur",
    ML: "Meghalaya",
    MZ: "Mizoram",
    NL: "Nagaland",
    OD: "Odisha",
    PY: "Puducherry",
    PB: "Punjab",
    RJ: "Rajasthan",
    SK: "Sikkim",
    TN: "Tamil Nadu",
    TS: "Telangana",
    TR: "Tripura",
    UP: "Uttar Pradesh",
    UK: "Uttarakhand",
    WB: "West Bengal",
};

// Cost/abuse limits. Realtime voice is billed per audio minute.
export const DAILY_MINUTES_DEFAULT = 30;
export const IDLE_TIMEOUT_MS = 4 * 60 * 1000; // no client speech for this long ends the call
export const WRAP_UP_WARNING_MS = 60 * 1000; // advocate is told to wrap up this long before the limit
export const STALE_LOBBY_MS = 20 * 60 * 1000; // an unused lobby is failed after this long
export const MAX_CORRECTIONS_PER_SESSION = 3; // times the server asks the advocate to re-verify a citation
export const MAX_TURN_CHARS = 4000;

export const DISCLAIMER =
    "This consultation was with an AI assistant, not a human lawyer. It is general legal information based on the " +
    "central laws loaded in its knowledge base, not legal advice, and it does not create a lawyer–client relationship. " +
    "Confirm every step, deadline and provision with an enrolled advocate before you act on it.";
