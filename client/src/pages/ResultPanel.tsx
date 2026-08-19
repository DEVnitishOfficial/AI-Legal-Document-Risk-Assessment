const RISK_LEVEL_BADGE: Record<string, string> = {
  High: "bg-red-600 text-white",
  Medium: "bg-yellow-500 text-black",
  Low: "bg-green-600 text-white",
};

const SEVERITY_BORDER: Record<string, string> = {
  High: "border-red-600",
  Medium: "border-yellow-500",
  Low: "border-green-600",
};

export default function ResultPanel({ result, analyzing }: any) {
  if (analyzing) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl flex items-center justify-center h-full min-h-[200px]">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          Analyzing document with AI…
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl h-full">
        <p className="text-gray-500 dark:text-gray-400">Select a document to analyze</p>
      </div>
    );
  }

  const { summary, riskLevel, riskScore, clauses, riskItems } = result;
  const badgeClass = RISK_LEVEL_BADGE[riskLevel] || "bg-gray-600 text-white";

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl space-y-6 h-full min-h-0 overflow-y-auto text-gray-900 dark:text-white">
      {/* Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Summary</h2>
        <p className="text-gray-700 dark:text-gray-300">{summary}</p>
      </div>

      {/* Risk */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Risk Level</h2>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded font-medium ${badgeClass}`}>
            {riskLevel}
          </span>
          {typeof riskScore === "number" && (
            <div className="flex-1 max-w-[160px] h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full ${badgeClass}`} style={{ width: `${riskScore}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Clauses */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Important Clauses</h2>
        {clauses?.length ? (
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            {clauses.map((c: string, i: number) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No clauses identified.</p>
        )}
      </div>

      {/* Risk Insights */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Risk Insights</h2>
        {riskItems?.length ? (
          <div className="space-y-3">
            {riskItems.map((item: any, i: number) => (
              <div
                key={i}
                className={`bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-transparent border-l-4 ${
                  SEVERITY_BORDER[item.severity] || "border-gray-400 dark:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      RISK_LEVEL_BADGE[item.severity] || "bg-gray-600 text-white"
                    }`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
                  {item.clause}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No risk insights identified.</p>
        )}
      </div>
    </div>
  );
}
