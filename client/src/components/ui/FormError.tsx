import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

// An error shown inside the form it belongs to, right above the button that caused it.
// Use this for anything a person submits (uploads, saves, requests). Toasts are for quick
// confirmations and background actions, because they disappear before everyone reads them.
export default function FormError({ message, className = "" }: { message: string | null; className?: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) box.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={box}
      role="alert"
      className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700 dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-400 ${className}`}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
