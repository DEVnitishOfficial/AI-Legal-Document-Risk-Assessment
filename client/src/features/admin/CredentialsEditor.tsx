import { useState } from "react";
import { CheckCircle2, Circle, Trash2, Plus } from "lucide-react";
import FormError from "../../components/ui/FormError";
import {
  advocateAdminApi,
  apiErrorMessage,
  AI_CREDENTIAL_TYPES,
  HUMAN_CREDENTIAL_TYPES,
  CREDENTIAL_LABELS,
} from "./advocateApi";
import { BTN_PRIMARY, Field, INPUT, Section } from "./formControls";

interface Props {
  advocate: any;
  onChange: (advocate: any) => void;
}

const EMPTY = { type: "", title: "", issuer: "", year: "", identifier: "" };

export default function CredentialsEditor({ advocate, onChange }: Props) {
  const isAi = advocate.kind === "AI";
  const types = isAi ? AI_CREDENTIAL_TYPES : HUMAN_CREDENTIAL_TYPES;
  const [draft, setDraft] = useState({ ...EMPTY, type: types[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<any>, failure: string) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      () =>
        advocateAdminApi.addCredential(advocate.id, {
          type: draft.type,
          title: draft.title,
          issuer: draft.issuer,
          identifier: draft.identifier,
          year: draft.year === "" ? null : Number(draft.year),
        }),
      "We couldn't add this credential. Please try again."
    );
    if (ok) setDraft({ ...EMPTY, type: draft.type });
  };

  return (
    <Section
      title={isAi ? "Knowledge sources & scope" : "Credentials"}
      description={
        isAi
          ? "What the AI is grounded in and where it is verified. Only add sources that are actually ingested."
          : "Enrolment number, degrees and memberships. Verify enrolment against the Bar Council record before publishing."
      }
    >
      {advocate.credentials.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-cream-100/40 mb-4">Nothing added yet.</p>
      ) : (
        <ul className="divide-y divide-cream-200 dark:divide-white/10 mb-4 rounded-lg border border-cream-200 dark:border-white/10">
          {advocate.credentials.map((c: any) => (
            <li key={c.id} className="flex items-start gap-3 px-3.5 py-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => advocateAdminApi.updateCredential(advocate.id, c.id, { verified: !c.verified }), "Couldn't update credential")}
                title={c.verified ? "Verified — click to unmark" : "Not verified — click to mark verified"}
                aria-label={c.verified ? "Unmark verified" : "Mark verified"}
                className="mt-0.5 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
              >
                {c.verified ? (
                  <CheckCircle2 size={18} className="text-risk-low-fg dark:text-risk-low-fg-dark" />
                ) : (
                  <Circle size={18} className="text-gray-400 dark:text-cream-100/40" />
                )}
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-gray-500 dark:text-cream-100/50 mt-0.5">
                  {CREDENTIAL_LABELS[c.type] || c.type}
                  {c.issuer ? ` · ${c.issuer}` : ""}
                  {c.year ? ` · ${c.year}` : ""}
                  {c.identifier ? ` · ${c.identifier}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => advocateAdminApi.deleteCredential(advocate.id, c.id), "Couldn't remove credential")}
                aria-label={`Remove ${c.title}`}
                className="p-1 rounded text-gray-400 hover:text-risk-high-fg dark:hover:text-risk-high-fg-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormError message={error} className="mb-4" />

      <form onSubmit={add} className="grid sm:grid-cols-6 gap-3 items-end">
        <div className="sm:col-span-2">
          <Field label="Type">
            <select className={INPUT} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {CREDENTIAL_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-4">
          <Field label="Title">
            <input className={INPUT} required maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={isAi ? "India Code (Government of India)" : "LL.B., Delhi University"} />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label={isAi ? "Source / publisher" : "Issued by"}>
            <input className={INPUT} maxLength={160} value={draft.issuer} onChange={(e) => setDraft({ ...draft, issuer: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={isAi ? "Reference" : "Enrolment / ID no."}>
            <input className={INPUT} maxLength={120} value={draft.identifier} onChange={(e) => setDraft({ ...draft, identifier: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-1">
          <Field label="Year">
            <input className={INPUT} type="number" min={1900} max={new Date().getFullYear()} value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-6">
          <button type="submit" className={`${BTN_PRIMARY} inline-flex items-center gap-1.5`} disabled={busy || !draft.title.trim()}>
            <Plus size={14} /> Add
          </button>
        </div>
      </form>
    </Section>
  );
}
