/**
 * Orquestación de la home (ver CONTRACT.md):
 * detectTier → si ≥ mid, import() de la experiencia y la intro en paralelo → la escena renderiza detrás de la intro
 * (desenfocada) → al resolver la intro, start(). Si tier none/low, solo la historia 2D.
 */
import { detectTier, markGlOff, type Tier } from './caps';
import type { ViajeData } from '../lib/viaje-data';

type Exp = {
  start(): void;
  destroy(): void;
  setSound?: (on: boolean) => void;
  setFocus?: (a: number) => void;
  goToChapter?: (i: number) => void;
  openPhoto?: (id: string) => void;
};

const html = document.documentElement;
const root = document.getElementById('viaje-root')!;
const ui = document.getElementById('viaje-ui')!;
const introRoot = document.getElementById('intro-root')!;
const historia = document.getElementById('historia')!;
const btn = document.getElementById('btn-indice') as HTMLButtonElement | null;
const skip = document.getElementById('skip-story') as HTMLAnchorElement | null;
const data = JSON.parse(document.getElementById('viaje-data')!.textContent || '{}') as ViajeData;

const store = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  },
};

const tier: Tier = detectTier();
const capable = tier === 'high' || tier === 'mid';
html.dataset.tier = tier;

let exp: Exp | null = null;
let busy = false;
/** Último valor de enfoque de la intro (puede llegar antes de que la experiencia termine de montarse) */
let pendingFocus = 0;
/** Capítulo activo (1..n) para que 2D y 3D se sincronicen al alternar */
let currentChapter = 1;

function chapterInView(): number {
  let n = 1;
  data.chapters.forEach((c) => {
    const el = document.getElementById(`cap-${c.id}`);
    if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) n = c.n;
  });
  return n;
}

/** Emisor mínimo de progreso para la intro (recuerda el último valor) */
function createProgress() {
  let last = 0;
  const subs = new Set<(p: number) => void>();
  return {
    emit(p: number) {
      last = Math.max(last, Math.min(1, p));
      subs.forEach((cb) => cb(last));
    },
    subscribe(cb: (p: number) => void) {
      subs.add(cb);
      cb(last);
      return () => subs.delete(cb);
    },
  };
}

/** Interruptor «Animación»: encendido = recorrido 3D; apagado = versión sin animación (2D). La etiqueta no cambia; el estado lo dicen el interruptor y aria-checked. */
function setPressed(is2d: boolean) {
  if (!btn) return;
  btn.removeAttribute('aria-pressed');
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', is2d ? 'false' : 'true');
  btn.dataset.view = is2d ? '2d' : '3d';
  const d = btn.dataset;
  btn.title = (is2d ? d.animatedHint : d.plainHint) ?? btn.title;
}

function to2D(opts: { focus?: boolean; remember?: boolean } = {}) {
  const fromExp = !!exp;
  window.dispatchEvent(new CustomEvent('viaje:intro-abort'));
  exp?.destroy();
  exp = null;
  html.classList.remove('exp-on', 'exp-loading', 'intro-on', 'intro-pre');
  historia.inert = false;
  introRoot.replaceChildren();
  ui.replaceChildren();
  if (opts.remember) store.set('vista-2d', '1');
  setPressed(capable);
  if (opts.focus) {
    // Al salir del 3D, la historia se abre en el capítulo por el que iba el viaje
    const target = fromExp && currentChapter > 1
      ? document.getElementById(`cap-${data.chapters.find((c) => c.n === currentChapter)?.id}`)
      : null;
    if (target) {
      target.tabIndex = -1;
      target.scrollIntoView();
      target.focus({ preventScroll: true });
    } else historia.focus({ preventScroll: false });
  }
}

/** Preferencia de sonido elegida en el visor (persistente) */
const soundPref = () => {
  try {
    return localStorage.getItem('viaje:sonido') === '1';
  } catch {
    return false;
  }
};

