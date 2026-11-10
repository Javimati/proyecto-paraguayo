/**
 * Cuentahílos: amplía ×2,5 el fotograma bajo el cursor. Decorativo (aria-hidden):
 * nunca sustituye a una acción. Carga la versión de 1000 px solo al pasar por encima.
 */
import type { gsap as GSAP } from 'gsap';

const ZOOM = 2.5;
const RADIUS = 90; // 180 px de diámetro

export function initLoupe(gsap: typeof GSAP): () => void {
  const loupe = document.querySelector<HTMLElement>('[data-loupe-el]');
  const sheet = document.querySelector<HTMLElement>('[data-sheet]');
  if (!loupe || !sheet) return () => {};
  loupe.style.display = 'block';
  const xTo = gsap.quickTo(loupe, 'x', { duration: 0.25, ease: 'power3.out' });
  const yTo = gsap.quickTo(loupe, 'y', { duration: 0.25, ease: 'power3.out' });
  let current: HTMLImageElement | null = null;
  let visible = false;

  const show = (on: boolean) => {
    if (on === visible) return;
    visible = on;
    gsap.to(loupe, { opacity: on ? 1 : 0, scale: on ? 1 : 0.6, duration: 0.2, ease: 'power2.out' });
    sheet.classList.toggle('is-loupe', on);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const img = (e.target as HTMLElement).closest('.frame__window')?.querySelector('img') ?? null;
    xTo(e.clientX);
    yTo(e.clientY);
    if (!img) {
      show(false);
      current = null;
      return;
    }
    const r = img.getBoundingClientRect();
    // área visible real de la foto dentro del marco 3:2 (object-fit: contain)
    const ratio = img.naturalWidth / img.naturalHeight || 1.5;
    let w = r.width,
      h = r.height,
      ox = 0,
      oy = 0;
    if (ratio < r.width / r.height) {
      w = r.height * ratio;
      ox = (r.width - w) / 2;
    } else {
      h = r.width / ratio;
      oy = (r.height - h) / 2;
    }
    if (img !== current) {
      current = img;
      const src = img.dataset.loupe ?? img.currentSrc;
      loupe.style.backgroundImage = `url("${src}")`;
      loupe.style.backgroundSize = `${w * ZOOM}px ${h * ZOOM}px`;
    }
    const lx = e.clientX - r.left - ox;
    const ly = e.clientY - r.top - oy;
    // la lupa está centrada 24 px desplazada del cursor: muestra lo que hay bajo el cursor
    loupe.style.backgroundPosition = `${RADIUS - lx * ZOOM}px ${RADIUS - ly * ZOOM}px`;
    show(true);
  };
  const onLeave = () => {
    show(false);
    current = null;
  };

  // que la lupa no salga en la captura de la transición de página
  const onNav = () => {
    gsap.killTweensOf(loupe);
    gsap.set(loupe, { opacity: 0 });
    visible = false;
  };
  document.addEventListener('astro:before-preparation', onNav);
  sheet.addEventListener('pointermove', onMove);
  sheet.addEventListener('pointerleave', onLeave);
  window.addEventListener('scroll', onLeave, { passive: true });
  return () => {
    sheet.removeEventListener('pointermove', onMove);
    sheet.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('scroll', onLeave);
    document.removeEventListener('astro:before-preparation', onNav);
    sheet.classList.remove('is-loupe');
    gsap.killTweensOf(loupe);
    loupe.style.cssText = '';
  };
}
