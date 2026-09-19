import type { LucideIcon } from "lucide-react";
import { FileText, MessageSquare, ShieldAlert, Star } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | null;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile. */
  tone: string;
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 px-5 py-4">
      <div>
        <p className="text-xs text-gray-500 dark:text-cream-100/50">{label}</p>
        <p className="font-mono text-2xl tabular-nums mt-1">{value ?? "–"}</p>
      </div>
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon size={19} />
      </span>
    </div>
  );
}

interface StatCardsProps {
  documents: any[];
  chats: any[];
  loading: boolean;
}

export default function StatCards({ documents, chats, loading }: StatCardsProps) {
  const highRisk = documents.filter((d) => d.analysis?.riskLevel === "High").length;
  const favorites = documents.filter((d) => d.isFavorite).length;
  const v = (n: number) => (loading ? null : n);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Documents" value={v(documents.length)} icon={FileText} tone="bg-cream-100 text-navy-800 dark:bg-navy-800 dark:text-cream-100" />
      <StatCard label="Chats" value={v(chats.length)} icon={MessageSquare} tone="bg-gold-500/10 text-gold-600 dark:text-gold-400" />
      <StatCard label="High-risk documents" value={v(highRisk)} icon={ShieldAlert} tone="bg-risk-high-bg text-risk-high-fg dark:bg-risk-high-bg-dark dark:text-risk-high-fg-dark" />
      <StatCard label="Favorites" value={v(favorites)} icon={Star} tone="bg-risk-med-bg text-risk-med-fg dark:bg-risk-med-bg-dark dark:text-risk-med-fg-dark" />
    </div>
  );
}
