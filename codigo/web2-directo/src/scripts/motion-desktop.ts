/**
 * Capa 1, escritorio: Lenis en el ticker de GSAP (un solo rAF). Arranca la capa 2 (WebGL) tras el LCP.
 * Sin ScrollTrigger ni SplitText: no se usaban para nada que el CSS no haga (≈ 20 KB menos)
 * y los titulares ya no dependen del JS para pintarse.
 */
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { afterLCP } from './after-lcp';

interface Opts {
  page?: string;
  webgl: boolean;
  isCurrent: () => boolean;
}

export function initDesktop({ page, webgl, isCurrent }: Opts) {
  const cleanups: (() => void)[] = [];

  const lenis = new Lenis({ lerp: 0.12 });
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  if (location.hash) {
    try {
      const el = document.querySelector<HTMLElement>(location.hash);
      if (el) lenis.scrollTo(el, { immediate: true, offset: -24 });
    } catch {
      /* hash que no es un selector válido */
    }
  }
  cleanups.push(() => {
    gsap.ticker.remove(raf);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
  });

  // Capa 2
  if (webgl && (page === 'home' || page === 'event')) {
    let glCleanup: (() => void) | null = null;
    let cancelled = false;
    afterLCP().then(async () => {
      if (cancelled || !isCurrent()) return;
      const { initGL } = await import('./webgl/stage-gl');
      if (cancelled || !isCurrent()) return;
      glCleanup = initGL({ page, lenis, gsap });
    });
    cleanups.push(() => {
      cancelled = true;
      glCleanup?.();
    });
  }

  return {
    cleanup() {
      cleanups.splice(0).reverse().forEach((c) => c());
    },
  };
}
