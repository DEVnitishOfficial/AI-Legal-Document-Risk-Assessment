import { motion } from "framer-motion";

interface CaseFileCardProps {
    fileTag: string;
    children: React.ReactNode;
}

// The "case file" card: a ribbon/seal tab in the corner + a small file-number
// tag, styled like a physical document folder. Purely decorative flavor
// that reinforces the legal-document theme without needing any image assets.
export default function CaseFileCard({ fileTag, children }: CaseFileCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 rounded-2xl shadow-[0_24px_70px_-20px_rgba(16,24,44,0.25)] dark:shadow-[0_24px_70px_-20px_rgba(0,0,0,0.6)] px-7 py-9 sm:px-10 sm:py-10"
        >
            <div className="absolute -top-1.5 left-8 w-8 h-11 bg-maroon-700 dark:bg-maroon-800 rounded-b-sm shadow-md">
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gold-400" />
            </div>

            <div className="flex justify-end mb-5">
                <span className="text-[10px] tracking-[0.15em] uppercase font-mono text-gray-400 dark:text-cream-100/40">
                    {fileTag}
                </span>
            </div>

            {children}
        </motion.div>
    );
}
