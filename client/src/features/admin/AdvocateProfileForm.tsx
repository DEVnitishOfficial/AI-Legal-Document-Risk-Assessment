import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, ImagePlus, Trash2, BadgeCheck } from "lucide-react";
import { advocateAdminApi, apiErrorMessage } from "./advocateApi";
import { BTN_GHOST, BTN_PRIMARY, Field, INPUT, Section, listToText, textToList } from "./formControls";

interface Props {
  /** null → creating a new advocate. */
  advocate: any | null;
  onSaved: (advocate: any) => void;
}

const Initials = ({ name }: { name: string }) => (
  <span className="font-display text-xl text-gold-600 dark:text-gold-400">
    {name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?"}
  </span>
);

export default function AdvocateProfileForm({ advocate, onSaved }: Props) {
  const creating = advocate === null;
  const [kind, setKind] = useState<"AI" | "HUMAN">(advocate?.kind ?? "HUMAN");
  const isAi = kind === "AI";

  const [form, setForm] = useState({
    displayName: advocate?.displayName ?? "",
    headline: advocate?.headline ?? "",
    bio: advocate?.bio ?? "",
    languages: listToText(advocate?.languages),
    practiceAreas: listToText(advocate?.practiceAreas),
    courts: listToText(advocate?.courts),
    statesCovered: listToText(advocate?.statesCovered),
    yearsExperience: advocate?.yearsExperience?.toString() ?? "",
    sortOrder: advocate?.sortOrder?.toString() ?? "0",
    status: advocate?.status ?? "DRAFT",
    verificationStatus: advocate?.verificationStatus ?? "UNVERIFIED",
    acceptingConsultations: advocate?.acceptingConsultations ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = {
        displayName: form.displayName,
        headline: form.headline,
        bio: form.bio,
        languages: textToList(form.languages),
        practiceAreas: textToList(form.practiceAreas),
        courts: textToList(form.courts),
        statesCovered: textToList(form.statesCovered),
        yearsExperience: isAi || form.yearsExperience === "" ? null : Number(form.yearsExperience),
        sortOrder: Number(form.sortOrder) || 0,
      };

      const saved = creating
        ? await advocateAdminApi.create({ ...body, kind })
        : await advocateAdminApi.update(advocate.id, {
            ...body,
            status: form.status,
            verificationStatus: form.verificationStatus,
            acceptingConsultations: form.acceptingConsultations,
          });

      toast.success(creating ? "Advocate created as a draft" : "Advocate saved");
      // The server may adjust publishing fields (e.g. disabling switches
      // "accepting" off) — show what it actually stored.
      set({
        status: saved.status,
        verificationStatus: saved.verificationStatus,
        acceptingConsultations: saved.acceptingConsultations,
      });
      onSaved(saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save advocate"));
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async (file?: File) => {
    if (!file || !advocate) return;
    setPhotoBusy(true);
    try {
      onSaved(await advocateAdminApi.uploadPhoto(advocate.id, file));
      toast.success("Photo updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't upload photo"));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    if (!advocate) return;
    setPhotoBusy(true);
    try {
      onSaved(await advocateAdminApi.removePhoto(advocate.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't remove photo"));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Section
        title="Profile"
        description={
          isAi
            ? "What clients see. For the AI, describe honestly what it covers — never a degree or bar number."
            : "What clients see before they decide to connect."
        }
      >
        <div className="space-y-4">
          {!creating && (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-cream-200 dark:border-white/15 bg-cream-100 dark:bg-navy-800 flex items-center justify-center shrink-0">
                {advocate.photoUrl ? (
                  <img src={advocate.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Initials name={form.displayName} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
                <button type="button" className={BTN_GHOST} disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                  {photoBusy ? <Loader2 size={14} className="animate-spin inline" /> : <ImagePlus size={14} className="inline mr-1.5" />}
                  {advocate.photoUrl ? "Change photo" : "Upload photo"}
                </button>
                {advocate.photoUrl && (
                  <button type="button" className={BTN_GHOST} disabled={photoBusy} onClick={removePhoto} aria-label="Remove photo">
                    <Trash2 size={14} />
                  </button>
                )}
                <span className="text-xs text-gray-400 dark:text-cream-100/40">JPEG, PNG or WebP, up to 2 MB</span>
              </div>
            </div>
          )}

          {creating && (
            <Field label="Type">
              <select className={INPUT} value={kind} onChange={(e) => setKind(e.target.value as any)}>
                <option value="HUMAN">Human advocate</option>
                <option value="AI">AI advocate</option>
              </select>
            </Field>
          )}

          <Field label="Display name">
            <input className={INPUT} required maxLength={100} value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} />
          </Field>
          <Field label="Headline" hint="One line under the name.">
            <input className={INPUT} maxLength={200} value={form.headline} onChange={(e) => set({ headline: e.target.value })} />
          </Field>
          <Field label="About">
            <textarea className={`${INPUT} h-28`} maxLength={2000} value={form.bio} onChange={(e) => set({ bio: e.target.value })} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Languages" hint="Comma separated">
              <input className={INPUT} value={form.languages} onChange={(e) => set({ languages: e.target.value })} placeholder="English, Hindi" />
            </Field>
            <Field label={isAi ? "Areas covered" : "Practice areas"} hint="Comma separated">
              <input className={INPUT} value={form.practiceAreas} onChange={(e) => set({ practiceAreas: e.target.value })} placeholder="Criminal law, Family law" />
            </Field>
            <Field label={isAi ? "Courts covered (judgments)" : "Practises before"} hint="Comma separated">
              <input className={INPUT} value={form.courts} onChange={(e) => set({ courts: e.target.value })} placeholder="Delhi High Court, District courts" />
            </Field>
            <Field label="States covered" hint={isAi ? "Empty = central law only" : "Comma separated"}>
              <input className={INPUT} value={form.statesCovered} onChange={(e) => set({ statesCovered: e.target.value })} placeholder="Delhi, Maharashtra" />
            </Field>
            {!isAi && (
              <Field label="Years of experience">
                <input className={INPUT} type="number" min={0} max={70} value={form.yearsExperience} onChange={(e) => set({ yearsExperience: e.target.value })} />
              </Field>
            )}
            <Field label="Display order" hint="Lower shows first">
              <input className={INPUT} type="number" min={0} max={1000} value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
            </Field>
          </div>
        </div>
      </Section>

      {!creating && (
        <Section
          title="Publishing"
          description={
            isAi
              ? "Controls whether clients can start a consultation."
              : "A human advocate can only be published after an admin verifies their Bar Council enrolment."
          }
        >
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <Field label="Status">
              <select className={INPUT} value={form.status} onChange={(e) => set({ status: e.target.value })}>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="ACTIVE">Active (visible)</option>
                <option value="DISABLED">Disabled (hidden)</option>
              </select>
            </Field>
            <Field label="Verification">
              <select className={INPUT} value={form.verificationStatus} onChange={(e) => set({ verificationStatus: e.target.value })}>
                <option value="UNVERIFIED">Unverified</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input
                type="checkbox"
                className="accent-gold-600"
                checked={form.acceptingConsultations}
                onChange={(e) => set({ acceptingConsultations: e.target.checked })}
              />
              Accepting consultations
            </label>
          </div>
          {advocate.verificationStatus === "VERIFIED" && advocate.verifiedAt && (
            <p className="flex items-center gap-1.5 text-xs text-risk-low-fg dark:text-risk-low-fg-dark mt-3">
              <BadgeCheck size={14} /> Verified {new Date(advocate.verifiedAt).toLocaleDateString()}
            </p>
          )}
        </Section>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className={BTN_PRIMARY} disabled={saving || !form.displayName.trim()}>
          {saving && <Loader2 size={14} className="animate-spin inline mr-1.5" />}
          {creating ? "Create advocate" : "Save changes"}
        </button>
        {creating && <span className="text-xs text-gray-500 dark:text-cream-100/50">Created as a draft — nothing is published until you review it.</span>}
      </div>
    </form>
  );
}
