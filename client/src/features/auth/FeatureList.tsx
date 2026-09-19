import { motion } from "framer-motion";

const FEATURES = [
    "Document analysis — FIRs, notices, contracts, orders",
    "Plain-language mapping to IPC / CrPC / BNS sections",
    "Step-by-step guidance on what to do next",
    "Referral to a licensed advocate when it matters",
];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } },
};

const item = {
    hidden: { opacity: 0, x: -14 },
    show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function FeatureList() {
    return (
        <motion.ul variants={container} initial="hidden" animate="show" className="space-y-3">
            {FEATURES.map((feature, i) => (
                <motion.li key={feature} variants={item} className="flex items-center gap-3 text-sm text-cream-100/75">
                    <span className="w-7 h-7 rounded border border-gold-500/30 flex items-center justify-center text-[10px] font-mono text-gold-400 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                    </span>
                    {feature}
                </motion.li>
            ))}
        </motion.ul>
    );
}
