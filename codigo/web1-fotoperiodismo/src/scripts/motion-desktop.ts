/**
 * Capa 1, escritorio: GSAP (ticker y tweens) + Lenis en un único bucle, y la lupa.
 * Sin ScrollTrigger ni SplitText: los disparos de scroll van con IntersectionObserver y el
 * titular viene partido del build (ver docs/PLAN.md §3). Se carga con import() solo en
 * pantallas anchas con puntero fino.
 */
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { initLoupe } from './loupe';

interface Opts {
  page?: string;
  webgl: boolean;
}

/** Espera al LCP (primera carga) o a un momento ocioso (navegación con el router). */
function afterLCP(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number })
        .requestIdleCallback;
      if (idle) idle(() => resolve(), { timeout: 800 });
      else setTimeout(resolve, 200);
    };
    const firstLoad = performance.getEntriesByType('navigation').length > 0 && performance.now() < 8000;
    if (firstLoad && 'PerformanceObserver' in window) {
      try {
        const po = new PerformanceObserver((list) => {
          if (list.getEntries().length) {
            po.disconnect();
            setTimeout(go, 300);
          }
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        /* sin soporte: el timeout decide */
      }
    }
    setTimeout(go, firstLoad ? 2500 : 600);
  });
}

export function initDesktop({ page, webgl }: Opts) {
  const cleanups: (() => void)[] = [];

  // ── Lenis en el ticker de GSAP (un solo rAF) ──
  const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  // Respeta el ancla (#f-03 en la serie, #fr-… en la hoja) al llegar
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) lenis.scrollTo(el, { immediate: true, offset: el.matches('[data-frame]') ? -120 : -48 });
  }
  cleanups.push(() => {
    gsap.ticker.remove(raf);
    lenis.destroy();
  });

  if (page === 'home') cleanups.push(initLoupe(gsap));

  // ── Capa 2: WebGL, solo si el equipo lo permite y después del LCP ──
  if (webgl && (page === 'home' || page === 'series')) {
    let alive = true;
    let glCleanup: (() => void) | null = null;
    cleanups.push(() => {
      alive = false;
      glCleanup?.();
    });
    afterLCP()
      .then(() => (alive ? import('./webgl/webgl-layer') : null))
      .then((mod) => {
        if (mod && alive) glCleanup = mod.initGL({ gsap, lenis, page });
      })
      .catch((err) => console.warn('[capa 2] no disponible', err));
  }

  return () => {
    cleanups.splice(0).forEach((c) => c());
  };
}
