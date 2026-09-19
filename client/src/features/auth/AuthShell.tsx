import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, ShieldCheck } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import FeatureList from "./FeatureList";

const ROTATING_USE_CASES = [
    "rental agreements",
    "FIR copies",
    "legal notices",
    "loan contracts",
    "dowry & DV cases",
];

interface AuthShellProps {
    headline: React.ReactNode;
    subtitle: string;
    children: React.ReactNode;
}

export default function AuthShell({ headline, subtitle, children }: AuthShellProps) {
    const [useCaseIndex, setUseCaseIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setUseCaseIndex((i) => (i + 1) % ROTATING_USE_CASES.length);
        }, 2400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen flex font-body bg-cream-50 dark:bg-navy-950">
            {/* Left branding panel — hidden on small screens, form stays centered */}
            <div className="hidden lg:flex lg:w-[46%] relative bg-navy-900 text-cream-50 flex-col justify-between p-14 overflow-hidden">
                {/* Ambient drifting glow — the "alive" background detail */}
                <motion.div
                    className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl pointer-events-none"
                    animate={{ x: [0, 30, 0], y: [0, 24, 0] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-maroon-700/20 blur-3xl pointer-events-none"
                    animate={{ x: [0, -24, 0], y: [0, -28, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative flex items-center gap-2"
                >
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
                    </span>
                    <span className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-400">
                        NyayMitra AI
                    </span>
                </motion.div>

                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="relative w-24 h-24 mb-8"
                    >
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-dashed border-gold-500/40"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Landmark size={34} className="text-gold-400" />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="font-display text-[2.75rem] leading-[1.12] font-medium mb-5 text-balance"
                    >
                        {headline}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.25 }}
                        className="text-cream-100/70 max-w-md mb-8 leading-relaxed"
                    >
                        {subtitle}
                    </motion.p>

                    <FeatureList />

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className="mt-8 inline-flex items-center gap-2 text-xs text-cream-100/50"
                    >
                        <span className="text-gold-500">✦</span>
                        <span>People are asking about</span>
                        <span className="relative inline-block min-w-[9rem] h-4">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={useCaseIndex}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute left-0 top-0 text-gold-400 font-medium"
                                >
                                    {ROTATING_USE_CASES[useCaseIndex]}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="relative border-t border-white/10 pt-6 flex items-start gap-3 text-xs text-cream-100/45"
                >
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <p>
                        <strong className="text-cream-100/70">NyayMitra is an AI assistant, not a law firm.</strong>{" "}
                        Guidance here is informational and does not replace advice from a licensed advocate.
                    </p>
                </motion.div>
            </div>

            {/* Right panel — the actual form */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
                <ThemeToggle className="fixed top-5 right-5 z-10" />
                <div className="w-full max-w-md">{children}</div>
            </div>
        </div>
    );
}
