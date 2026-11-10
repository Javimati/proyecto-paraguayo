/**
 * Capa 1 — núcleo (también en móvil). Ciclo de vida con el router de Astro:
 * init en astro:page-load, destroy en astro:before-swap. Lo pesado se carga con import().
 */
import { navigate } from 'astro:transitions/client';
import { detect, type Caps } from './capabilities';
import { initSeries } from './series';
import { initReveal } from './reveal';

type Cleanup = () => void;
let cleanups: Cleanup[] = [];
let caps: Caps;
let pendingPhoto: string | null = null;
let generation = 0;
/** Si hubo transición diapositiva → serie, la capa 2 espera a que termine (si no, oculta la <img> en plena transición). */
let arrivedViaPhoto = false;

function applyRootClasses() {
  caps = detect();
  const root = document.documentElement;
  root.classList.add('js', 'l1');
  root.classList.toggle('motion', caps.motion);
  root.classList.toggle('wide', caps.wide);
}

/** Espera al LCP (o a un máximo) antes de cargar la capa 2 */
function afterLCP(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      const po = new PerformanceObserver(() => {
        po.disconnect();
        setTimeout(finish, 300);
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* sin soporte */
    }
    setTimeout(finish, 2500);
  });
}

async function init() {
  const gen = ++generation;
  applyRootClasses();
  const page = document.body.dataset.page;
  const alive = () => gen === generation;

  if (page === 'series') cleanups.push(initSeries(navigate));
  if (caps.motion) cleanups.push(initReveal());

  let mesaApi: import('./mesa').MesaApi | null = null;
  if (page === 'home') {
    if (caps.wide) {
      const m = await import('./mesa');
      if (!alive()) return;
      mesaApi = m.initMesa({ motion: caps.motion });
      cleanups.push(mesaApi.destroy);
    } else {
      const g = await import('./grid-filter');
      if (!alive()) return;
      cleanups.push(g.initGridFilter({ motion: caps.motion }));
    }
  }

  let lenis: import('lenis').default | null = null;
  if (caps.wide && page !== 'home') {
    const d = await import('./motion-desktop');
    if (!alive()) return;
    const desk = d.initDesktop({ page, webgl: caps.webgl });
    lenis = desk.lenis;
    cleanups.push(desk.cleanup);
  }

  if (caps.webgl && (page === 'home' || page === 'series')) {
    await afterLCP();
    if (!alive()) return;
    if (arrivedViaPhoto) {
      await new Promise((r) => setTimeout(r, 900));
      if (!alive()) return;
    }
    const gl = await import('./webgl/index');
    if (!alive()) return;
    const stop = gl.startGL({ page, mesa: mesaApi, lenis });
    cleanups.push(stop);
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

/* Copiar email (delegado, una sola vez) */
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-email]');
  if (!b || b.disabled) return;
  const email = b.dataset.copyEmail ?? '';
  const status = b.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
  const ok = () => {
    if (status) status.textContent = `${b.dataset.copied}: ${email}`;
  };
  if (navigator.clipboard) navigator.clipboard.writeText(email).then(ok, () => (location.href = `mailto:${email}`));
  else location.href = `mailto:${email}`;
});

/* Diapositiva → serie: la <img> pulsada y la de destino comparten view-transition-name */
document.addEventListener('astro:before-preparation', (e) => {
  pendingPhoto = null;
  const src = (e as Event & { sourceElement?: Element }).sourceElement;
  const link = src?.closest?.<HTMLElement>('[data-slide]');
  const img = link?.querySelector<HTMLImageElement>('img');
  if (!link || !img) return;
  try {
    if (link.dataset.vtId) sessionStorage.setItem('mesa-focus', link.dataset.vtId);
  } catch {
    /* sin almacenamiento */
  }
  // con reduced motion no hay morph de la foto: solo el fundido corto de la página
  if (!caps?.motion) return;
  pendingPhoto = link.dataset.vtId ?? null;
  // el cuentahílos no debe salir en la captura de la transición
  const lp = document.querySelector<HTMLElement>('[data-loupe-el]');
  if (lp) lp.style.visibility = 'hidden';
  // con WebGL la <img> está oculta (gl-on): la necesitamos visible para la captura
  link.closest('.slide')?.classList.remove('gl-on');
  img.style.opacity = '1';
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
    target.classList.add('is-in', 'no-anim');
  }
});

document.addEventListener('astro:after-swap', applyRootClasses);

document.addEventListener('astro:page-load', () => {
  arrivedViaPhoto = !!pendingPhoto;
  if (pendingPhoto) {
    const id = pendingPhoto;
    setTimeout(() => {
      document
        .querySelectorAll<HTMLImageElement>(`[data-vt-id="${CSS.escape(id)}"] img`)
        .forEach((i) => (i.style.viewTransitionName = ''));
    }, 1000);
    pendingPhoto = null;
  }
  init();
});
