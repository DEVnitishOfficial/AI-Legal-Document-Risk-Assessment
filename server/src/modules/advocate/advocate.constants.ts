// Values an admin may choose for an AI advocate. Validated server-side so a
// typo in the admin panel can never break every consultation.

export const REALTIME_MODELS = ["gpt-realtime", "gpt-realtime-mini"] as const;

export const REALTIME_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

// Realtime API limits sampling temperature to [0.6, 1.2]; 0.8 is recommended for audio.
export const TEMPERATURE_MIN = 0.6;
export const TEMPERATURE_MAX = 1.2;

export const SESSION_MINUTES_MIN = 5;
export const SESSION_MINUTES_MAX = 60;

export const HUMAN_CREDENTIAL_TYPES = ["ENROLMENT", "DEGREE", "CERTIFICATION", "BAR_MEMBERSHIP"] as const;
export const AI_CREDENTIAL_TYPES = ["KNOWLEDGE_SOURCE", "SCOPE", "LAST_VERIFIED"] as const;

export const DEFAULT_AI_PROFILE = {
  displayName: "NyayMitra AI Advocate",
  headline: "AI legal advocate for Indian law, with section-level citations",
  bio:
    "An AI advocate (not a human lawyer). It asks about your situation, explains your options under Indian law with the provisions it relies on, describes how courts commonly treat each option, and leaves the decision to you. It cannot appear in court — for that you need an enrolled advocate.",
  languages: ["English", "Hindi"],
  practiceAreas: [
    "Criminal law",
    "Civil and property disputes",
    "Family law",
    "Consumer and cyber matters",
    "Constitutional rights",
    "Tenancy and contracts",
  ],
  courts: ["Supreme Court judgments", "High Court judgments"],
  statesCovered: [] as string[],
};

export const DEFAULT_AI_CONFIG = {
  provider: "openai",
  model: "gpt-realtime",
  voice: "marin", // one of the two Realtime-native voices; the most natural-sounding
  temperature: 0.8,
  personaPrompt: "",
  maxSessionMinutes: 20,
  ragConfig: { k: 6, minSimilarity: 0.3 },
};