async function enter3D(withIntro: boolean, startChapter = 1) {
  if (busy || exp) return;
  busy = true;
  (window as Window & { __viajeSceneReady?: boolean }).__viajeSceneReady = false;
  html.classList.add('exp-loading');
  if (!withIntro) {
    html.classList.remove('intro-on', 'intro-pre');
    introRoot.replaceChildren();
  }
  const progress = createProgress();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    // La intro pesa ~5 KB: se monta en cuanto llega, sin esperar al chunk 3D (que sigue cargando detrás).
    const introDone: Promise<void> = withIntro
      ? import('../intro/index.ts').then((introMod) => {
          html.classList.add('intro-on');
          return introMod.mountIntro({
            root: introRoot,
            data,
            reduced,
            progress,
            onFocus: (a: number) => {
              pendingFocus = a;
              exp?.setFocus?.(a);
              window.dispatchEvent(new CustomEvent('viaje:focus', { detail: a }));
            },
          });
        })
      : Promise.resolve();
    const expMod = await import('../experience/index.ts');
    exp = (await expMod.mountExperience({
      root,
      ui,
      data,
      tier,
      onProgress: (p: number) => progress.emit(p),
      onChapter: (n: number) => {
        currentChapter = n;
      },
      onFallback: () => {
        markGlOff();
        to2D();
      },
    } as Parameters<typeof expMod.mountExperience>[0])) as Exp;
    exp.setSound?.(soundPref());
    // Con intro, la escena arranca desenfocada y la intro la va enfocando; sin intro, nítida
    exp.setFocus?.(withIntro ? pendingFocus : 1);
    progress.emit(1);
    // Cuando la escena ya ha pintado detrás, la foto de fondo de la intro se retira (match-cut con el 3D)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        (window as Window & { __viajeSceneReady?: boolean }).__viajeSceneReady = true;
        window.dispatchEvent(new CustomEvent('viaje:scene-ready'));
      }),
    );
    await introDone;
    store.set('intro-visto', '1');
    html.classList.remove('intro-on', 'intro-pre', 'exp-loading');
    introRoot.replaceChildren();
    historia.inert = true;
    html.classList.add('exp-on');
    setPressed(false);
    exp.setSound?.(soundPref());
    exp.setFocus?.(1);
    exp.start();
    if (startChapter > 1) exp.goToChapter?.(startChapter);
    // Tras la intro, el foco pasa a la capa de interfaz de la experiencia (navegación por teclado)
    if (!ui.hasAttribute('tabindex')) ui.tabIndex = -1;
    ui.focus({ preventScroll: true });
  } catch (err) {
    console.warn('[viaje] la experiencia 3D no está disponible; se muestra la historia 2D.', err);
    to2D();
  } finally {
    busy = false;
  }
}

// La experiencia avisa si se apaga sola (fps bajos, contexto perdido…)
window.addEventListener('viaje:fallback', () => {
  markGlOff();
  to2D();
});

btn?.addEventListener('click', () => {
  if (exp || busy) {
    to2D({ focus: true, remember: true });
  } else if (capable) {
    store.set('vista-2d', null);
    enter3D(false, chapterInView());
  } else {
    document.getElementById('capitulos')?.scrollIntoView({ behavior: 'smooth' });
    (document.querySelector('#capitulos a') as HTMLElement | null)?.focus({ preventScroll: true });
  }
});

skip?.addEventListener('click', (e) => {
  if (exp || busy) {
    e.preventDefault();
    to2D({ focus: true, remember: true });
  }
});

if (!capable) {
  // Sin 3D: si el script del <head> había preparado la intro, se retira limpia
  html.classList.remove('intro-on', 'intro-pre');
  introRoot.replaceChildren();
  // Sin 3D no hay animación que encender: fuera el interruptor (la página 2D ya tiene su índice)
  if (btn) btn.style.display = 'none';
} else if (store.get('vista-2d') === '1') {
  html.classList.remove('intro-on', 'intro-pre');
  setPressed(true);
} else {
  setPressed(false);
  enter3D(store.get('intro-visto') !== '1');
}
