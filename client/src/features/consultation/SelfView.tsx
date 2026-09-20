import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";

interface Props {
  stream: MediaStream | null;
  name: string;
  muted: boolean;
  speaking: boolean;
  level: number;
  /** Position and size, supplied by the caller (e.g. "absolute right-3 top-14 w-36 h-44"). */
  className?: string;
}

// Your own picture-in-picture tile. With the camera on it shows the mirrored
// video (local only); with it off, your initial. A ring pulses when you speak.
export default function SelfView({ stream, name, muted, speaking, level, className = "" }: Props) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) void v.play().catch(() => undefined);
  }, [stream]);

  return (
    // The outer box is positioned by the caller; the inner one fills it, so the
    // two never fight over `position`.
    <div className={className}>
      <div
        className="relative h-full w-full overflow-hidden rounded-xl bg-navy-800 border border-white/15 shadow-lg transition-shadow duration-100 motion-reduce:transition-none"
        style={{
          boxShadow: speaking ? `0 0 0 ${2 + Math.round(level * 6)}px rgba(212,175,97,${0.35 + level * 0.4})` : undefined,
        }}
      >
        {stream ? (
          <video
            ref={video}
            muted
            playsInline
            autoPlay
            aria-label="Your camera (visible only to you)"
            className="h-full w-full object-cover -scale-x-100"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="w-12 h-12 rounded-full bg-gold-500 text-navy-950 font-bold text-lg flex items-center justify-center">
              {name.charAt(0).toUpperCase() || "Y"}
            </span>
          </div>
        )}
        <div className="absolute left-1.5 bottom-1.5 right-1.5 flex items-center gap-1.5">
          <p className="text-[11px] font-semibold text-white bg-black/45 rounded px-1.5 py-0.5 truncate">You</p>
          {muted && (
            <span className="ml-auto bg-maroon-700 text-white rounded-full p-1" aria-label="Microphone muted">
              <MicOff size={11} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
