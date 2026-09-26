import { useEffect, useState } from "react";

// A short two-note chime made with the Web Audio API (no sound file needed).
export function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.45);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* audio may be blocked until the page has been interacted with */
  }
}

export const notificationsSupported = () => typeof Notification !== "undefined";

export async function askNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

// A desktop notification, only when the desk is not the page being looked at.
export function desktopNotify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted" || !document.hidden) return;
  try {
    const n = new Notification(title, { body, tag: "nyaymitra-request" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

// Re-renders every `ms` so countdowns stay current.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
