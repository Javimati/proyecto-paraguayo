/**
 * Sonido opcional del viaje (desactivado por defecto). Comparte la preferencia con la intro
 * (localStorage 'viaje:sonido' = '1'). Todo sintetizado con WebAudio: sin archivos.
 * El AudioContext solo se crea dentro de un gesto del usuario.
 */
const KEY = 'viaje:sonido';

type Bed = { gain: GainNode; nodes: AudioNode[]; stop: () => void };

// ambiente por capítulo: [frecuencia del filtro de ruido, Q, nivel del ruido, frecuencia del zumbido grave, nivel del zumbido, LFO Hz]
const BEDS: [number, number, number, number, number, number][] = [
  [380, 0.7, 0.5, 92, 0.18, 0.05], // cuarto: tono de habitación
  [1100, 0.6, 0.75, 0, 0, 0.11], // calle: rumor
  [1500, 0.9, 0.8, 0, 0, 0.35], // noticia: murmullo de gente
  [260, 0.8, 0.55, 55, 0.35, 1.9], // directo: grave y pulso
  [900, 0.7, 0.65, 110, 0.12, 0.2], // eventos: sala
  [600, 0.5, 0.35, 0, 0, 0.04], // lo que viene: casi silencio
];

export class ViajeSound {
  on: boolean;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private bed: Bed | null = null;
  private chapter = -1;

  constructor() {
    let v = false;
    try {
      v = localStorage.getItem(KEY) === '1';
    } catch {
      v = false;
    }
    this.on = v;
  }

  /** llamar desde un gesto (clic, tecla, toque) */
  gesture() {
    if (!this.on) return;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.0001;
        this.master.connect(this.ctx.destination);
        this.master.gain.exponentialRampToValueAtTime(0.06, this.ctx.currentTime + 1.2);
        const len = this.ctx.sampleRate * 2;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.chapter >= 0 && !this.bed) this.setChapter(this.chapter, true);
  }

  setEnabled(on: boolean) {
    this.on = on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* sin almacenamiento */
    }
    if (on) this.gesture();
    else this.silence();
  }

  private silence() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.0001, t, 0.15);
    const b = this.bed;
    this.bed = null;
    setTimeout(() => b?.stop(), 800);
    setTimeout(() => {
      if (!this.on && this.ctx) {
        void this.ctx.close();
        this.ctx = null;
        this.master = null;
      }
    }, 900);
  }

  setChapter(i: number, force = false) {
    if (i === this.chapter && !force) return;
    this.chapter = i;
    if (!this.on || !this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const old = this.bed;
    if (old) {
      old.gain.gain.setTargetAtTime(0.0001, t, 0.6);
      setTimeout(() => old.stop(), 3000);
    }
    const [fq, q, nl, drone, dl, lfoHz] = BEDS[i % BEDS.length];
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, t, 0.8);
    gain.connect(this.master);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = fq;
    filt.Q.value = q;
    const ng = ctx.createGain();
    ng.gain.value = nl;
    src.connect(filt).connect(ng).connect(gain);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoHz;
    const lfoG = ctx.createGain();
    lfoG.gain.value = nl * 0.35;
    lfo.connect(lfoG).connect(ng.gain);
    const nodes: AudioNode[] = [src, filt, ng, lfo, lfoG];
    let osc: OscillatorNode | null = null;
    if (drone > 0) {
      osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = drone;
      const og = ctx.createGain();
      og.gain.value = dl;
      osc.connect(og).connect(gain);
      nodes.push(osc, og);
      osc.start();
    }
    src.start();
    lfo.start();
    this.bed = {
      gain,
      nodes,
      stop: () => {
        try {
          src.stop();
          lfo.stop();
          osc?.stop();
        } catch {
          /* ya parado */
        }
        nodes.forEach((n) => n.disconnect());
        gain.disconnect();
      },
    };
  }

  /** clic de enfoque al enganchar el AF: dos chasquidos muy cortos */
  af() {
    if (!this.on || !this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    [0, 0.045].forEach((off, k) => {
      const t = ctx.currentTime + off;
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = k ? 3800 : 2600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(k ? 0.5 : 0.8, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      s.connect(f).connect(g).connect(this.master!);
      s.start(t, Math.random(), 0.04);
      s.onended = () => {
        s.disconnect();
        f.disconnect();
        g.disconnect();
      };
    });
  }

  destroy() {
    this.bed?.stop();
    this.bed = null;
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
