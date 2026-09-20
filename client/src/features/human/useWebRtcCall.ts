import { useCallback, useEffect, useRef, useState } from "react";
import type { Hub } from "./hub";
import { apiErrorMessage, humanApi } from "./humanApi";
import { watchLevel } from "../consultation/audioLevel";

export type PeerCallPhase = "idle" | "starting" | "waiting-peer" | "connecting" | "live" | "ended" | "error";

interface Options {
  consultationId: number;
  role: "user" | "advocate";
  hub: Hub | null;
  /** Turn the camera on as the call starts (the choice made at check-in). */
  initialCamera?: boolean;
  onEnded?: (info: { reason: string; status: string }) => void;
}

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
    default:
      return "Could not start the microphone.";
  }
};

const cameraErrorMessage = (err: any): string =>
  err?.name === "NotAllowedError" || err?.name === "SecurityError"
    ? "Camera access was blocked. You can carry on with audio only."
    : err?.name === "NotFoundError"
      ? "No camera was found. You can carry on with audio only."
      : "Could not start the camera. You can carry on with audio only.";

// One call between two people, browser to browser. The server only introduces them and
// relays the small setup messages; the audio and video travel directly (or via a TURN
// relay when one is configured), so nothing is recorded anywhere.
//
// Roles: the advocate always makes the offer (the server tells them when to), and the
// client answers. Both directions carry audio and video from the start, so the camera
// can be switched on or off at any moment without renegotiating.
export function useWebRtcCall({ consultationId, role, hub, initialCamera = false, onEnded }: Options) {
  const [phase, setPhase] = useState<PeerCallPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [peerPresent, setPeerPresent] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  // Whether the other person's camera is on. They announce it explicitly (see announceCamera), which is
  // instant and reliable — waiting for the browser to notice a stalled video track can take seconds.
  const [peerCameraOn, setPeerCameraOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [limitSec, setLimitSec] = useState<number | null>(null);
  const [warning, setWarning] = useState<number | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const remote = useRef<MediaStream | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const videoSender = useRef<RTCRtpSender | null>(null);
  const audioSender = useRef<RTCRtpSender | null>(null);
  const iceServers = useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const clock = useRef<{ startedAtMs: number; offsetMs: number } | null>(null);
  const joined = useRef(false);
  const phaseRef = useRef<PeerCallPhase>("idle");
  const mounted = useRef(true);
  const stopMicWatch = useRef<(() => void) | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const changePhase = (p: PeerCallPhase) => {
    phaseRef.current = p;
    if (mounted.current) setPhase(p);
  };

  const closePeer = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    videoSender.current = null;
    audioSender.current = null;
    pendingCandidates.current = [];
    remote.current = null;
    if (mounted.current) {
      setRemoteStream(null);
      setPeerCameraOn(false);
    }
  }, []);

  const releaseMedia = useCallback(() => {
    stopMicWatch.current?.();
    stopMicWatch.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    cameraTrack.current?.stop();
    local.current = null;
    cameraTrack.current = null;
    if (mounted.current) {
      setLocalStream(null);
      setCameraOn(false);
      setMicLevel(0);
    }
  }, []);

  const finish = useCallback(
    (reason: string, status: string) => {
      joined.current = false;
      closePeer();
      releaseMedia();
      clock.current = null;
      changePhase("ended");
      onEndedRef.current?.({ reason, status });
    },
    [closePeer, releaseMedia]
  );

  // Tells the other side whether our camera is on, so they know whether to show video or a photo.
  const announceCamera = useCallback(() => {
    hub?.send({ type: "signal", consultationId, data: { camera: !!cameraTrack.current } });
  }, [hub, consultationId]);

  // ── camera ────────────────────────────────────────────────────────────────

  const enableCamera = useCallback(async () => {
    if (cameraTrack.current || !local.current) return;
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!mounted.current || !local.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = s.getVideoTracks()[0];
      cameraTrack.current = track;
      local.current.addTrack(track);
      await videoSender.current?.replaceTrack(track);
      setLocalStream(new MediaStream(local.current.getTracks()));
      setCameraOn(true);
      announceCamera();
    } catch (err) {
      setCameraError(cameraErrorMessage(err));
    }
  }, [announceCamera]);

  const disableCamera = useCallback(async () => {
    const track = cameraTrack.current;
    if (!track) return;
    track.stop();
    local.current?.removeTrack(track);
    cameraTrack.current = null;
    await videoSender.current?.replaceTrack(null).catch(() => undefined);
    if (mounted.current && local.current) {
      setLocalStream(new MediaStream(local.current.getTracks()));
      setCameraOn(false);
    }
    announceCamera();
  }, [announceCamera]);

  const toggleCamera = useCallback(() => (cameraTrack.current ? void disableCamera() : void enableCamera()), [disableCamera, enableCamera]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      local.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  // ── the peer connection ───────────────────────────────────────────────────

  const createPeer = useCallback(() => {
    closePeer();
    const conn = new RTCPeerConnection({ iceServers: iceServers.current });
    pc.current = conn;
    remote.current = new MediaStream();

    conn.onicecandidate = (e) => {
      if (e.candidate) hub?.send({ type: "signal", consultationId, data: { candidate: e.candidate.toJSON() } });
    };
    conn.ontrack = (e) => {
      remote.current?.addTrack(e.track);
      if (mounted.current && remote.current) setRemoteStream(new MediaStream(remote.current.getTracks()));
    };
    conn.onconnectionstatechange = () => {
      if (pc.current !== conn) return;
      if (conn.connectionState === "connected") {
        hub?.send({ type: "connected", consultationId });
        announceCamera();
        if (phaseRef.current !== "ended") changePhase("live");
      } else if (conn.connectionState === "failed") {
        setError(
          "Couldn't connect the call. Your network may be blocking direct connections — try another network, or ask the administrator to enable a relay server."
        );
        changePhase("error");
      }
    };
    return conn;
  }, [announceCamera, closePeer, consultationId, hub]);

  const attachLocalTracks = useCallback(
    (conn: RTCPeerConnection) => {
      const audio = local.current?.getAudioTracks()[0];
      for (const t of conn.getTransceivers()) {
        const kind = t.receiver.track.kind;
        t.direction = "sendrecv";
        if (kind === "audio") {
          audioSender.current = t.sender;
          if (audio) void t.sender.replaceTrack(audio);
        } else if (kind === "video") {
          videoSender.current = t.sender;
          if (cameraTrack.current) void t.sender.replaceTrack(cameraTrack.current);
        }
      }
    },
    []
  );

  // The advocate makes the offer.
  const makeOffer = useCallback(async () => {
    if (!local.current) return;
    const conn = createPeer();
    const audio = local.current.getAudioTracks()[0];
    const at = conn.addTransceiver("audio", { direction: "sendrecv" });
    audioSender.current = at.sender;
    if (audio) await at.sender.replaceTrack(audio);
    const vt = conn.addTransceiver("video", { direction: "sendrecv" });
    videoSender.current = vt.sender;
    if (cameraTrack.current) await vt.sender.replaceTrack(cameraTrack.current);

    await conn.setLocalDescription(await conn.createOffer());
    hub?.send({ type: "signal", consultationId, data: { description: conn.localDescription } });
    changePhase("connecting");
  }, [consultationId, createPeer, hub]);

  const handleSignal = useCallback(
    async (data: any) => {
      try {
        if (typeof data?.camera === "boolean") {
          setPeerCameraOn(data.camera);
        } else if (data?.description) {
          const desc = data.description as RTCSessionDescriptionInit;
          if (desc.type === "offer") {
            // The client answers, attaching their own tracks to the offered slots.
            const conn = createPeer();
            await conn.setRemoteDescription(desc);
            attachLocalTracks(conn);
            for (const c of pendingCandidates.current.splice(0)) await conn.addIceCandidate(c).catch(() => undefined);
            await conn.setLocalDescription(await conn.createAnswer());
            hub?.send({ type: "signal", consultationId, data: { description: conn.localDescription } });
            changePhase("connecting");
          } else if (desc.type === "answer" && pc.current) {
            await pc.current.setRemoteDescription(desc);
            for (const c of pendingCandidates.current.splice(0)) await pc.current.addIceCandidate(c).catch(() => undefined);
          }
        } else if (data?.candidate) {
          if (pc.current?.remoteDescription) await pc.current.addIceCandidate(data.candidate).catch(() => undefined);
          else pendingCandidates.current.push(data.candidate);
        }
      } catch (err) {
        console.error("Call signalling failed:", err);
      }
    },
    [attachLocalTracks, consultationId, createPeer, hub]
  );

  // ── messages from the server ──────────────────────────────────────────────

  useEffect(() => {
    if (!hub) return;
    const offs = [
      hub.on("joined", (m) => {
        if (m.consultationId !== consultationId) return;
        if (Array.isArray(m.iceServers) && m.iceServers.length) iceServers.current = m.iceServers;
        setPeerPresent(!!m.peerPresent);
        if (m.status === "LIVE" && m.startedAt) {
          clock.current = { startedAtMs: new Date(m.startedAt).getTime(), offsetMs: new Date(m.serverNow).getTime() - Date.now() };
        }
        setLimitSec(m.limitSec ?? null);
        if (phaseRef.current !== "live") changePhase(m.peerPresent ? "connecting" : "waiting-peer");
      }),
      hub.on("peer.joined", (m) => {
        if (m.consultationId !== consultationId) return;
        setPeerPresent(true);
        if (phaseRef.current !== "live") changePhase("connecting");
      }),
      hub.on("peer.left", (m) => {
        if (m.consultationId !== consultationId) return;
        setPeerPresent(false);
        closePeer();
        if (phaseRef.current !== "ended") changePhase("waiting-peer");
      }),
      hub.on("start", (m) => {
        if (m.consultationId === consultationId && role === "advocate") void makeOffer();
      }),
      hub.on("signal", (m) => {
        if (m.consultationId === consultationId) void handleSignal(m.data);
      }),
      hub.on("call.live", (m) => {
        if (m.consultationId !== consultationId) return;
        clock.current = { startedAtMs: new Date(m.startedAt).getTime(), offsetMs: new Date(m.serverNow).getTime() - Date.now() };
        setLimitSec(m.limitSec);
      }),
      hub.on("call.warning", (m) => {
        if (m.consultationId === consultationId) setWarning(m.secondsLeft);
      }),
      hub.on("call.ended", (m) => {
        if (m.consultationId === consultationId) finish(m.reason, m.status);
      }),
      hub.on("replaced", (m) => {
        if (m.consultationId !== consultationId) return;
        joined.current = false;
        closePeer();
        releaseMedia();
        setError("This call was opened in another tab or window, so it was closed here.");
        changePhase("error");
      }),
      hub.on("error", (m) => {
        if (!joined.current) return;
        if (m.status === "ENDED" || m.status === "CANCELLED" || m.status === "EXPIRED") finish("ended", m.status);
        else if (m.message) {
          setError(m.message);
          changePhase("error");
        }
      }),
    ];
    // After a network drop the hub reconnects; join again so the other side re-negotiates.
    hub.onReady = () => {
      if (joined.current) hub.send({ type: "join", consultationId });
    };
    return () => {
      offs.forEach((off) => off());
      hub.onReady = null;
    };
  }, [hub, consultationId, role, makeOffer, handleSignal, closePeer, releaseMedia, finish]);

  // ── countdown ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "live") return;
    const tick = () => {
      const c = clock.current;
      if (c) setElapsedSec(Math.max(0, (Date.now() + c.offsetMs - c.startedAtMs) / 1000));
    };
    tick();
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, [phase]);

  // ── public actions ────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!hub || !["idle", "error"].includes(phaseRef.current)) return;
    setError(null);
    changePhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      local.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
      stopMicWatch.current = watchLevel(stream, setMicLevel);
    } catch (err) {
      setError(micErrorMessage(err));
      changePhase("error");
      return;
    }
    if (initialCamera) await enableCamera();
    joined.current = true;
    hub.send({ type: "join", consultationId });
  }, [hub, consultationId, initialCamera, enableCamera]);

  const hangup = useCallback(async () => {
    try {
      await humanApi.end(consultationId);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not end the call cleanly."));
    }
    if (phaseRef.current !== "ended") finish("ended", "ENDED");
  }, [consultationId, finish]);

  // Leaving the page leaves the room (the other person is told), but does not end the
  // consultation: it can be rejoined until someone ends it, or it times out.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (joined.current) hub?.send({ type: "leave", consultationId });
      joined.current = false;
      pc.current?.close();
      pc.current = null;
      local.current?.getTracks().forEach((t) => t.stop());
      cameraTrack.current?.stop();
      stopMicWatch.current?.();
    };
  }, [hub, consultationId]);

  return {
    phase,
    error,
    cameraError,
    peerPresent,
    muted,
    cameraOn,
    localStream,
    remoteStream,
    remoteHasVideo: peerCameraOn,
    micLevel,
    elapsedSec,
    limitSec,
    warning,
    start,
    hangup,
    toggleMute,
    toggleCamera,
  };
}
