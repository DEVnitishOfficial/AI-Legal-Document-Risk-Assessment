import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import FormError from "./FormError";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  busy?: boolean;
  /** Why the last attempt failed; shown in the dialog so it isn't missed. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 rounded-xl p-6 w-full max-w-sm text-navy-950 dark:text-cream-50"
      >
        <h3 id="confirm-title" className="font-display text-lg font-medium mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-cream-100/60 leading-relaxed mb-6">{message}</p>

        <FormError message={error ?? null} className="mb-4" />

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-cream-100/70 hover:bg-cream-100 dark:hover:bg-navy-800 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${
              danger
                ? "bg-risk-high-fg text-white hover:opacity-90 dark:bg-risk-high-fg-dark dark:text-navy-950"
                : "bg-navy-900 text-cream-50 hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400"
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
