/**
 * Capa 1 — núcleo ligero (corre también en móvil).
 * Ciclo de vida con el router de Astro: init en astro:page-load, destroy en astro:before-swap.
 * Lo de escritorio (GSAP, Lenis, lupa y, si procede, la capa 2) se carga con import()
 * solo si hay pantalla ancha, puntero fino y sin reduced motion.
 */
import { navigate } from 'astro:transitions/client';
import { detect, type Caps } from './capabilities';
import { initReveal } from './reveal';
import { initTeletype } from './teletype';
import { initMarks } from './marks';
import { initSheetKeys } from './sheet-keys';
import { initSeriesNav } from './series-nav';

type Cleanup = () => void;
let cleanups: Cleanup[] = [];
let caps: Caps;
let pendingPhoto: string | null = null;
let arrivedPhoto: string | null = null; // foto de destino de la transición que acaba de ocurrir
let generation = 0;
const VT_MS = 600; // duración de la transición hoja → serie (+ margen)

function applyRootClasses() {
  caps = detect();
  const root = document.documentElement;
  root.classList.add('l1');
  root.classList.toggle('motion', caps.motion);
  root.classList.toggle('wide', caps.wide);
}

async function init() {
  const gen = ++generation;
  applyRootClasses();
  const page = document.body.dataset.page;
  const arrived = arrivedPhoto;
  arrivedPhoto = null;

  cleanups.push(initSheetKeys());
  cleanups.push(initSeriesNav(navigate));

  // Foco tras la transición: en la figura de destino, sin mover el scroll
  if (arrived) {
    const fig = document.querySelector<HTMLElement>(`[data-vt-id="${CSS.escape(arrived)}"]`)?.closest('figure');
    fig?.focus({ preventScroll: true });
  }

  if (caps.motion) {
    cleanups.push(initReveal());
    cleanups.push(initTeletype(arrived ? VT_MS : 0));
  }

  // las marcas esperan a que el titular haya entrado (solo en escritorio hay entrada animada)
  let introDone: Promise<void> = Promise.resolve();
  if (caps.wide && page === 'home') introDone = new Promise((r) => setTimeout(r, 700));

  if (caps.wide) {
    const mod = await import('./motion-desktop');
    if (gen !== generation) return; // la página cambió mientras cargaba
    cleanups.push(mod.initDesktop({ page, webgl: caps.webgl }));
  }
  if (caps.motion) cleanups.push(initMarks(introDone));
}

function destroy() {
  generation++;
  for (const c of cleanups.splice(0)) {
    try {
      c();
    } catch (err) {
      console.error(err);
    }
  }
}

/* ── Hoja → serie: el fotograma pulsado y la foto de destino comparten view-transition-name ── */
document.addEventListener('astro:before-preparation', (e) => {
  pendingPhoto = null;
  const src = (e as Event & { sourceElement?: Element }).sourceElement;
  const link = src?.closest?.<HTMLElement>('[data-frame]');
  if (!link) return;
  const img = link.querySelector('img');
  if (!img) return;
  pendingPhoto = link.dataset.vtId ?? null;
  img.style.viewTransitionName = 'photo';
});

document.addEventListener('astro:before-swap', (e) => {
  destroy();
  const doc = (e as Event & { newDocument: Document }).newDocument;
  if (!pendingPhoto) return;
  const target = doc.querySelector<HTMLElement>(`[data-vt-id="${CSS.escape(pendingPhoto)}"]`);
  const img = target?.querySelector('img');
  if (target && img) {
    img.style.viewTransitionName = 'photo';
    target.classList.add('is-revealed', 'no-anim');
  }
});

document.addEventListener('astro:after-swap', () => {
  applyRootClasses();
});

document.addEventListener('astro:page-load', () => {
  if (pendingPhoto) {
    const id = pendingPhoto;
    arrivedPhoto = id;
    // quita el nombre de transición cuando ya ha terminado, para que no colisione después
    setTimeout(() => {
      document
        .querySelectorAll<HTMLImageElement>(`[data-vt-id="${CSS.escape(id)}"] img`)
        .forEach((i) => (i.style.viewTransitionName = ''));
    }, VT_MS + 100);
    pendingPhoto = null;
  }
  init();
});
