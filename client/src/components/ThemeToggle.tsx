import { Sun, Moon } from "lucide-react";
import { useTheme } from "../app/ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={`p-2 rounded-lg bg-cream-100 text-navy-800 hover:bg-cream-200 dark:bg-navy-800 dark:text-gold-400 dark:hover:bg-navy-700 transition-colors ${className}`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
