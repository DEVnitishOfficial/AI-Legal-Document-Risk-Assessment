import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Upload, Sparkles } from "lucide-react";

const greetingFor = (hour: number) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function WelcomeHeader() {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 px-6 py-5">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 shrink-0 rounded-full bg-gold-500 text-navy-950 font-bold text-lg flex items-center justify-center border-2 border-gold-400">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-medium truncate">
            {greetingFor(new Date().getHours())}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-cream-100/50 mt-0.5">
            Welcome to your NyayMitra dashboard — here's everything in your workspace.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => navigate("/documents")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-cream-200 dark:border-white/15 hover:border-gold-500 dark:hover:border-gold-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          <Upload size={15} /> Upload
        </button>
        <button
          onClick={() => navigate("/legal-assistant?new=1")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-navy-900 text-cream-50 hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          <Sparkles size={15} /> New chat
        </button>
      </div>
    </div>
  );
}
