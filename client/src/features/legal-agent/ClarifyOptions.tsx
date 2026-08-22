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
                    className="px-4 py-2 rounded-full border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-sm transition disabled:opacity-50"
                >
                    {opt}
                </button>
            ))}

            {!showOther ? (
                <button
                    disabled={disabled}
                    onClick={() => setShowOther(true)}
                    className="px-4 py-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 text-sm transition disabled:opacity-50"
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
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none"
                    />
                    <button
                        onClick={submitOther}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm"
                    >
                        Send
                    </button>
                </div>
            )}
        </div>
    );
}
