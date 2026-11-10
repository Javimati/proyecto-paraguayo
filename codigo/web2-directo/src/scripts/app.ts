/**
 * Capa 1 — núcleo ligero (también en móvil).
 * Ciclo de vida con el router de Astro: init en astro:page-load, destroy en astro:before-swap.
 * Lo pesado (GSAP, Lenis y la capa WebGL) se carga con import() solo en pantallas anchas
 * con puntero fino y sin reduced motion.
 */
import { navigate } from 'astro:transitions/client';
import { detect, type Caps } from './capabilities';
import { initReveal } from './reveal';
import { initSetlist, rememberShow } from './setlist';
import { initEventNav } from './event-nav';
import { initCopy } from './copy';

type Cleanup = () => void;
let cleanups: Cleanup[] = [];
let caps: Caps | null = null;
let pending: string | null = null;
let generation = 0;
let clientNav = false; // la página actual llegó por el router (no por carga completa)
let fromPage: string | undefined;

function applyRootClasses() {
  caps = detect(); // una vez por navegación
  const root = document.documentElement;
  root.classList.add('l1');
  root.classList.toggle('motion', caps.motion);
  root.classList.toggle('wide', caps.wide);
}

async function init() {
  const gen = ++generation;
  if (!caps) applyRootClasses();
  const c = caps!;
  const page = document.body.dataset.page;
  cleanups.push(initCopy());
  cleanups.push(initSetlist({ restoreFocus: clientNav && fromPage === 'event' }));
  cleanups.push(initEventNav(navigate));
  if (c.motion) cleanups.push(initReveal());

  // Foco al llegar a un evento por el router: el título (el lector anuncia dónde está)
  if (page === 'event') {
    const slug = document.querySelector<HTMLElement>('[data-event]')?.dataset.slug;
    if (slug) rememberShow(slug);
    if (clientNav) document.querySelector<HTMLElement>('[data-event-title]')?.focus({ preventScroll: true });
  }

  if (c.wide) {
    const mod = await import('./motion-desktop');
    if (gen !== generation) return;
    const desk = mod.initDesktop({ page, webgl: c.webgl, isCurrent: () => gen === generation });
    cleanups.push(desk.cleanup);
  }
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

/* Setlist → evento: la portada del escenario y la primera foto del evento comparten view-transition-name */
document.addEventListener('astro:before-preparation', (e) => {
  pending = null;
  fromPage = document.body.dataset.page;
  // la capa WebGL oculta las <img>: se devuelven antes de la foto de la transición
  document.documentElement.classList.remove('gl-on');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const src = (e as Event & { sourceElement?: Element }).sourceElement;
  const link = src?.closest?.<HTMLElement>('[data-show-link]');
  const img = link?.querySelector<HTMLImageElement>('[data-stage-img] img');
  if (!link || !img) return;
  const visible = getComputedStyle(img.closest('[data-stage-img]')!).visibility !== 'hidden';
  if (!visible) return;
  pending = link.dataset.vtId ?? null;
  img.style.viewTransitionName = 'photo';
});

document.addEventListener('astro:before-swap', (e) => {
  destroy();
  clientNav = true;
  const doc = (e as Event & { newDocument: Document }).newDocument;
  if (!pending) return;
  const target = doc.querySelector<HTMLElement>(`[data-vt-id="${CSS.escape(pending)}"]`);
  const img = target?.querySelector('img');
  if (target && img) {
    img.style.viewTransitionName = 'photo';
    target.classList.add('is-revealed', 'no-anim');
  }
});

document.addEventListener('astro:after-swap', applyRootClasses);

document.addEventListener('astro:page-load', () => {
  if (pending) {
    const id = pending;
    setTimeout(() => {
      document.querySelectorAll<HTMLImageElement>(`[data-vt-id="${CSS.escape(id)}"] img`).forEach((i) => (i.style.viewTransitionName = ''));
    }, 700);
    pending = null;
  }
  init();
});
