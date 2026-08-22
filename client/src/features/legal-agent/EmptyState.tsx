import { Scale } from "lucide-react";
import type { ChatLanguage } from "./types";

const STARTERS_EN = [
    "Someone hacked my bank account, what should I do?",
    "What is anticipatory bail and how do I get it?",
    "My landlord won't return my security deposit — what are my options?",
    "A relative filed a false case against me out of jealousy, I'm scared of being arrested.",
];

const STARTERS_HI = [
    "किसी ने मेरा बैंक अकाउंट हैक कर लिया, मुझे क्या करना चाहिए?",
    "अग्रिम जमानत (anticipatory bail) क्या है और मैं इसे कैसे ले सकता/सकती हूं?",
    "मेरा मकान मालिक सिक्योरिटी डिपॉजिट वापस नहीं दे रहा — मेरे पास क्या विकल्प हैं?",
    "एक रिश्तेदार ने जलन में मेरे खिलाफ झूठा केस दर्ज करवाया है, मुझे गिरफ्तारी का डर है।",
];

interface EmptyStateProps {
    onPick: (prompt: string) => void;
    language: ChatLanguage;
}

export default function EmptyState({ onPick, language }: EmptyStateProps) {
    const starters = language === "hi" ? STARTERS_HI : STARTERS_EN;

    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center mb-4">
                <Scale size={24} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold mb-1">
                {language === "hi" ? "अपना कानूनी सवाल पूछें" : "Ask your legal question"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                {language === "hi"
                    ? "यह सामान्य जानकारी है, वास्तविक कानूनी सलाह के लिए हमेशा एक वकील से सलाह लें।"
                    : "This gives general information to help you prepare — always consult a real lawyer before acting."}
            </p>
            <div className="grid gap-2 w-full max-w-md">
                {starters.map((s) => (
                    <button
                        key={s}
                        onClick={() => onPick(s)}
                        className="text-left text-sm px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition text-gray-700 dark:text-gray-300"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
