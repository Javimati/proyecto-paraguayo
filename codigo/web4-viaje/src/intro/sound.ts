/**
 * Obturador sintetizado con WebAudio (sin archivos). Solo se crea el AudioContext
 * dentro de un gesto del usuario y solo si el sonido está activado.
 */
let ctx: AudioContext | null = null;

export function ensureAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function burst(ac: AudioContext, t: number, dur: number, freq: number, q: number, gain: number) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** «Clac-clac»: espejo + cortinilla, ~120 ms en total. */
export function playShutter() {
  const ac = ctx;
  if (!ac) return;
  const t = ac.currentTime + 0.005;
  burst(ac, t, 0.035, 2600, 0.9, 0.55);
  burst(ac, t + 0.004, 0.02, 6500, 1.4, 0.25);
  burst(ac, t + 0.085, 0.045, 1900, 0.8, 0.45);
  // golpe grave del espejo
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.06);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.08);
}

/** Pitido corto de foco confirmado (muy suave). */
export function playFocusBeep() {
  const ac = ctx;
  if (!ac) return;
  const t = ac.currentTime + 0.005;
  [0, 0.09].forEach((dt) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.value = 2900;
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.exponentialRampToValueAtTime(0.04, t + dt + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.06);
    o.connect(g).connect(ac.destination);
    o.start(t + dt);
    o.stop(t + dt + 0.07);
  });
}
