import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import FormError from "./FormError";
import { apiErrorMessage } from "../../services/apiError";

interface RenameDialogProps {
  title: string;
  label: string;
  initialValue: string;
  maxLength?: number;
  /** Resolve to close the dialog; throw/reject to keep it open (the dialog shows the error). */
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
}

export default function RenameDialog({
  title,
  label,
  initialValue,
  maxLength = 120,
  onSave,
  onCancel,
}: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();
  const unchanged = trimmed === initialValue.trim();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onCancel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || unchanged || saving) return;

    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't save the new name. Please try again."));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => !saving && onCancel()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 rounded-xl p-6 w-full max-w-md text-navy-950 dark:text-cream-50"
      >
        <h3 id="rename-title" className="font-display text-lg font-medium mb-4">
          {title}
        </h3>

        <label className="block text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-cream-100/50 mb-1.5">
          {label}
        </label>
        <input
          ref={inputRef}
          value={value}
          maxLength={maxLength}
          disabled={saving}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          className="w-full px-3.5 py-2.5 rounded-lg bg-cream-50 dark:bg-navy-800 border border-cream-200 dark:border-white/10 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 disabled:opacity-60"
        />

        <FormError message={error} className="mt-3" />

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-cream-100/70 hover:bg-cream-100 dark:hover:bg-navy-800 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed || unchanged || saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-navy-900 text-cream-50 hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
