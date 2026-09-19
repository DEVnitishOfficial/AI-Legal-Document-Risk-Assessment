import { useState } from "react";

interface ClarifyOptionsProps {
    options: string[];
    onSelect: (value: string) => void;
    disabled?: boolean;
}

export default function ClarifyOptions({ options, onSelect, disabled }: ClarifyOptionsProps) {
    const [showOther, setShowOther] = useState(false);
    const [otherText, setOtherText] = useState("");

    const submitOther = () => {
        if (!otherText.trim()) return;
        onSelect(otherText.trim());
        setOtherText("");
        setShowOther(false);
    };

    return (
        <div className="flex flex-wrap gap-2 ml-11">
            {options.map((opt) => (
                <button
                    key={opt}
                    disabled={disabled}
                    onClick={() => onSelect(opt)}
                    className="px-4 py-2 rounded-full border border-gold-500/40 text-gold-700 bg-gold-500/10 hover:bg-gold-500/20 dark:text-gold-400 dark:border-gold-500/30 text-sm transition-colors disabled:opacity-50"
                >
                    {opt}
                </button>
            ))}

            {!showOther ? (
                <button
                    disabled={disabled}
                    onClick={() => setShowOther(true)}
                    className="px-4 py-2 rounded-full border border-cream-200 dark:border-white/15 text-gray-500 dark:text-cream-100/50 hover:bg-cream-100 dark:hover:bg-white/5 text-sm transition-colors disabled:opacity-50"
                >
                    Other
                </button>
            ) : (
                <div className="flex gap-2 w-full mt-1">
                    <input
                        autoFocus
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitOther()}
                        placeholder="Type your own answer..."
                        className="flex-1 px-3 py-2 rounded-lg bg-cream-100 dark:bg-navy-800 text-navy-950 dark:text-white text-sm outline-none"
                    />
                    <button
                        onClick={submitOther}
                        className="px-4 py-2 rounded-lg bg-navy-900 dark:bg-gold-500 text-cream-50 dark:text-navy-950 text-sm font-semibold"
                    >
                        Send
                    </button>
                </div>
            )}
        </div>
    );
}
