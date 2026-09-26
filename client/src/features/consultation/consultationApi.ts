import API from "../../services/api";

export { apiErrorMessage } from "../admin/advocateApi";

export interface PublicCredential {
  id: number;
  type: string;
  title: string;
  issuer: string | null;
  year: number | null;
  identifier: string | null;
  verified: boolean;
}

export interface PublicAdvocate {
  id: number;
  kind: "AI" | "HUMAN";
  displayName: string;
  slug: string;
  photoUrl: string | null;
  headline: string | null;
  bio: string | null;
  languages: string[];
  practiceAreas: string[];
  courts: string[];
  statesCovered: string[];
  yearsExperience: number | null;
  verificationStatus: "UNVERIFIED" | "VERIFIED";
  acceptingConsultations: boolean;
  /** Human advocates only: whether they can be reached right now. */
  availability?: "AVAILABLE" | "BUSY" | "OFFLINE" | null;
  credentials: PublicCredential[];
}

export type ConsultationStatus =
  | "LOBBY"
  | "LIVE"
  | "ENDED"
  | "FAILED"
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export interface Consultation {
  id: number;
  advocate: { id: number | null; name: string };
  advocateKind: "AI" | "HUMAN";
  state: string;
  stateName: string;
  language: string;
  status: ConsultationStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  endReason: string | null;
  limitSec: number | null;
  summaryStatus: "NONE" | "PENDING" | "READY" | "FAILED" | "SKIPPED";
  createdAt: string;
  summary?: ConsultationSummary | null;
  // Human consultations
  subject?: string | null;
  requestedAt?: string | null;
  expiresAt?: string | null;
  declineReason?: string | null;
  sharedNotes?: string | null;
}

export interface ConsultationListItem {
  id: number;
  advocateName: string;
  advocateKind: "AI" | "HUMAN";
  subject?: string | null;
  state: string;
  language: string;
  status: ConsultationStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  summaryStatus: Consultation["summaryStatus"];
  createdAt: string;
}

export type CitationStatus = "verified" | "unverified_not_retrieved" | "unverified_act_not_loaded";

// SPEECH turns carry the provisions mentioned (with verification); SEARCH turns carry the retrieved passages.
export interface Turn {
  id: number;
  speaker: "USER" | "ADVOCATE" | "SYSTEM";
  kind: "SPEECH" | "SEARCH" | "NOTICE";
  text: string;
  atMs: number;
  citations: any[] | null;
}

export interface SourcePassage {
  citation: string;
  actShort: string | null;
  section: string | null;
  sourceUrl: string;
  sourceDomain: string | null;
  similarity: number;
  excerpt: string;
}

export interface ConsultationSummary {
  situation: string;
  keyFacts: string[];
  questionsAsked: string[];
  provisions: { citation: string; plainMeaning: string }[];
  options: { title: string; steps: string[]; forum: string; timeline: string; likelyReaction: string; risks: string }[];
  recommendation: { text: string; rationale: string };
  nextSteps: string[];
  deadlines: string[];
  openQuestions: string[];
  provisionsChecked: { actShort: string; section: string; status: CitationStatus }[];
  unverifiedMentions: string[];
  disclaimer: string;
}

export interface ConsultationOptions {
  states: { code: string; name: string }[];
  languages: { code: string; name: string }[];
  dailyMinutes: number;
  remainingSeconds: number;
}

export const consultationApi = {
  advocates: async () => (await API.get("/advocates")).data.data.advocates as PublicAdvocate[],
  options: async () => (await API.get("/consultations/options")).data.data as ConsultationOptions,
  create: async (body: { advocateId: number; state: string; language: string; consent: boolean }) =>
    (await API.post("/consultations", body)).data.data.consultation as Consultation,
  get: async (id: number) => (await API.get(`/consultations/${id}`)).data.data.consultation as Consultation,
  list: async () => (await API.get("/consultations")).data.data.consultations as ConsultationListItem[],
  turns: async (id: number, after = 0) =>
    (await API.get(`/consultations/${id}/turns`, { params: { after } })).data.data.turns as Turn[],
  connect: async (id: number, sdp: string) =>
    (await API.post(`/consultations/${id}/connect`, { sdp })).data.data as {
      answer: string;
      startedAt: string;
      limitSec: number;
    },
  end: async (id: number) => (await API.post(`/consultations/${id}/end`)).data.data.consultation as Consultation,
  remove: async (id: number) => {
    await API.delete(`/consultations/${id}`);
  },
};

export const formatDuration = (totalSec: number) => {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const END_REASON_LABELS: Record<string, string> = {
  user_ended: "You ended the call",
  time_limit: "Session time limit reached",
  idle: "Ended after a long silence",
  call_closed: "The connection closed",
  connection_lost: "The connection was lost",
  server_restart: "Interrupted by a server restart",
  server_shutdown: "Interrupted by a server shutdown",
  left_lobby: "Left before joining",
  superseded: "Replaced by a newer consultation",
  lobby_expired: "Never joined",
  user_cancelled: "You cancelled the request",
  declined: "The advocate declined",
  no_response: "The advocate did not respond in time",
  no_show: "Accepted, but the call was never joined",
  advocate_ended: "The advocate ended the call",
  user_left: "You left before the call started",
};
