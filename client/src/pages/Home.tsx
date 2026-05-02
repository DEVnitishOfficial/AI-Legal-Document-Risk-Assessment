import { Link } from "react-router-dom";
import { ShieldCheck, FileText, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <div className="flex justify-between items-center px-10 py-5">
        <h1 className="text-xl font-bold">LegalAI</h1>
        <div className="space-x-4">
          <Link to="/login" className="text-gray-300 hover:text-white">
            Login
          </Link>
          <Link
            to="/register"
            className="bg-purple-600 px-4 py-2 rounded-lg"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
        <h1 className="text-5xl font-bold mb-6">
          Understand Legal Documents Instantly
        </h1>
        <p className="text-gray-400 max-w-xl mb-8">
          Upload contracts or paste terms & conditions. Get summaries,
          risk analysis, and simplified explanations powered by AI.
        </p>

        <Link
          to="/register"
          className="bg-purple-600 px-6 py-3 rounded-lg text-lg"
        >
          Start Analyzing
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-6 px-10 pb-10">
        <Feature icon={<FileText />} title="Summarize Documents" />
        <Feature icon={<ShieldCheck />} title="Risk Detection" />
        <Feature icon={<Zap />} title="Instant AI Analysis" />
      </div>
    </div>
  );
}

function Feature({ icon, title }: any) {
  return (
    <div className="bg-gray-900 p-6 rounded-xl flex flex-col items-center">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
    </div>
  );
}