import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  Landmark,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  FileWarning,
  UploadCloud,
  ScanSearch,
  MessagesSquare,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const IPC_BNS_MAPPINGS = [
  { old: "IPC 420", next: "BNS 318", label: "Cheating" },
  { old: "IPC 503/506", next: "BNS 351", label: "Criminal intimidation" },
  { old: "CrPC 438", next: "BNSS 482", label: "Anticipatory bail" },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    icon: UploadCloud,
    title: "Upload or paste",
    body: "Drop in a PDF lease, FIR, or legal notice — or just paste the text. No formatting cleanup needed. Your document stays in your private case file.",
  },
  {
    num: "02",
    icon: ScanSearch,
    title: "AI reads every clause",
    body: "Each clause is scored for risk, mapped to the IPC/BNS or CrPC/BNSS section that applies, and explained in plain language — so you know what to push back on before you sign.",
  },
  {
    num: "03",
    icon: MessagesSquare,
    title: "Ask anything",
    body: "Follow-up questions stay attached to the same case file. Ask in English or Hindi, by typing or by voice, and get answers grounded in the actual law with sources cited.",
  },
];

// Tailwind's `md` breakpoint. The pinned scroll effect is desktop-only; on
// smaller screens sections just scroll normally.
function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === "undefined" || window.innerWidth >= breakpoint
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isDesktop;
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50 font-body">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-11 py-5 border-b border-cream-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full border border-dashed border-gold-600 dark:border-gold-500 flex items-center justify-center text-gold-600 dark:text-gold-400">
            <Landmark size={15} />
          </span>
          <span className="font-display text-lg font-medium">NyayMitra AI</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            className="hidden sm:inline text-sm font-medium text-gray-600 dark:text-cream-100/60 hover:text-navy-950 dark:hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Get Started
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <header className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center px-6 md:px-11 pt-14 pb-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase text-gold-600 dark:text-gold-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-500" />
            </span>
            Plain-language legal AI for India
          </span>

          <h1 className="font-display text-4xl md:text-5xl lg:text-[3.4rem] leading-[1.08] font-medium mt-5 mb-6 text-balance">
            The clause you didn't read<br />
            is the one that <em className="italic text-gold-600 dark:text-gold-400 font-medium">hurts most.</em>
          </h1>

          <p className="text-[17px] leading-relaxed text-gray-600 dark:text-cream-100/65 max-w-[46ch] mb-8">
            Upload a lease, notice, or contract. NyayMitra reads every clause, flags what's risky
            in plain language, and maps it to the exact IPC/BNS or CrPC/BNSS section that applies.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 mb-8">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 font-semibold px-6 py-3.5 rounded-lg transition-all active:scale-[0.98]"
            >
              Open a case file <ArrowRight size={17} />
            </Link>
            <a
              href="#preview"
              className="font-semibold text-sm px-5 py-3.5 rounded-lg border border-cream-200 dark:border-white/15 hover:border-gold-500 dark:hover:border-gold-500 transition-colors"
            >
              See it in action
            </a>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-cream-100/40">
            <span>◆ Not a law firm — informational guidance only</span>
            <span>◆ English &amp; Hindi</span>
          </div>
        </motion.div>

        {/* Hero visual: a real-looking risk report */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative bg-navy-950 rounded-2xl p-6 shadow-2xl shadow-navy-950/30 overflow-hidden"
        >
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gold-500/20 blur-3xl pointer-events-none" />
          <p className="relative text-cream-50 text-sm font-semibold mb-0.5">Residential_Lease_Agreement.pdf</p>
          <p className="relative text-cream-100/40 text-xs mb-5">Rental Agreement · analyzed in 6s</p>

          <div className="relative flex items-baseline gap-2.5 mb-3">
            <span className="font-mono text-4xl text-gold-400 tabular-nums">90</span>
            <span className="text-cream-100/40 text-xs">/ 100 risk score · High</span>
          </div>
          <div className="relative h-1.5 bg-navy-700 rounded-full overflow-hidden mb-6">
            <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-maroon-700 to-[#c0433f]" />
          </div>

          <div className="relative space-y-0 divide-y divide-white/5">
            {[
              { sev: "h", label: "Termination", body: "landlord may end the lease with 24 hrs' notice, no cause required" },
              { sev: "h", label: "Deposit", body: "full forfeiture for any violation, however minor" },
              { sev: "m", label: "Rent", body: "revisable anytime on 7 days' notice" },
            ].map((c) => (
              <div key={c.label} className="flex gap-2.5 py-3 first:pt-0 last:pb-0">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${c.sev === "h" ? "bg-[#e0685f]" : "bg-gold-500"}`} />
                <p className="text-[13px] leading-relaxed text-cream-100/75">
                  <b className="text-white font-semibold">{c.label} — </b>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </header>

      {/* Feature previews — the real product, no login wall */}
      <FeaturePreview />

      {/* IPC/BNS mapping strip */}
      <section className="px-6 md:px-11 pb-16 md:pb-20">
        <div className="max-w-xl mx-auto text-center mb-8">
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-gold-600 dark:text-gold-400">
            Old code, new code — tracked automatically
          </span>
          <h2 className="font-display text-[22px] font-medium mt-3 text-balance">
            India recodified its criminal law in 2024. We kept up.
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3.5 max-w-3xl mx-auto">
          {IPC_BNS_MAPPINGS.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 text-sm"
            >
              <span className="font-mono text-xs text-gray-400 dark:text-cream-100/35">{m.old}</span>
              <ArrowRight size={13} className="text-gold-600 dark:text-gold-400" />
              <span className="font-mono text-xs font-semibold">{m.next}</span>
              <span className="text-xs text-gray-400 dark:text-cream-100/35">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-navy-950 text-cream-50 px-6 md:px-11 py-16 md:py-20">
        <div className="max-w-xl mx-auto text-center mb-12">
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-gold-400">How it works</span>
          <h2 className="font-display text-3xl font-medium mt-3 text-balance">Three steps, no legalese.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.num}
              className="bg-white/[0.04] border border-white/10 hover:border-gold-500/40 rounded-xl p-6 transition-colors"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-400">
                  <s.icon size={19} />
                </span>
                <span className="font-mono text-xs text-gold-500">Step {s.num}</span>
              </div>
              <h3 className="text-[17px] font-semibold mb-2">{s.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-cream-100/55">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center px-6 py-20">
        <h2 className="font-display text-[32px] font-medium max-w-[20ch] mx-auto mb-7 text-balance">
          Your next document deserves a second read.
        </h2>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 font-semibold px-7 py-3.5 rounded-lg transition-all active:scale-[0.98]"
        >
          Open a case file <ArrowRight size={17} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 md:px-11 py-6 border-t border-cream-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full border border-dashed border-gold-600 dark:border-gold-500 flex items-center justify-center text-gold-600 dark:text-gold-400">
            <Landmark size={12} />
          </span>
          <span className="font-display text-[15px] font-medium">NyayMitra AI</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-cream-100/35 max-w-[60ch] text-center sm:text-right">
          NyayMitra is an AI assistant, not a law firm. Guidance is informational and does not replace advice
          from a licensed advocate.
        </p>
      </footer>
    </div>
  );
}

function RiskReportCard() {
  return (
    <div className="h-full bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 dark:border-white/10">
        <span className="flex items-center gap-2 font-semibold text-[14.5px]">
          <FileWarning size={16} className="text-gold-600 dark:text-gold-400" />
          Risk report — Residential Lease
        </span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-risk-high-bg text-risk-high-fg dark:bg-risk-high-bg-dark dark:text-risk-high-fg-dark">
          High risk
        </span>
      </div>
      <div className="px-5 py-4 flex-1 space-y-4">
        <div>
          <span className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-cream-100/35 mb-1">Security deposit</span>
          <p className="text-[13.5px] italic mb-1 leading-relaxed">"Tenant forfeits full security deposit for any lease violation, however minor."</p>
          <p className="text-[12.5px] text-gray-500 dark:text-cream-100/50 leading-relaxed">
            Deductions should be proportionate to actual damage under most state rent-control norms — full
            forfeiture for a minor breach is unusually one-sided.
          </p>
        </div>
        <div className="pt-4 border-t border-cream-200 dark:border-white/10">
          <span className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-cream-100/35 mb-1">Termination</span>
          <p className="text-[13.5px] italic mb-1 leading-relaxed">"Landlord may terminate this agreement without cause upon 24 hours' notice."</p>
          <p className="text-[12.5px] text-gray-500 dark:text-cream-100/50 leading-relaxed">
            A 24-hour no-cause termination clause is highly unfavorable and would typically need
            renegotiation before signing.
          </p>
        </div>
      </div>
      <div className="px-5 py-3.5 bg-cream-100 dark:bg-navy-800 border-t border-cream-200 dark:border-white/10 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-cream-100/50">Your lease might read differently.</span>
        <Link to="/register" className="font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1 shrink-0">
          Analyze it free <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function LegalAssistantCard() {
  return (
    <div className="h-full bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 dark:border-white/10">
        <span className="flex items-center gap-2 font-semibold text-[14.5px]">
          <MessageSquare size={16} className="text-gold-600 dark:text-gold-400" />
          Legal Assistant
        </span>
        <span className="font-mono text-[10.5px] tracking-wide bg-maroon-700 text-cream-50 px-2 py-0.5 rounded">EN</span>
      </div>
      <div className="px-5 py-4 flex-1">
        <div className="flex justify-end mb-3">
          <p className="max-w-[85%] bg-cream-100 dark:bg-navy-800 rounded-xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-relaxed">
            A relative filed a false case against me out of jealousy. I'm scared of being arrested.
          </p>
        </div>
        <div className="flex">
          <div className="max-w-[90%] bg-navy-950 text-cream-100 rounded-xl rounded-bl-sm px-3.5 py-2.5">
            <p className="text-[13px] leading-relaxed">
              You may be able to apply for anticipatory bail under BNSS Section 482 (formerly CrPC 438)
              before any arrest happens — the Sessions Court or High Court can grant protection with
              conditions.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2.5 font-mono text-[10.5px] bg-gold-500/15 text-gold-400 px-2 py-1 rounded">
              <ShieldCheck size={11} /> Sushila Aggarwal vs State (NCT of Delhi), 2020
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 py-3.5 bg-cream-100 dark:bg-navy-800 border-t border-cream-200 dark:border-white/10 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-cream-100/50">Have a situation of your own?</span>
        <Link to="/register" className="font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1 shrink-0">
          Ask NyayMitra <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function FeaturePreviewHeading() {
  return (
    <div className="max-w-xl mx-auto text-center mb-10">
      <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-gold-600 dark:text-gold-400">
        See the product
      </span>
      <h2 className="font-display text-3xl font-medium mt-3 mb-3 text-balance">Every feature, in the open.</h2>
      <p className="text-gray-600 dark:text-cream-100/55 text-[15px] leading-relaxed">
        No sign-up wall on the demo — try the real thing once you're ready to analyze your own documents.
      </p>
    </div>
  );
}

// Desktop: the section is pinned to the viewport while the two cards slide in
// from opposite sides, driven by scroll progress through the pinned range.
// Mobile / reduced-motion: plain section that scrolls normally.
function FeaturePreview() {
  const isDesktop = useIsDesktop();
  const reducedMotion = useReducedMotion();
  const pinRef = useRef<HTMLElement>(null);

  // "start start" → "end end" spans exactly the pinned distance (section
  // height minus one viewport), so progress hits 1 the moment it unpins.
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });
  const leftX = useTransform(scrollYProgress, [0, 0.7], ["-60vw", "0vw"]);
  const rightX = useTransform(scrollYProgress, [0, 0.7], ["60vw", "0vw"]);

  if (!isDesktop || reducedMotion) {
    return (
      <section id="preview" className="px-6 md:px-11 py-16 md:py-20 border-t border-cream-200 dark:border-white/10">
        <FeaturePreviewHeading />
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <RiskReportCard />
          <LegalAssistantCard />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={pinRef}
      className="relative border-t border-cream-200 dark:border-white/10"
      style={{ height: "160vh" }}
    >
      {/* Anchor for "See it in action": lands with the cards already in place */}
      <span id="preview" className="absolute left-0 w-px h-px" style={{ top: "45%" }} />

      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center px-11">
        <FeaturePreviewHeading />
        <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
          <motion.div style={{ x: leftX }}>
            <RiskReportCard />
          </motion.div>
          <motion.div style={{ x: rightX }}>
            <LegalAssistantCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
