/**
 * Capa 1, escritorio (fuera de la mesa): Lenis en el único gsap.ticker (ScrollTrigger se quitó:
 * no había ningún trigger y pesaba ~18 KB gzip),
 * entrada del título con SplitText y, en la serie, inclinación según la velocidad del scroll
 * (si la capa 2 está activa, la deformación la hace el shader).
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(SplitText);

export function initDesktop({ page, webgl }: { page?: string; webgl: boolean }) {
  const cleanups: (() => void)[] = [];
  const lenis = new Lenis({ lerp: 0.11 });
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  if (location.hash) {
    const el = document.querySelector<HTMLElement>(location.hash);
    if (el) lenis.scrollTo(el, { immediate: true, offset: -32 });
  }
  cleanups.push(() => {
    gsap.ticker.remove(raf);
    gsap.ticker.lagSmoothing(500, 33); // valores por defecto de GSAP
    lenis.destroy();
  });

  const title = document.querySelector<HTMLElement>('.series__title, .sec h1');
  if (title && !location.hash) {
    const st = SplitText.create(title, { type: 'lines', mask: 'lines', aria: 'auto' });
    const tw = gsap.from(st.lines, { yPercent: 105, duration: 1, ease: 'power4.out', stagger: 0.08 });
    cleanups.push(() => {
      tw.kill();
      st.revert();
    });
  }

  if (page === 'series' && !webgl) {
    const frames = gsap.utils.toArray<HTMLElement>('.shot__frame');
    const setters = frames.map((f) => gsap.quickTo(f, 'skewY', { duration: 0.5, ease: 'power3.out' }));
    const onScroll = () => {
      const v = gsap.utils.clamp(-2.2, 2.2, lenis.velocity * 0.12);
      setters.forEach((s) => s(v));
    };
    lenis.on('scroll', onScroll);
    cleanups.push(() => {
      lenis.off('scroll', onScroll);
      gsap.set(frames, { clearProps: 'transform' });
    });
  }

  return {
    lenis,
    cleanup() {
      cleanups.splice(0).forEach((c) => c());
    },
  };
}
