// Turns a MediaStream into a 0..1 loudness value ~15 times a second, for the
// mic test and the speaking indicators. Returns a function that stops it.
export function watchLevel(stream: MediaStream, onLevel: (level: number) => void): () => void {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx || stream.getAudioTracks().length === 0) return () => undefined;

  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  let last = -1;
  const timer = window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    // RMS, boosted so ordinary speech reads as a clear bar; rounded so React isn't re-rendered for noise.
    const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
    const rounded = Math.round(level * 20) / 20;
    if (rounded !== last) {
      last = rounded;
      onLevel(rounded);
    }
  }, 66);

  return () => {
    window.clearInterval(timer);
    try {
      source.disconnect();
      void ctx.close();
    } catch {
      /* already closed */
    }
  };
}
