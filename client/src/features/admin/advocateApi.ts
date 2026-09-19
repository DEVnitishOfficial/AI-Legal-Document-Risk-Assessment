import API from "../../services/api";

// Every call returns the full, freshly-loaded advocate so the editor can just
// replace its state with the result.
const unwrap = (res: any) => res.data.data.advocate;

export const advocateAdminApi = {
  list: async () => (await API.get("/admin/advocates")).data.data.advocates as any[],
  create: async (body: any) => unwrap(await API.post("/admin/advocates", body)),
  update: async (id: number, body: any) => unwrap(await API.patch(`/admin/advocates/${id}`, body)),
  remove: async (id: number) => {
    await API.delete(`/admin/advocates/${id}`);
  },
  addCredential: async (id: number, body: any) => unwrap(await API.post(`/admin/advocates/${id}/credentials`, body)),
  updateCredential: async (id: number, credentialId: number, body: any) =>
    unwrap(await API.patch(`/admin/advocates/${id}/credentials/${credentialId}`, body)),
  deleteCredential: async (id: number, credentialId: number) =>
    unwrap(await API.delete(`/admin/advocates/${id}/credentials/${credentialId}`)),
  saveAiConfig: async (id: number, body: any) => unwrap(await API.put(`/admin/advocates/${id}/ai-config`, body)),
  uploadPhoto: async (id: number, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return unwrap(await API.post(`/admin/advocates/${id}/photo`, form));
  },
  removePhoto: async (id: number) => unwrap(await API.delete(`/admin/advocates/${id}/photo`)),
};

// The server validates all of these; they only drive the dropdowns.
export const REALTIME_MODELS = ["gpt-realtime", "gpt-realtime-mini"];
export const REALTIME_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];

export const HUMAN_CREDENTIAL_TYPES = ["ENROLMENT", "DEGREE", "CERTIFICATION", "BAR_MEMBERSHIP"];
export const AI_CREDENTIAL_TYPES = ["KNOWLEDGE_SOURCE", "SCOPE", "LAST_VERIFIED"];

export const CREDENTIAL_LABELS: Record<string, string> = {
  ENROLMENT: "Bar Council enrolment",
  DEGREE: "Degree",
  CERTIFICATION: "Certification",
  BAR_MEMBERSHIP: "Bar association membership",
  KNOWLEDGE_SOURCE: "Knowledge source",
  SCOPE: "Scope",
  LAST_VERIFIED: "Last verified",
};

export const apiErrorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;
