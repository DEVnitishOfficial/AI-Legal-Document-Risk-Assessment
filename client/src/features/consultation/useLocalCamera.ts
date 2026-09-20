import { useCallback, useEffect, useRef, useState } from "react";

const cameraErrorMessage = (err: any): string => {
  if (!navigator.mediaDevices?.getUserMedia) return "This browser can't use the camera here.";
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. That's fine — you can carry on without it, or allow it in your browser settings.";
    case "NotFoundError":
      return "No camera was found. You can carry on without it.";
    case "NotReadableError":
      return "Your camera is being used by another app.";
    default:
      return "Could not start the camera. You can carry on without it.";
  }
};

// The user's own camera, for a self-view only. The video is never added to the
// call and never leaves the browser: the advocate is an AI that doesn't use
// video, so there is nothing to send — this just makes the call feel like one.
export function useLocalCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<MediaStream | null>(null);
  const mounted = useRef(true);

  const stop = useCallback(() => {
    ref.current?.getTracks().forEach((t) => t.stop());
    ref.current = null;
    if (mounted.current) setStream(null);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (ref.current) return true;
    setBusy(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!mounted.current) {
        s.getTracks().forEach((t) => t.stop());
        return false;
      }
      ref.current = s;
      setStream(s);
      return true;
    } catch (err) {
      if (mounted.current) setError(cameraErrorMessage(err));
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, []);

  const toggle = useCallback(() => (ref.current ? stop() : void start()), [start, stop]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ref.current?.getTracks().forEach((t) => t.stop());
      ref.current = null;
    };
  }, []);

  return { stream, on: !!stream, error, busy, start, stop, toggle };
}
