import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock, Share2 } from "lucide-react";
import { apiErrorMessage, humanApi, type DeskConsultation } from "./humanApi";

type SaveState = "idle" | "saving" | "saved" | "error";
type Notes = { privateNotes: string; sharedNotes: string };

const AREA =
  "w-full rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-navy-950 px-3 py-2.5 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

const FIELDS: (keyof Notes)[] = ["privateNotes", "sharedNotes"];

// The advocate's side panel: who the client is and what they asked, plus two note fields —
// one private (only the advocate ever sees it) and one shared with the client after the call.
//
// Notes save automatically a moment after typing stops. Three rules keep them safe:
//  * only the fields that were actually changed are sent, so editing one can never blank the other;
//  * when the server's copy changes (e.g. the page reloads its data after a call) and a field has
//    no unsaved edits, the field follows it instead of staying on a stale value;
//  * anything still unsaved when the panel closes is saved on the way out.
export default function NotesPanel({ consultation }: { consultation: DeskConsultation }) {
  const [privateNotes, setPrivate] = useState(consultation.privateNotes ?? "");
  const [sharedNotes, setShared] = useState(consultation.sharedNotes ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  // What the server is known to hold, and what is on screen right now.
  const saved = useRef<Notes>({ privateNotes: consultation.privateNotes ?? "", sharedNotes: consultation.sharedNotes ?? "" });
  const current = useRef<Notes>({ privateNotes, sharedNotes });
  current.current = { privateNotes, sharedNotes };

  const changed = (): Partial<Notes> => {
    const patch: Partial<Notes> = {};
    for (const f of FIELDS) if (current.current[f] !== saved.current[f]) patch[f] = current.current[f];
    return patch;
  };
  const dirty = privateNotes !== saved.current.privateNotes || sharedNotes !== saved.current.sharedNotes;

  // Follow the server for fields with no unsaved edits.
  useEffect(() => {
    const fromServer: Notes = { privateNotes: consultation.privateNotes ?? "", sharedNotes: consultation.sharedNotes ?? "" };
    for (const f of FIELDS) {
      if (current.current[f] === saved.current[f] && fromServer[f] !== saved.current[f]) {
        saved.current[f] = fromServer[f];
        (f === "privateNotes" ? setPrivate : setShared)(fromServer[f]);
      }
    }
  }, [consultation.privateNotes, consultation.sharedNotes]);

  // Debounced autosave of what changed.
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(async () => {
      const patch = changed();
      if (Object.keys(patch).length === 0) return;
      setState("saving");
      try {
        await humanApi.saveNotes(consultation.id, patch);
        for (const f of FIELDS) if (patch[f] !== undefined) saved.current[f] = patch[f]!;
        setError(null);
        setState("saved");
      } catch (err) {
        setError(apiErrorMessage(err, "Couldn't save your notes"));
        setState("error");
      }
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateNotes, sharedNotes, consultation.id]);

  // Save whatever is still pending as the panel goes away (the call ended, or the page changed).
  useEffect(
    () => () => {
      const patch = changed();
      if (Object.keys(patch).length > 0) void humanApi.saveNotes(consultation.id, patch).catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consultation.id]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4">
        <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-2">Client</h2>
        <p className="font-display text-lg font-medium">{consultation.clientName}</p>
        <p className="text-[13px] text-gray-500 dark:text-cream-100/50">
          {consultation.stateName} · {consultation.language === "hi" ? "Hindi" : "English"}
        </p>
        {consultation.subject && (
          <p className="mt-3 text-[13.5px] leading-relaxed rounded-lg bg-cream-100 dark:bg-navy-800 p-3">
            <span className="block text-[11px] font-mono uppercase tracking-wide text-gray-400 dark:text-cream-100/40 mb-1">
              What they wrote
            </span>
            {consultation.subject}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40">Notes</h2>
          <span className="text-[12px] text-gray-500 dark:text-cream-100/50 inline-flex items-center gap-1" aria-live="polite">
            {state === "saving" && (
              <>
                <Loader2 size={12} className="animate-spin" /> Saving…
              </>
            )}
            {state === "saved" && !dirty && (
              <>
                <Check size={12} /> Saved
              </>
            )}
          </span>
        </div>

        <div>
          <label htmlFor="private-notes" className="flex items-center gap-1.5 text-[13px] font-medium mb-1.5">
            <Lock size={13} className="text-gold-600 dark:text-gold-400" /> Private notes
          </label>
          <textarea
            id="private-notes"
            className={`${AREA} h-32`}
            maxLength={8000}
            value={privateNotes}
            onChange={(e) => setPrivate(e.target.value)}
            placeholder="Only you can see these."
          />
        </div>

        <div>
          <label htmlFor="shared-notes" className="flex items-center gap-1.5 text-[13px] font-medium mb-1.5">
            <Share2 size={13} className="text-gold-600 dark:text-gold-400" /> Notes for the client
          </label>
          <textarea
            id="shared-notes"
            className={`${AREA} h-32`}
            maxLength={8000}
            value={sharedNotes}
            onChange={(e) => setShared(e.target.value)}
            placeholder="Advice, next steps, documents to bring. The client sees this after the call."
          />
          <p className="text-[12px] text-gray-500 dark:text-cream-100/50 mt-1">Shown to the client once the call has ended.</p>
        </div>

        {error && (
          <p role="alert" className="text-[12.5px] text-risk-high-fg dark:text-risk-high-fg-dark">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
