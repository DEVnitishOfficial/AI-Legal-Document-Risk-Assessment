export default function ResultPanel({ result }: any) {
  if (!result) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl">
        <p className="text-gray-400">Select a document to analyze</p>
      </div>
    );
  }

  const { summary, riskLevel, clauses, risks } = result;

  return (
    <div className="bg-gray-900 p-6 rounded-xl space-y-6">
      {/* Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Summary</h2>
        <p className="text-gray-300">{summary}</p>
      </div>

      {/* Risk */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Risk Level</h2>
        <span
          className={`px-3 py-1 rounded ${
            riskLevel === "High"
              ? "bg-red-600"
              : riskLevel === "Medium"
              ? "bg-yellow-500"
              : "bg-green-600"
          }`}
        >
          {riskLevel}
        </span>
      </div>

      {/* Clauses */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Important Clauses</h2>
        <ul className="list-disc pl-5 text-gray-300">
          {clauses?.map((c: string, i: number) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      {/* Risks */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Risk Insights</h2>
        <ul className="list-disc pl-5 text-red-300">
          {risks?.map((r: string, i: number) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}