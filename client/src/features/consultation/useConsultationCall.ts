import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage, consultationApi, type Consultation, type Turn } from "./consultationApi";
import { watchLevel } from "./audioLevel";

export type CallPhase = "idle" | "requesting-mic" | "connecting" | "live" | "ending" | "ended" | "error";

const micErrorMessage = (err: any): string => {
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser can't use the microphone here. Open the app over HTTPS (or localhost) in a current browser.";
  }
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.";
    case "NotFoundError":
      return "No microphone was found. Connect one and try again.";
    case "NotReadableError":
      return "Your microphone is being used by another app. Close it and try again.";
    default:
      return "Could not start the microphone.";
  }
};

// Waits for the browser to finish collecting network candidates, so the offer
// sent to the server is complete (there is no trickle-ICE path to the server).
const iceGatheringDone = (pc: RTCPeerConnection, timeoutMs = 3000) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => pc.iceGatheringState === "complete" && done();
    pc.addEventListener("icegatheringstatechange", check);
    window.setTimeout(done, timeoutMs);
  });

// Owns one live call: microphone, the WebRTC connection to the advocate,
// speaking levels, the countdown, and the transcript (polled from the server,
// which records it authoritatively). Everything is torn down on hang-up,
// failure, a server-side end, or leaving the page.
export function useConsultationCall(consultationId: number, onEnded?: (c: Consultation) => void) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [advocateLevel, setAdvocateLevel] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [limitSec, setLimitSec] = useState<number | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopWatchers = useRef<(() => void)[]>([]);
  const timers = useRef<number[]>([]);
  const lastTurnId = useRef(0);
  const phaseRef = useRef<CallPhase>("idle");
  const mounted = useRef(true);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const changePhase = (p: CallPhase) => {
    phaseRef.current = p;
    if (mounted.current) setPhase(p);
  };

  const teardown = useCallback(() => {
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
    stopWatchers.current.forEach((stop) => stop());
    stopWatchers.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    if (mounted.current) {
      setMicLevel(0);
      setAdvocateLevel(0);
    }
  }, []);

  const fetchNewTurns = useCallback(async () => {
    try {
      const fresh = await consultationApi.turns(consultationId, lastTurnId.current);
      if (fresh.length && mounted.current) {
        lastTurnId.current = fresh[fresh.length - 1].id;
        setTurns((prev) => [...prev, ...fresh]);
      }
    } catch {
      /* a missed poll is retried on the next tick */
    }
  }, [consultationId]);

  const finish = useCallback(
    async (fetchFinal: () => Promise<Consultation>) => {
      teardown();
      changePhase("ending");
      try {
        const c = await fetchFinal();
        await fetchNewTurns();
        changePhase("ended");
        onEndedRef.current?.(c);
      } catch (err) {
        if (mounted.current) setError(apiErrorMessage(err, "Could not end the call cleanly."));
        changePhase("error");
      }
    },
    [teardown, fetchNewTurns]
  );

  const start = useCallback(async () => {
    if (!["idle", "error"].includes(phaseRef.current)) return;
    setError(null);
    changePhase("requesting-mic");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      setError(micErrorMessage(err));
      changePhase("error");
      return;
    }
    streamRef.current = stream;
    changePhase("connecting");

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.createDataChannel("oai-events");

      // Created inside the click that started the call, so the browser allows playback.
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        stopWatchers.current.push(watchLevel(e.streams[0], setAdvocateLevel));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" && phaseRef.current === "live") {
          setError("The connection to the advocate was lost.");
          void finish(() => consultationApi.end(consultationId));
        }
      };

      await pc.setLocalDescription(await pc.createOffer());
      await iceGatheringDone(pc);
      const res = await consultationApi.connect(consultationId, pc.localDescription!.sdp);
      await pc.setRemoteDescription({ type: "answer", sdp: res.answer });

      const connectedAt = Date.now();
      setLimitSec(res.limitSec);
      setElapsedSec(0);
      stopWatchers.current.push(watchLevel(stream, setMicLevel));
      changePhase("live");

      timers.current.push(window.setInterval(() => setElapsedSec((Date.now() - connectedAt) / 1000), 500));
      timers.current.push(window.setInterval(() => void fetchNewTurns(), 1500));
      // The server can end the call itself (time limit, long silence) — notice that.
      timers.current.push(
        window.setInterval(async () => {
          try {
            const c = await consultationApi.get(consultationId);
            if (c.status !== "LIVE" && phaseRef.current === "live") void finish(async () => c);
          } catch {
            /* transient */
          }
        }, 4000)
      );
    } catch (err) {
      teardown();
      setError(apiErrorMessage(err, "Could not start the call. Please try again."));
      changePhase("error");
    }
  }, [consultationId, fetchNewTurns, finish, teardown]);

  const hangup = useCallback(() => {
    if (phaseRef.current !== "live" && phaseRef.current !== "connecting") return;
    void finish(() => consultationApi.end(consultationId));
  }, [consultationId, finish]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  // Leaving the page mid-call ends the call, so it never keeps running (and billing) unseen.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const wasLive = phaseRef.current === "live" || phaseRef.current === "connecting";
      teardown();
      if (wasLive) void consultationApi.end(consultationId).catch(() => undefined);
    };
  }, [consultationId, teardown]);

  return { phase, error, muted, turns, micLevel, advocateLevel, elapsedSec, limitSec, start, hangup, toggleMute };
}
