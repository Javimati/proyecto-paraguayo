/**
 * Intro «A través del visor» — web 4.
 * Visor electrónico de cámara (DOM/SVG/CSS, sin dependencias). Ver CONTRACT.md.
 *
 *  - Interactiva desde el primer frame: no espera a que terminen de cargar las texturas.
 *  - Mantener pulsado (ratón / dedo / Espacio / Enter) ≈1,2 s enfoca la escena (onFocus 0→1)
 *    y dispara el obturador. Un clic o pulsación corta entra al instante. Esc = entrar sin intro.
 *  - Un solo flash suave al disparar (WCAG 2.3.1: nunca más de 1 destello).
 *  - Sonido sintetizado solo si el usuario lo activa (desactivado por defecto).
 *  - Una vez por sesión; después, micro-transición de 400 ms.
 *  - reduced = true → no se muestra.
 */
import './intro.css';
import { ensureAudio, playShutter, playFocusBeep } from './sound';

export interface ViajeDataLike {
  lang: 'es' | 'en';
  labels?: Record<string, string>;
  chapters?: { photos?: { srcSmall?: string; src?: string }[] }[];
}

export interface IntroOptions {
  root: HTMLElement;
  data: ViajeDataLike;
  reduced: boolean;
  progress: { subscribe(cb: (p: number) => void): () => void };
  onFocus?: (amount: number) => void;
}

const HOLD_MS = 1200; // tiempo para enfocar
const QUICK_MS = 220; // por debajo de esto, la pulsación cuenta como clic: entra ya
const SESSION_KEY = 'viaje:intro-vista';
const SOUND_KEY = 'viaje:sonido';

