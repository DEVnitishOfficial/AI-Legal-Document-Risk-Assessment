import { motion } from "framer-motion";

export type AuthMethod = "email" | "phone";

interface AuthTabsProps {
    value: AuthMethod;
    onChange: (value: AuthMethod) => void;
}

export default function AuthTabs({ value, onChange }: AuthTabsProps) {
    return (
        <div className="flex bg-cream-100 dark:bg-navy-800 rounded-lg p-1 mb-6">
            {(["email", "phone"] as const).map((tab) => (
                <button
                    key={tab}
                    type="button"
                    onClick={() => onChange(tab)}
                    className="relative flex-1 py-2 text-sm font-medium rounded-md transition-colors"
                >
                    {value === tab && (
                        <motion.div
                            layoutId="auth-tab-pill"
                            className="absolute inset-0 bg-white dark:bg-gold-500 rounded-md shadow-sm"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        />
                    )}
                    <span
                        className={`relative z-10 ${
                            value === tab
                                ? "text-navy-900 dark:text-navy-950"
                                : "text-gray-500 dark:text-cream-100/60"
                        }`}
                    >
                        {tab === "email" ? "Email" : "Mobile OTP"}
                    </span>
                </button>
            ))}
        </div>
    );
}
