export type OrbState = "connecting" | "listening" | "speaking" | "thinking";

interface Props {
  /** Loudness of the advocate's voice, 0..1 (already measured by the call hook). */
  level: number;
  state: OrbState;
  className?: string;
}

// The advocate's presence on the call stage: a robot icon in a gold-ringed disc
// whose rings swell with the actual voice, and three dots while it thinks.
export default function AdvocateOrb({ level, state, className = "" }: Props) {
  const speaking = state === "speaking";
  const l = speaking ? Math.min(1, level * 1.6) : 0;

  return (
    <div
      data-testid="advocate-orb"
      data-state={state}
      role="img"
      aria-label="NyayMitra AI Advocate"
      className={`flex flex-col items-center justify-center gap-6 ${className}`}
    >
      <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
        {/* rings that follow the voice */}
        {[1, 2].map((i) => (
          <span
            key={i}
            data-testid="orb-ring"
            className="absolute rounded-full border border-gold-500 transition-[transform,opacity] duration-100 motion-reduce:transition-none"
            style={{
              inset: `${i * 16}px`,
              transform: `scale(${1 + l * (0.16 - i * 0.04)})`,
              opacity: speaking ? 0.55 - i * 0.18 + l * 0.3 : 0.16,
            }}
          />
        ))}
        {/* soft glow */}
        <span
          className="absolute inset-10 rounded-full transition-opacity duration-150 motion-reduce:transition-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,97,0.5) 0%, rgba(212,175,97,0) 70%)",
            opacity: speaking ? 0.25 + l * 0.7 : state === "thinking" ? 0.3 : 0.12,
          }}
        />
        {/* core */}
        <span
          className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-navy-800 border-2 border-gold-500 text-gold-400 flex items-center justify-center transition-shadow duration-100 motion-reduce:transition-none ${
            state === "thinking" ? "motion-safe:animate-pulse" : ""
          }`}
          style={{ boxShadow: `0 0 ${18 + l * 46}px rgba(212,175,97,${0.22 + l * 0.5})` }}
        >
          <svg viewBox="0 0 24 24" className="w-16 h-16 sm:w-[72px] sm:h-[72px]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        </span>
      </div>

      <div className="h-3 flex items-center gap-1.5" aria-hidden>
        {state === "thinking" &&
          [0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-gold-500 motion-safe:animate-bounce"
              style={{ animationDelay: `${i * 140}ms` }}
            />
          ))}
      </div>
    </div>
  );
}
