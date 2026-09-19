import { RISK_LEVEL_BADGE } from "../features/document/riskStyles";

const RISK_BAR_FILL: Record<string, string> = {
  High: "bg-gradient-to-r from-maroon-700 to-[#c0433f]",
  Medium: "bg-gradient-to-r from-gold-600 to-gold-400",
  Low: "bg-gradient-to-r from-[#2f5240] to-risk-low-fg",
};

const SEVERITY_BORDER: Record<string, string> = {
  High: "border-l-risk-high-fg dark:border-l-risk-high-fg-dark",
  Medium: "border-l-risk-med-fg dark:border-l-risk-med-fg-dark",
  Low: "border-l-risk-low-fg dark:border-l-risk-low-fg-dark",
};

export default function ResultPanel({ result, analyzing }: any) {
  if (analyzing) {
    return (
      <div className="bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 p-6 rounded-xl flex items-center justify-center h-full min-h-[200px]">
        <p className="text-gray-400 dark:text-cream-100/40 animate-pulse text-sm font-medium">
          Analyzing document with AI…
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 p-6 rounded-xl h-full flex items-center justify-center">
        <p className="text-gray-400 dark:text-cream-100/40 text-sm">Select a document to analyze</p>
      </div>
    );
  }

  const { summary, riskLevel, riskScore, clauses, riskItems } = result;
  const badgeClass = RISK_LEVEL_BADGE[riskLevel] || "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50";
  const barFill = RISK_BAR_FILL[riskLevel] || "bg-gray-400";

  return (
    <div className="bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 p-6 rounded-xl space-y-6 h-full min-h-0 overflow-y-auto text-navy-950 dark:text-cream-50">
      {/* Risk */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-cream-100/40">Risk score</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{riskLevel} risk</span>
        </div>
        {typeof riskScore === "number" && (
          <>
            <div className="font-mono text-2xl tabular-nums mb-2">{riskScore}<span className="text-sm text-gray-400 dark:text-cream-100/40"> / 100</span></div>
            <div className="h-2 bg-cream-100 dark:bg-navy-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barFill}`} style={{ width: `${riskScore}%` }} />
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="font-display italic text-[15px] leading-relaxed bg-cream-50 dark:bg-navy-800 rounded-lg px-4 py-3.5 border-l-2 border-gold-500">
          "{summary}"
        </p>
      )}

      {/* Clauses */}
      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-cream-100/40 mb-2">Important Clauses</h2>
        {clauses?.length ? (
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-cream-100/60">
            {clauses.map((c: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-gold-600 dark:text-gold-400 shrink-0">—</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 dark:text-cream-100/40 text-sm">No clauses identified.</p>
        )}
      </div>

      {/* Risk Insights */}
      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-cream-100/40 mb-2">Flagged Clauses</h2>
        {riskItems?.length ? (
          <div className="space-y-2.5">
            {riskItems.map((item: any, i: number) => (
              <div
                key={i}
                className={`bg-cream-50 dark:bg-navy-800 rounded-lg p-3.5 border-l-4 ${
                  SEVERITY_BORDER[item.severity] || "border-l-gray-300 dark:border-l-navy-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${RISK_LEVEL_BADGE[item.severity] || "bg-cream-100 text-gray-500"}`}>
                    {item.severity}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cream-100 text-gray-500 dark:bg-navy-700 dark:text-cream-100/50 font-medium">
                    {item.category}
                  </span>
                </div>
                <p className="text-[13.5px] italic mb-1 leading-relaxed">"{item.clause}"</p>
                <p className="text-[12.5px] text-gray-500 dark:text-cream-100/50 leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-cream-100/40 text-sm">No risk insights identified.</p>
        )}
      </div>
    </div>
  );
}
