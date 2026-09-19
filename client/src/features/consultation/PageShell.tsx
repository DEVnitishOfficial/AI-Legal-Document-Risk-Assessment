import Sidebar from "../../components/layout/Sidebar";

// Same frame as the other app pages (sidebar + scrolling content), with print
// rules so "Print / save PDF" outputs the whole page instead of one screen.
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50 print:block print:h-auto">
      <div className="contents print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-0 min-w-0 print:block">
        {/* The mobile menu button is fixed at the top-left, so small screens get room for it. */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-14 md:pt-0 print:overflow-visible print:pt-0">{children}</div>
      </div>
    </div>
  );
}
