import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface AuthNoticeData {
    kind: "error" | "info";
    message: string;
    // A next step the person can take right there, e.g. "Create an account".
    action?: { label: string; onClick: () => void };
}

const STYLES = {
    error: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-800/50",
    info: "text-amber-900 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/40 dark:border-amber-800/50",
};

// The inline message above an auth form. Errors are announced to screen readers immediately.
export default function AuthNotice({ notice }: { notice: AuthNoticeData | null }) {
    const box = useRef<HTMLDivElement>(null);

    // The message sits above the form; after pressing a button further down (or on a phone)
    // it could be off-screen, so bring it into view whenever a new one appears.
    useEffect(() => {
        if (notice) box.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [notice?.message]);

    return (
        <AnimatePresence>
            {notice && (
                <motion.div
                    ref={box}
                    role={notice.kind === "error" ? "alert" : "status"}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`text-sm border p-3 rounded-lg mb-4 overflow-hidden ${STYLES[notice.kind]}`}
                >
                    <p>{notice.message}</p>
                    {notice.action && (
                        <button
                            type="button"
                            onClick={notice.action.onClick}
                            className="mt-2 font-semibold underline underline-offset-2 hover:no-underline"
                        >
                            {notice.action.label} →
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
