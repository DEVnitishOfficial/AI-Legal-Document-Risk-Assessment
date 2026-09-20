import { useId, useState } from "react";

interface AuthFieldProps {
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    isPassword?: boolean;
    autoComplete?: string;
    trailing?: React.ReactNode;
    // Marks the field the current error is about (red border, announced to screen readers).
    invalid?: boolean;
}

export default function AuthField({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    disabled,
    isPassword,
    autoComplete,
    trailing,
    invalid,
}: AuthFieldProps) {
    const [revealed, setRevealed] = useState(false);
    const id = useId();

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
                <label
                    htmlFor={id}
                    className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-cream-100/50"
                >
                    {label}
                </label>
                {isPassword ? (
                    <button
                        type="button"
                        onClick={() => setRevealed((r) => !r)}
                        className="text-[11px] font-semibold uppercase text-gold-600 dark:text-gold-400 hover:underline"
                    >
                        {revealed ? "Hide" : "Show"}
                    </button>
                ) : (
                    trailing
                )}
            </div>
            <input
                id={id}
                type={isPassword ? (revealed ? "text" : "password") : type}
                value={value}
                disabled={disabled}
                autoComplete={autoComplete}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={invalid || undefined}
                className={`w-full px-3.5 py-2.5 rounded-lg bg-cream-50 dark:bg-navy-800 text-navy-900 dark:text-white border ${
                    invalid
                        ? "border-red-400 dark:border-red-500/70"
                        : "border-cream-200 dark:border-white/10"
                } focus:border-gold-500 dark:focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-colors disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-cream-100/30`}
            />
        </div>
    );
}
