import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { advocateAdminApi, apiErrorMessage, REALTIME_MODELS, REALTIME_VOICES } from "./advocateApi";
import { BTN_PRIMARY, Field, INPUT, Section } from "./formControls";

interface Props {
  advocate: any;
  onChange: (advocate: any) => void;
}

export default function AiConfigEditor({ advocate, onChange }: Props) {
  const cfg = advocate.aiConfig;
  const [form, setForm] = useState({
    model: cfg.model,
    voice: cfg.voice,
    temperature: String(cfg.temperature),
    maxSessionMinutes: String(cfg.maxSessionMinutes),
    k: String(cfg.ragConfig?.k ?? 6),
    minSimilarity: String(cfg.ragConfig?.minSimilarity ?? 0.35),
    personaPrompt: cfg.personaPrompt ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      onChange(
        await advocateAdminApi.saveAiConfig(advocate.id, {
          model: form.model,
          voice: form.voice,
          temperature: Number(form.temperature),
          maxSessionMinutes: Number(form.maxSessionMinutes),
          ragConfig: { k: Number(form.k), minSimilarity: Number(form.minSimilarity) },
          personaPrompt: form.personaPrompt,
        })
      );
      toast.success("AI configuration saved — applies to new consultations");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save AI configuration"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title="AI configuration"
      description={`Version ${cfg.version}. Changes apply to consultations started afterwards; a running consultation keeps the configuration it began with.`}
    >
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Model">
            <select className={INPUT} value={form.model} onChange={(e) => set({ model: e.target.value })}>
              {REALTIME_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Voice">
            <select className={INPUT} value={form.voice} onChange={(e) => set({ voice: e.target.value })}>
              {REALTIME_VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Temperature" hint="0.6 – 1.2. 0.8 is recommended for voice.">
            <input className={INPUT} type="number" step="0.05" min={0.6} max={1.2} value={form.temperature} onChange={(e) => set({ temperature: e.target.value })} />
          </Field>
          <Field label="Max session length (minutes)" hint="5 – 60. The call is ended automatically.">
            <input className={INPUT} type="number" min={5} max={60} value={form.maxSessionMinutes} onChange={(e) => set({ maxSessionMinutes: e.target.value })} />
          </Field>
          <Field label="Passages per search" hint="How many law passages the AI reads per lookup (1 – 12).">
            <input className={INPUT} type="number" min={1} max={12} value={form.k} onChange={(e) => set({ k: e.target.value })} />
          </Field>
          <Field label="Minimum match score" hint="0 – 1. Higher = stricter; below this the AI must say it can't confirm.">
            <input className={INPUT} type="number" step="0.05" min={0} max={1} value={form.minSimilarity} onChange={(e) => set({ minSimilarity: e.target.value })} />
          </Field>
        </div>

        <Field
          label="Persona notes"
          hint="Tone and style only (e.g. how formal, how to greet). The safety and citation rules are built in and always apply — they cannot be edited or removed here."
        >
          <textarea className={`${INPUT} h-32`} maxLength={4000} value={form.personaPrompt} onChange={(e) => set({ personaPrompt: e.target.value })} />
        </Field>

        <button type="submit" className={BTN_PRIMARY} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin inline mr-1.5" />}
          Save AI configuration
        </button>
      </form>
    </Section>
  );
}
