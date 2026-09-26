import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { ConsultationOptions, PublicAdvocate } from "./consultationApi";
import { watchLevel } from "./audioLevel";
import { useLocalCamera } from "./useLocalCamera";
import SelfView from "./SelfView";

interface Props {
  advocate: PublicAdvocate;
  options: ConsultationOptions;
  busy: boolean;
  error: string | null;
  onJoin: (choice: { state: string; language: string; camera: boolean; subject: string }) => void;
  /** "human": a request to a real advocate (asks what it is about; different notice). */
  mode?: "ai" | "human";
}

const fieldClass =
  "w-full rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-navy-950 px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

// Pre-join screen: where the matter is, which language, a real microphone
// test, and the consent the server insists on before any call is created.
export default function LobbyPanel({ advocate, options, busy, error, onJoin, mode = "ai" }: Props) {
  const human = mode === "human";
  const [subject, setSubject] = useState("");
  const [state, setState] = useState("IN");
  const [language, setLanguage] = useState("en");
  const [consent, setConsent] = useState(false);

  const camera = useLocalCamera();

  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopWatch = useRef<(() => void) | null>(null);

  const stopTest = () => {
    stopWatch.current?.();
    stopWatch.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTesting(false);
    setLevel(0);
  };

  useEffect(() => stopTest, []);

  const startTest = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setTesting(true);
      stopWatch.current = watchLevel(stream, (l) => {
        setLevel(l);
        if (l > 0.25) setHeard(true);
      });
    } catch (err: any) {
      setMicError(
        !navigator.mediaDevices?.getUserMedia
          ? "This browser can't use the microphone here. Use HTTPS (or localhost) in a current browser."
          : err?.name === "NotFoundError"
            ? "No microphone was found."
            : "Microphone access was blocked. Allow it in your browser settings and try again."
      );
    }
  };

  const minutesLeft = Math.floor(options.remainingSeconds / 60);
  const outOfMinutes = options.remainingSeconds < 60;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    stopTest();
    const wantsCamera = camera.on;
    camera.stop(); // released here; the call room turns it back on
    onJoin({ state, language, camera: wantsCamera, subject: subject.trim() });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="c-state" className="block text-[13px] font-medium mb-1.5">
            Which state is this matter in?
          </label>
          <select id="c-state" value={state} onChange={(e) => setState(e.target.value)} className={fieldClass}>
            {options.states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-gray-500 dark:text-cream-100/50 mt-1.5">
            {human
              ? "The advocate sees this, so they know whether they can help."
              : "Only central law is loaded for now, so this helps the advocate flag where state rules may differ."}
          </p>
        </div>
        <div>
          <label htmlFor="c-lang" className="block text-[13px] font-medium mb-1.5">
            Language for the call
          </label>
          <select id="c-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldClass}>
            {options.languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {human && (
        <div>
          <label htmlFor="c-subject" className="block text-[13px] font-medium mb-1.5">
            What would you like to talk about?
          </label>
          <textarea
            id="c-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={600}
            rows={4}
            required
            placeholder="A sentence or two is enough — e.g. my landlord has not returned my security deposit."
            className={`${fieldClass} leading-relaxed`}
          />
          <p className="text-[12px] text-gray-500 dark:text-cream-100/50 mt-1.5">
            {subject.trim().length < 10
              ? "The advocate reads this before deciding whether to accept (at least 10 characters)."
              : `${600 - subject.length} characters left. Please don't include Aadhaar, PAN or bank details.`}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">Would you like to turn on your camera?</p>
            <p className="text-[12px] text-gray-500 dark:text-cream-100/50 mt-0.5 max-w-md">
              Optional — it makes the call feel like a real one. Only you see it: the advocate is an AI that doesn't use video,
              so nothing from your camera is sent or recorded.
            </p>
          </div>
          <button
            type="button"
            onClick={camera.toggle}
            disabled={camera.busy}
            aria-pressed={camera.on}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-cream-200 dark:border-white/15 px-3.5 py-2 text-sm font-medium hover:bg-cream-100 dark:hover:bg-navy-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            {camera.busy ? <Loader2 size={15} className="animate-spin" /> : camera.on ? <VideoOff size={15} /> : <Video size={15} />}
            {camera.on ? "Turn off" : "Turn on camera"}
          </button>
        </div>
        {camera.on && (
          <SelfView stream={camera.stream} name="You" muted={false} speaking={false} level={0} className="mt-3 w-full max-w-xs aspect-video" />
        )}
        {camera.error && (
          <p role="status" className="text-[12.5px] text-risk-med-fg dark:text-risk-med-fg-dark mt-2">
            {camera.error}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">Check your microphone</p>
            <p className="text-[12px] text-gray-500 dark:text-cream-100/50">Say a few words — the bar should move.</p>
          </div>
          <button
            type="button"
            onClick={testing ? stopTest : startTest}
            className="inline-flex items-center gap-2 rounded-lg border border-cream-200 dark:border-white/15 px-3.5 py-2 text-sm font-medium hover:bg-cream-100 dark:hover:bg-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            {testing ? <MicOff size={15} /> : <Mic size={15} />}
            {testing ? "Stop test" : "Test microphone"}
          </button>
        </div>
        <div
          className="mt-3 h-2.5 rounded-full bg-cream-100 dark:bg-navy-800 overflow-hidden"
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
        >
          <div className="h-full bg-gold-500 transition-[width] duration-75 motion-reduce:transition-none" style={{ width: `${level * 100}%` }} />
        </div>
        {heard && (
          <p className="flex items-center gap-1.5 text-[12.5px] text-risk-low-fg dark:text-risk-low-fg-dark mt-2">
            <CheckCircle2 size={13} /> We can hear you.
          </p>
        )}
        {micError && (
          <p role="alert" className="text-[12.5px] text-risk-high-fg dark:text-risk-high-fg-dark mt-2">
            {micError}
          </p>
        )}
      </div>

      <fieldset className="rounded-xl border border-cream-200 dark:border-white/10 bg-cream-100/60 dark:bg-navy-900 p-4">
        <legend className="px-1 text-[13px] font-medium">Before you join</legend>
        {human ? (
          <ul className="text-[13px] leading-relaxed text-gray-700 dark:text-cream-100/75 space-y-1.5 list-disc pl-5 mb-3">
            <li>
              You are asking to speak with <strong>{advocate.displayName}</strong>, a real advocate. They will see what you write above,
              your first name, your state and your language — not your email or phone number.
            </li>
            <li>
              The call is a private video call between your device and theirs. NyayMitra does not record it. The advocate may
              take notes, and can choose to share some of them with you afterwards.
            </li>
            <li>
              What you are told is the advocate's own guidance; NyayMitra is only the platform that connects you. Please don't
              share Aadhaar, PAN, bank or card numbers.
            </li>
          </ul>
        ) : (
          <ul className="text-[13px] leading-relaxed text-gray-700 dark:text-cream-100/75 space-y-1.5 list-disc pl-5 mb-3">
            <li>
              You will speak with <strong>{advocate.displayName}</strong>, an AI. It is not a human lawyer, cannot appear in
              court, and gives general legal information, not legal advice.
            </li>
            <li>
              Your voice is processed by OpenAI's speech service to run the call. NyayMitra saves a text transcript and a
              summary in your account; you can delete them at any time.
            </li>
            <li>Please don't share Aadhaar, PAN, bank or card numbers on the call.</li>
          </ul>
        )}
        <label className="flex items-start gap-2.5 text-[13.5px] cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-gold-500"
          />
          <span>
            {human
              ? "I understand this, and I agree to share what I wrote above with the advocate."
              : "I understand this, and I agree to the call being transcribed and saved."}
          </span>
        </label>
      </fieldset>

      {!human && (
        <p className="flex items-center gap-2 text-[12.5px] text-gray-500 dark:text-cream-100/50">
          <Clock size={14} />
          {outOfMinutes
            ? `You have used today's ${options.dailyMinutes} minutes of live consultation. Please come back tomorrow.`
            : `${minutesLeft} of your ${options.dailyMinutes} daily minutes are left.`}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!consent || busy || (!human && outOfMinutes) || (human && subject.trim().length < 10)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-6 py-3 transition-colors disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {human ? "Request consultation" : "Join consultation"}
      </button>
    </form>
  );
}
