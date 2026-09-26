import API from "../../services/api";
import type { Consultation } from "../consultation/consultationApi";

export { apiErrorMessage } from "../admin/advocateApi";

// What an advocate sees of a consultation: a first name and last initial, never contact details.
export interface DeskConsultation {
  id: number;
  status: Consultation["status"];
  clientName: string;
  state: string;
  stateName: string;
  language: string;
  subject: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  endReason: string | null;
  declineReason: string | null;
  privateNotes: string | null;
  sharedNotes: string | null;
  limitSec: number;
}

export interface DeskData {
  advocate: { id: number; displayName: string; photoUrl: string | null };
  online: boolean;
  wantsAvailable: boolean;
  /** Why this advocate cannot go available yet (profile not published / verified), or null. */
  blockedReason: string | null;
  callMaxMinutes: number;
  pending: DeskConsultation[];
  active: DeskConsultation[];
  history: DeskConsultation[];
}

export interface AdvocateAccount {
  id: number;
  displayName: string;
  photoUrl: string | null;
}

export const humanApi = {
  request: async (body: { advocateId: number; state: string; language: string; subject: string; consent: boolean }) =>
    (await API.post("/human-consultations", body)).data.data.consultation as Consultation,
  cancel: async (id: number) => (await API.post(`/human-consultations/${id}/cancel`)).data.data.consultation as Consultation,
  end: async (id: number) => (await API.post(`/human-consultations/${id}/end`)).data.data.consultation,

  whoami: async () => (await API.get("/advocate-desk/whoami")).data.data.advocate as AdvocateAccount | null,
  desk: async () => (await API.get("/advocate-desk/me")).data.data as DeskData,
  setAvailable: async (available: boolean) =>
    (await API.post("/advocate-desk/available", { available })).data.data as { online: boolean; wantsAvailable: boolean },
  deskConsultation: async (id: number) =>
    (await API.get(`/advocate-desk/consultations/${id}`)).data.data.consultation as DeskConsultation,
  accept: async (id: number) =>
    (await API.post(`/advocate-desk/consultations/${id}/accept`)).data.data.consultation as DeskConsultation,
  decline: async (id: number, reason?: string) =>
    (await API.post(`/advocate-desk/consultations/${id}/decline`, { reason })).data.data.consultation as DeskConsultation,
  saveNotes: async (id: number, notes: { privateNotes?: string; sharedNotes?: string }) =>
    (await API.put(`/advocate-desk/consultations/${id}/notes`, notes)).data.data.consultation as DeskConsultation,
};