const TXT = {
  es: {
    name: 'Álvaro Rodríguez Valverde',
    role: 'Fotorreportaje y eventos',
    place: 'Madrid',
    hold: 'Mantén para enfocar',
    hint: 'o haz clic para entrar',
    skip: 'Entrar sin intro',
    soundOn: 'Sonido: sí',
    soundOff: 'Sonido: no',
    load: 'Carga',
    ready: 'Listo',
    focused: 'Enfocado',
    help:
      'Visor de cámara. Mantén pulsado el botón central, la barra espaciadora o Intro para enfocar y disparar. Un clic o una pulsación corta entra directamente. Escape entra sin intro.',
    loaded: 'Fotos cargadas.',
    dialog: 'Introducción: visor de cámara',
  },
  en: {
    name: 'Álvaro Rodríguez Valverde',
    role: 'Photojournalism & events',
    place: 'Madrid',
    hold: 'Hold to focus',
    hint: 'or click to enter',
    skip: 'Skip intro',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    load: 'Load',
    ready: 'Ready',
    focused: 'In focus',
    help:
      'Camera viewfinder. Press and hold the centre button, the space bar or Enter to focus and shoot. A click or a short press enters straight away. Escape skips the intro.',
    loaded: 'Photos loaded.',
    dialog: 'Intro: camera viewfinder',
  },
} as const;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function safeGet(store: 'session' | 'local', key: string): string | null {
  try {
    return (store === 'session' ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: 'session' | 'local', key: string, val: string) {
  try {
    (store === 'session' ? sessionStorage : localStorage).setItem(key, val);
  } catch {
    /* sin almacenamiento: da igual */
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* Puntos AF: 5 × 3, ordenados por distancia al centro (el AF "encuentra" desde el centro). */
const AF_COLS = 5;
const AF_ROWS = 3;

export function mountIntro(o: IntroOptions): Promise<void> {
  const { root, data, reduced, progress, onFocus } = o;
  const t = TXT[data.lang === 'en' ? 'en' : 'es'];
  const labels = data.labels ?? {};

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced || prefersReduced) {
    onFocus?.(1);
    return Promise.resolve();
  }

  const seen = safeGet('session', SESSION_KEY) === '1';
  const prevFocus = document.activeElement as HTMLElement | null;

  /* Fondo: la foto héroe del capítulo 1, desenfocada, hasta que la escena 3D pinta detrás (match-cut).
     Si el HTML ya trae el fondo crítico (.intro-pre, ver HomePage.astro) se reutiliza; si no, se crea. */
  let bg = root.querySelector<HTMLElement>('.intro-pre');
  const heroSrc = data.chapters?.[0]?.photos?.[0]?.srcSmall;
  if (!bg && heroSrc) {
    bg = el('div', 'intro-pre');
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = `<img class="intro-pre__b" src="${heroSrc}" alt="" decoding="async"><img class="intro-pre__s" src="${heroSrc}" alt="" decoding="async">`;
    root.prepend(bg);
  }
  const onSceneReady = () => bg?.classList.add('is-gone');
  if ((window as Window & { __viajeSceneReady?: boolean }).__viajeSceneReady) onSceneReady();
  else window.addEventListener('viaje:scene-ready', onSceneReady, { once: true });
  const setRootFocus = (f: number) => root.style.setProperty('--focus', f.toFixed(3));

  return new Promise<void>((resolve) => {
    /* ───────── Visita repetida: micro-transición ───────── */
    if (seen) {
      bg?.remove();
      const quick = el('div', 'vf vf--quick');
      quick.setAttribute('aria-hidden', 'true');
      quick.append(el('div', 'vf__curtain vf__curtain--top'), el('div', 'vf__curtain vf__curtain--bottom'));
      root.append(quick);
      onFocus?.(1);
      quick.addEventListener(
        'animationend',
        () => {
          quick.remove();
          resolve();
        },
        { once: true },
      );
      // por si animationend no llega (pestaña oculta)
      setTimeout(() => {
        if (quick.isConnected) {
          quick.remove();
          resolve();
        }
      }, 700);
      return;
    }

    /* ───────── Construcción del visor ───────── */
    const vf = el('div', 'vf');
    vf.setAttribute('role', 'dialog');
    vf.setAttribute('aria-modal', 'true');
    vf.setAttribute('aria-label', `${t.name} — ${labels.introDialog ?? t.dialog}`);
    vf.setAttribute('aria-describedby', 'vf-help');

    // viñeta y cuadrícula de tercios
    vf.append(el('div', 'vf__shade'), el('div', 'vf__grid', '<i></i><i></i><i></i><i></i>'));

    // marcas de encuadre
    vf.append(
      el(
        'div',
        'vf__frame',
        `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 9 V0 H9 M91 0 H100 V9 M100 91 V100 H91 M9 100 H0 V91" />
        </svg>`,
      ),
    );

    // puntos AF
    const afWrap = el('div', 'vf__af');
    afWrap.setAttribute('aria-hidden', 'true');
    const af: { e: HTMLElement; d: number }[] = [];
    for (let r = 0; r < AF_ROWS; r++) {
      for (let c = 0; c < AF_COLS; c++) {
        const p = el('span', 'af');
        const dx = c - (AF_COLS - 1) / 2;
        const dy = (r - (AF_ROWS - 1) / 2) * 1.4;
        af.push({ e: p, d: Math.hypot(dx, dy) });
        afWrap.append(p);
      }
    }
    const afSorted = [...af].sort((a, b) => a.d - b.d);
    vf.append(afWrap);

    // nivel / horizonte
    const level = el('div', 'vf__level', '<i class="vf__level-l"></i><b></b><i class="vf__level-r"></i>');
    level.setAttribute('aria-hidden', 'true');
    vf.append(level);

    // barra superior
    const top = el('div', 'vf__top');
    // lectura EVF superior: el nombre va pequeño; el titular dice qué hace
    const kicker = el('p', 'vf__kicker', `<span class="vf__dot" aria-hidden="true"></span>${t.name} — ${t.place}`);
    const ctls = el('div', 'vf__ctls');
    const soundBtn = el('button', 'vf__ctl vf__sound') as HTMLButtonElement;
    soundBtn.type = 'button';
    let soundOn = safeGet('local', SOUND_KEY) === '1';
    const paintSound = () => {
      soundBtn.textContent = soundOn ? t.soundOn : t.soundOff;
      soundBtn.setAttribute('aria-pressed', String(soundOn));
    };
    paintSound();
    const skipBtn = el('button', 'vf__ctl vf__skip', `${t.skip} <kbd>Esc</kbd>`) as HTMLButtonElement;
    skipBtn.type = 'button';
    ctls.append(skipBtn); // sin botón de sonido (decisión de Marlon): el sonido queda apagado
    top.append(kicker, ctls);
    vf.append(top);

    // botón central: anillo de 24 segmentos
    const SEG = 24;
    const R = 46;
    const C = 2 * Math.PI * R;
    const hold = el('button', 'vf__hold') as HTMLButtonElement;
    hold.type = 'button';
    hold.innerHTML = `
      <svg class="vf__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle class="vf__ring-bg" cx="50" cy="50" r="${R}" pathLength="${SEG}" />
        <circle class="vf__ring-fill" cx="50" cy="50" r="${R}" pathLength="1" />
        <path class="vf__ring-cross" d="M50 40 V60 M40 50 H60" />
      </svg>
      <span class="vf__hold-label">${t.hold}</span>`;
    const center = el('div', 'vf__center');
    const hint = el('p', 'vf__hint', t.hint);
    hint.setAttribute('aria-hidden', 'true');
    center.append(hold, hint);
    vf.append(center);
    const ringFill = hold.querySelector<SVGCircleElement>('.vf__ring-fill')!;
    void C;

    // titular con letras que «enfocan»: qué hace, no el nombre gigante
    const nameWrap = el('div', 'vf__id');
    const h = el('h1', 'vf__title');
    h.setAttribute('aria-label', t.role);
    let i = 0;
    for (const word of t.role.split(' ')) {
      const w = el('span', 'vf__word');
      w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = el('span', 'vf__ch', ch);
        s.style.setProperty('--i', String(i++));
        w.append(s);
      }
      h.append(w, document.createTextNode(' '));
    }
    nameWrap.append(h);
    vf.append(nameWrap);

    // barra EVF
    const evf = el('div', 'vf__evf');
    evf.setAttribute('aria-hidden', 'true');
    evf.innerHTML = `
      <span class="vf__mode">M</span>
      <span>1/250</span>
      <span>F2.8</span>
      <span>ISO 1600</span>
      <span>AWB</span>
      <span class="vf__meter" title="Exposición"><span class="vf__meter-scale">−2 · · · 0 · · · +2</span><i></i></span>
      <span class="vf__bat" title="Batería"><i></i><i></i><i></i><i></i></span>
      <span class="vf__shots"><small>${t.load}</small> [<b data-shots>100</b>]</span>`;
    vf.append(evf);
    const shotsEl = evf.querySelector<HTMLElement>('[data-shots]')!;

    // obturador (cortinilla) + flash
    const curtainT = el('div', 'vf__curtain vf__curtain--top');
    const curtainB = el('div', 'vf__curtain vf__curtain--bottom');
    const flash = el('div', 'vf__flash');
    curtainT.setAttribute('aria-hidden', 'true');
    curtainB.setAttribute('aria-hidden', 'true');
    flash.setAttribute('aria-hidden', 'true');
    vf.append(curtainT, curtainB, flash);

    // textos para lector de pantalla
    const help = el('p', 'vf__sr', t.help);
    help.id = 'vf-help';
    const live = el('p', 'vf__sr');
    live.setAttribute('aria-live', 'polite');
    vf.append(help, live);

    root.append(vf);
    requestAnimationFrame(() => {
      vf.classList.add('is-on');
      // foco en el botón central; sin anillo visible salvo que se use el teclado
      (hold as HTMLElement & { focus(o?: { preventScroll?: boolean; focusVisible?: boolean }): void }).focus({
        preventScroll: true,
        focusVisible: false,
      });
    });

    /* ───────── Estado ───────── */
    let disposed = false;
    let holding = false;
    let holdStart = 0;
    let holdP = 0; // progreso del anillo 0..1
    let focus = 0; // valor enviado a onFocus
    let lastSentFocus = -1;
    let entering = false;
    let raf = 0;
    let loadP = 0;
    let beeped = false;
    let tilt = 0;
    let tiltTarget = 0;

    const unsubscribe = progress.subscribe((p) => {
      loadP = clamp01(p);
      const n = Math.round((1 - loadP) * 100);
      if (loadP >= 1) {
        shotsEl.textContent = t.ready;
        evf.classList.add('is-ready');
        live.textContent = t.loaded;
      } else {
        shotsEl.textContent = String(n).padStart(3, '0');
      }
    });

    const paintAF = (p: number) => {
      // como en una cámara real: solo se confirman los puntos sobre el sujeto (cruz central de 5)
      const lit = Math.min(5, Math.ceil(p * 5.4));
      afSorted.forEach((a, k) => a.e.classList.toggle('is-lit', k < lit));
    };

    const loop = (now: number) => {
      if (disposed) return;
      if (holding) {
        holdP = clamp01((now - holdStart) / HOLD_MS);
      } else if (!entering && holdP > 0) {
        holdP = Math.max(0, holdP - 0.035); // al soltar, el foco vuelve suave
      }
      const target = entering ? 1 : easeInOut(holdP);
      focus += (target - focus) * (entering ? 0.25 : 0.3);
      if (Math.abs(focus - lastSentFocus) > 0.002) {
        lastSentFocus = focus;
        onFocus?.(focus);
      }
      ringFill.style.strokeDashoffset = String(1 - holdP);
      vf.style.setProperty('--focus', focus.toFixed(3));
      setRootFocus(focus);
      paintAF(holdP);

      // nivel
      tilt += (tiltTarget - tilt) * 0.08;
      level.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`);
      level.classList.toggle('is-level', Math.abs(tilt) < 0.35);

      if (holding && holdP >= 1 && !entering) {
        holding = false;
        if (!beeped && soundOn) {
          playFocusBeep();
          beeped = true;
        }
        vf.classList.add('is-focused');
        hold.querySelector('.vf__hold-label')!.textContent = t.focused;
        setTimeout(() => shoot(), 140);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    /* ───────── Entrada ───────── */
    const finish = (fade = 380) => {
      if (disposed) return;
      safeSet('session', SESSION_KEY, '1');
      vf.classList.add('is-leaving');
      vf.style.setProperty('--leave', `${fade}ms`);
      setTimeout(() => {
        cleanup();
        resolve();
      }, fade);
    };

    const shoot = () => {
      if (entering) return;
      entering = true;
      holding = false;
      vf.classList.add('is-shooting');
      root.classList.add('is-shooting');
      if (soundOn) playShutter();
      // cortinilla 240 ms + un único destello de «revelado» en el borde (≤ 280 ms);
      // luego el visor se retira y queda la escena nítida (match-cut, sin fundido a gris)
      setTimeout(() => finish(240), 330);
    };

    const skip = () => {
      if (entering) return;
      entering = true;
      onFocus?.(1);
      finish(260);
    };

    /* ───────── Entrada de usuario ───────── */
    const startHold = () => {
      if (entering || holding) return;
      holding = true;
      holdStart = performance.now() - holdP * HOLD_MS; // reanuda si quedaba foco
      vf.classList.add('is-holding');
      if (soundOn) ensureAudio();
    };
    const endHold = () => {
      if (!holding) return;
      const dur = performance.now() - holdStart;
      holding = false;
      vf.classList.remove('is-holding');
      if (dur < QUICK_MS && !entering) shoot(); // clic: entra ya
    };

    const isCtl = (e: Event) => (e.target as HTMLElement).closest('.vf__ctl');

    const onPointerDown = (e: PointerEvent) => {
      if (isCtl(e) || e.button > 0) return;
      e.preventDefault();
      try {
        vf.setPointerCapture(e.pointerId);
      } catch {
        /* nada */
      }
      startHold();
    };
    const onPointerUp = () => endHold();
    const onPointerCancel = () => {
      holding = false;
      vf.classList.remove('is-holding');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
        return;
      }
      if (e.key === 'Tab') {
        // trampa de foco dentro del visor
        const f = [soundBtn, skipBtn, hold];
        const idx = f.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? f.length - 1 : idx - 1) : idx === f.length - 1 ? 0 : idx + 1;
        f[next].focus();
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && !isCtl(e)) {
        e.preventDefault();
        if (!e.repeat) startHold();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !isCtl(e)) {
        e.preventDefault();
        endHold();
      }
    };

    const onMove = (e: PointerEvent) => {
      tiltTarget = (e.clientX / window.innerWidth - 0.5) * 8;
      vf.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      vf.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    // giroscopio solo si llega sin pedir permiso (Android); en iOS no se pide nada
    const onOrient = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma === 'number') tiltTarget = Math.max(-10, Math.min(10, e.gamma));
    };

    // El shell puede abortar la intro (p. ej. si la escena 3D no está disponible): limpieza completa
    const onAbort = () => {
      cleanup();
      resolve();
    };
    window.addEventListener('viaje:intro-abort', onAbort, { once: true });

    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      safeSet('local', SOUND_KEY, soundOn ? '1' : '0');
      paintSound();
      if (soundOn) ensureAudio();
    });
    skipBtn.addEventListener('click', skip);
    hold.addEventListener('click', (e) => e.preventDefault()); // lo gestionan pointer y teclas

    vf.addEventListener('pointerdown', onPointerDown);
    vf.addEventListener('pointerup', onPointerUp);
    vf.addEventListener('pointercancel', onPointerCancel);
    vf.addEventListener('lostpointercapture', onPointerUp);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    const onVis = () => {
      if (document.hidden) onPointerCancel();
    };
    document.addEventListener('visibilitychange', onVis);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      unsubscribe();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('viaje:scene-ready', onSceneReady);
      window.removeEventListener('viaje:intro-abort', onAbort);
      root.classList.remove('is-shooting');
      onFocus?.(1);
      setRootFocus(1);
      vf.remove();
      if (prevFocus && prevFocus.isConnected && prevFocus !== document.body) {
        prevFocus.focus({ preventScroll: true });
      }
    }
  });
}

export default mountIntro;
