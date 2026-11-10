/**
 * Mesa de luz viva (capa 1, escritorio): plano infinito de diapositivas.
 * - Cada diapositiva se recoloca por módulo (sin duplicados en el DOM).
 * - Arrastre con inercia, rueda, teclado (flechas + centrado del foco).
 * - Cuentahílos: lupa ×3 sobre la diapositiva bajo el cursor, con lugar, fecha y serie.
 * - Filtros por apartado: las que tocan se reagrupan y crecen hasta llenar el área útil.
 * - Encendido: una rampa de luz + caída de diapositivas (una vez por sesión, sin destellos).
 * - En reposo no escribe estilos: solo se pinta si algo se mueve.
 * Expone el estado para la capa WebGL, que dibuja las fotos encima con los mismos números.
 */
import { gsap } from 'gsap';

export interface MesaItem {
  el: HTMLElement;
  link: HTMLAnchorElement;
  win: HTMLElement;
  img: HTMLImageElement;
  section: string;
  rot: number; // grados
  jx: number;
  jy: number;
  // estado animable
  bx: number;
  by: number;
  alpha: number; // filtro (1 / 0.07)
  drop: number; // intro (0 → 1)
  lift: number; // hover (0 → 1)
  fs: number; // escala del filtro (crece para llenar el área útil)
  // resultado de cada frame (centro de la montura en pantalla y escala)
  cx: number;
  cy: number;
  scale: number;
  winW: number;
  winH: number;
}

export interface MesaApi {
  items: MesaItem[];
  size: () => number;
  velocity: () => { x: number; y: number };
  onFrame: (fn: () => void) => () => void;
  /** fuerza a repintar durante `ms` (p. ej. cuando llega una textura) */
  invalidate: (ms?: number) => void;
  destroy: () => void;
}

const FOCUS_KEY = 'mesa-focus';
const ZOOM = 3;
const LENS = 260;

export function initMesa({ motion }: { motion: boolean }): MesaApi {
  const root = document.documentElement;
  const mesa = document.querySelector<HTMLElement>('[data-mesa]')!;
  const nav = document.querySelector<HTMLElement>('[data-filters]');
  const status = document.querySelector<HTMLElement>('[data-filter-status]');
  const intro = document.querySelector<HTMLElement>('[data-intro]');
  const header = document.querySelector<HTMLElement>('.site-header');
  const loupe = mesa.querySelector<HTMLElement>('[data-loupe-el]');
  const lens = loupe?.querySelector<HTMLElement>('.loupe__lens') ?? null;
  const capWhere = loupe?.querySelector<HTMLElement>('.loupe__where') ?? null;
  const capTitle = loupe?.querySelector<HTMLElement>('.loupe__title') ?? null;
  const boxLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.box__title a'));

  // ¿Toca encendido? Se decide antes de que la mesa exista, para no pintar nada a destiempo.
  let introSeen = false;
  try {
    introSeen = sessionStorage.getItem('mesa-intro') === '1';
    sessionStorage.setItem('mesa-intro', '1');
  } catch {
    /* sin almacenamiento */
  }
  const runIntro = motion && !introSeen;

  const slides = Array.from(mesa.querySelectorAll<HTMLElement>('.slide'));
  const items: MesaItem[] = slides.map((el) => {
    const cs = getComputedStyle(el);
    return {
      el,
      link: el.querySelector('a')!,
      win: el.querySelector<HTMLElement>('.slide__window')!,
      img: el.querySelector('img')!,
      section: el.dataset.section ?? '',
      rot: parseFloat(cs.getPropertyValue('--r')) || 0,
      jx: parseFloat(cs.getPropertyValue('--jx')) || 0,
      jy: parseFloat(cs.getPropertyValue('--jy')) || 0,
      bx: 0,
      by: 0,
      alpha: 1,
      drop: runIntro ? 0 : 1,
      lift: 0,
      fs: 1,
      cx: 0,
      cy: 0,
      scale: 1,
      winW: 0,
      winH: 0,
    };
  });

  // Orden importante: intro-run (sin transiciones) → mesa-live → medir → colocar → pintar,
  // todo en el mismo frame: ninguna diapositiva se ve antes de tiempo.
  if (runIntro) root.classList.add('intro-run');
  root.classList.add('mesa-live');
  // los títulos de apartado quedan ocultos en la mesa viva: fuera del orden de tabulación
  boxLinks.forEach((a) => (a.tabIndex = -1));

  let S = 0,
    cell = 0,
    cols = 0,
    rows = 0,
    W = 0,
    H = 0,
    vw = 0,
    vh = 0;
  let ox = 0,
    oy = 0,
    tx = 0,
    ty = 0,
    vx = 0,
    vy = 0;
  let filter = 'all';
  let animUntil = 0;
  const frameFns = new Set<() => void>();
  const wake = (ms = 1200) => {
    animUntil = Math.max(animUntil, performance.now() + ms);
  };

  const mod = (a: number, n: number) => ((a % n) + n) % n;
  const wrapDelta = (d: number, n: number) => mod(d + n / 2, n) - n / 2;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    S = items[0]?.el.offsetWidth || 240;
    cell = S * 1.22;
    const n = items.length;
    cols = Math.max(Math.ceil(Math.sqrt((n * 1.35 * vw) / vh)), Math.ceil(vw / cell) + 2);
    rows = Math.max(Math.ceil((n * 1.35) / cols), Math.ceil(vh / cell) + 2);
    W = cols * cell;
    H = rows * cell;
    for (const it of items) {
      it.winW = it.win.offsetWidth;
      it.winH = it.win.offsetHeight;
    }
  }

  /** Área útil: la vista menos la cabecera, la ficha y la píldora de filtros. */
  function usefulRect() {
    const top = (header?.getBoundingClientRect().bottom ?? 80) + 16;
    const pill = nav?.querySelector('ul')?.getBoundingClientRect();
    const ficha = intro?.getBoundingClientRect();
    const bottomBand = Math.max(pill ? vh - pill.top : 70, 0) + 16;
    // la ficha (abajo a la izquierda) se esquiva reservando su alto si es más alta que la píldora
    const fichaBand = ficha ? vh - ficha.top + 16 : 0;
    const bottom = vh - Math.max(bottomBand, Math.min(fichaBand, vh * 0.32));
    const side = Math.max(32, vw * 0.04);
    return { x: side, y: top, w: vw - side * 2, h: Math.max(200, bottom - top) };
  }

  /** Reparte: con «Todo», por cercanía al centro; con un filtro, rejilla que llena el área útil. */
  function assign(animate: boolean) {
    const inF = items.filter((it) => filter === 'all' || it.section === filter);
    const outF = items.filter((it) => !(filter === 'all' || it.section === filter));
    const targets = new Map<MesaItem, { x: number; y: number; a: number; f: number }>();

    // celdas del plano ordenadas por distancia al centro de la vista
    const vcx = mod(vw / 2 - ox, W);
    const vcy = mod(vh / 2 - oy, H);
    const cells: { x: number; y: number; d: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = c * cell + (r % 2 ? cell * 0.5 : 0);
        const y = r * cell;
        const dx = wrapDelta(x + cell / 2 - vcx, W);
        const dy = wrapDelta(y + cell / 2 - vcy, H) * 1.25;
        cells.push({ x, y, d: dx * dx + dy * dy });
      }
    cells.sort((a, b) => a.d - b.d);

    if (filter === 'all') {
      items.forEach((it, k) => {
        const c = cells[k];
        targets.set(it, { x: c.x + (cell - S) / 2 + it.jx * cell, y: c.y + (cell - S) / 2 + it.jy * cell, a: 1, f: 1 });
      });
    } else {
      // rejilla de N elementos que llena el área útil
      const R = usefulRect();
      const N = inF.length;
      let best = { c: 1, r: N, size: 0 };
      for (let c = 1; c <= N; c++) {
        const r = Math.ceil(N / c);
        const size = Math.min(R.w / c, R.h / r);
        if (size > best.size) best = { c, r, size };
      }
      const f = Math.min(2.4, Math.max(0.7, (best.size * 0.92) / S));
      const gw = best.c * best.size,
        gh = best.r * best.size;
      inF.forEach((it, k) => {
        const col = k % best.c,
          row = Math.floor(k / best.c);
        // centro en pantalla → coordenadas del plano (esquina superior izquierda sin escalar)
        const sx = R.x + (R.w - gw) / 2 + col * best.size + best.size / 2;
        const sy = R.y + (R.h - gh) / 2 + row * best.size + best.size / 2;
        targets.set(it, { x: mod(sx - S / 2 - ox, W), y: mod(sy - S / 2 - oy, H), a: 1, f });
      });
      // las descartadas, a las celdas más lejanas: casi invisibles y fuera del área útil
      outF.forEach((it, k) => {
        const c = cells[cells.length - 1 - k];
        targets.set(it, { x: c.x + (cell - S) / 2, y: c.y + (cell - S) / 2, a: 0.07, f: 1 });
      });
    }

    let k = 0;
    for (const [it, t] of targets) {
      if (animate && motion) {
        const delay = Math.min(k++, 30) * 0.008;
        gsap.to(it, { bx: t.x, by: t.y, alpha: t.a, fs: t.f, duration: 0.9, ease: 'expo.inOut', delay });
      } else {
        it.bx = t.x;
        it.by = t.y;
        it.alpha = t.a;
        it.fs = t.f;
      }
    }
    wake(animate && motion ? 1500 : 100);
  }

  function render() {
    for (const it of items) {
      const x0 = mod(it.bx + ox + cell, W) - cell;
      const y0 = mod(it.by + oy + cell, H) - cell;
      const scale = it.fs * (1 + 0.04 * it.lift) * (1 + 0.14 * (1 - it.drop));
      it.cx = x0 + S / 2;
      it.cy = y0 + S / 2 - 6 * it.lift;
      it.scale = scale;
      it.el.style.transform = `translate3d(${(it.cx - S / 2).toFixed(1)}px,${(it.cy - S / 2).toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
      it.el.style.opacity = String(Math.min(it.alpha, it.drop));
      it.el.style.zIndex = it.lift > 0.01 ? '3' : '';
    }
  }

  // ── Cuentahílos ──
  let px = -1,
    py = -1,
    loupeOn = false,
    loupeItem: MesaItem | null = null;
  const showLoupe = (on: boolean) => {
    if (!loupe || on === loupeOn) return;
    loupeOn = on;
    mesa.classList.toggle('is-loupe', on);
    gsap.to(loupe, { opacity: on ? 1 : 0, duration: on ? 0.18 : 0.12, ease: 'power2.out' });
  };
  function updateLoupe() {
    if (!loupe || !lens || px < 0 || dragging) {
      showLoupe(false);
      return;
    }
    const hit = document.elementFromPoint(px, py)?.closest<HTMLElement>('.slide__window');
    const it = hit ? items.find((i) => i.win === hit) : undefined;
    if (!it || it.alpha < 0.5) {
      showLoupe(false);
      loupeItem = null;
      return;
    }
    const r = it.win.getBoundingClientRect();
    if (it !== loupeItem) {
      loupeItem = it;
      lens.style.backgroundImage = `url("${it.img.dataset.loupe || it.img.currentSrc}")`;
      if (capWhere) capWhere.textContent = it.el.dataset.label ?? '';
      if (capTitle) capTitle.textContent = it.el.dataset.title ?? '';
    }
    lens.style.backgroundSize = `${(r.width * ZOOM).toFixed(1)}px ${(r.height * ZOOM).toFixed(1)}px`;
    lens.style.backgroundPosition = `${(LENS / 2 - (px - r.left) * ZOOM).toFixed(1)}px ${(LENS / 2 - (py - r.top) * ZOOM).toFixed(1)}px`;
    loupe.style.transform = `translate3d(${(px - LENS / 2).toFixed(1)}px,${(py - LENS / 2).toFixed(1)}px,0)`;
    showLoupe(true);
  }

  const tick = () => {
    const moving = Math.abs(tx - ox) > 0.1 || Math.abs(ty - oy) > 0.1;
    if (!moving && performance.now() > animUntil) {
      vx = vy = 0;
      return; // en reposo: ni estilos ni WebGL
    }
    const k = motion ? 0.11 : 1;
    const pox = ox,
      poy = oy;
    ox += (tx - ox) * k;
    oy += (ty - oy) * k;
    vx = ox - pox;
    vy = oy - poy;
    render();
    if (moving && loupeOn) updateLoupe();
    frameFns.forEach((f) => f());
  };

  // ── Primera interacción: la ficha se pliega ──
  let folded = false;
  const fold = () => {
    if (folded || !intro) return;
    folded = true;
    intro.classList.add('is-folded');
  };

  // ── Arrastre ──
  let down = false,
    dragging = false,
    lastX = 0,
    lastY = 0,
    lastT = 0,
    velX = 0,
    velY = 0,
    startX = 0,
    startY = 0,
    suppress = false;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    down = true;
    dragging = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velX = velY = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      px = e.clientX;
      py = e.clientY;
    }
    if (!down) {
      hover(e);
      updateLoupe();
      return;
    }
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 5) {
      dragging = true;
      fold();
      mesa.classList.add('is-dragging');
      mesa.setPointerCapture(e.pointerId);
      setHover(null);
      showLoupe(false);
    }
    if (dragging) {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      tx += dx;
      ty += dy;
      velX = velX * 0.6 + (dx / dt) * 0.4;
      velY = velY * 0.6 + (dy / dt) * 0.4;
      lastT = now;
    }
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    down = false;
    if (dragging) {
      suppress = true;
      if (motion) {
        tx += velX * 260;
        ty += velY * 260;
      }
      mesa.classList.remove('is-dragging');
      if (mesa.hasPointerCapture(e.pointerId)) mesa.releasePointerCapture(e.pointerId);
    }
    dragging = false;
  };
  const onClickCapture = (e: MouseEvent) => {
    if (suppress) {
      e.preventDefault();
      e.stopPropagation();
      suppress = false;
    }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    fold();
    const f = e.deltaMode === 1 ? 32 : 1;
    tx -= e.deltaX * f;
    ty -= e.deltaY * f;
  };

  // ── Hover: elevar la diapositiva bajo el cursor ──
  let hovered: MesaItem | null = null;
  function setHover(it: MesaItem | null) {
    if (it === hovered) return;
    if (hovered) gsap.to(hovered, { lift: 0, duration: 0.35, ease: 'power3.out' });
    hovered = it;
    if (it) gsap.to(it, { lift: 1, duration: 0.35, ease: 'power3.out' });
    wake(450);
  }
  function hover(e: PointerEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.slide');
    setHover(el ? (items.find((i) => i.el === el) ?? null) : null);
  }
  const onLeave = () => {
    setHover(null);
    px = py = -1;
    showLoupe(false);
  };

  // ── Teclado ──
  function center(it: MesaItem, immediate = false) {
    tx += vw / 2 - it.cx;
    ty += vh / 2 - (it.cy + 6 * it.lift);
    if (immediate) {
      ox = tx;
      oy = ty;
      render();
    }
  }
  const onKey = (e: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key)) return;
    fold();
    const cur = items.find((i) => i.link === document.activeElement);
    const pool = items.filter((i) => i.alpha > 0.5 && i !== cur);
    if (!cur) {
      const first = pool.sort((a, b) => Math.hypot(a.cx - vw / 2, a.cy - vh / 2) - Math.hypot(b.cx - vw / 2, b.cy - vh / 2))[0];
      if (first) {
        e.preventDefault();
        first.link.focus({ preventScroll: true });
      }
      return;
    }
    e.preventDefault();
    const dirX = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const dirY = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    let best: MesaItem | null = null,
      score = Infinity;
    for (const it of pool) {
      const dx = it.cx - cur.cx,
        dy = it.cy - cur.cy;
      const along = dx * dirX + dy * dirY;
      if (along < S * 0.3) continue;
      const across = Math.abs(dx * dirY) + Math.abs(dy * dirX);
      const s = along + across * 2.2;
      if (s < score) {
        score = s;
        best = it;
      }
    }
    if (best) best.link.focus({ preventScroll: true });
  };
  const onFocusIn = (e: FocusEvent) => {
    const it = items.find((i) => i.link === e.target);
    if (it && filter === 'all') center(it);
    mesa.scrollLeft = 0;
    mesa.scrollTop = 0;
  };
  const onScroll = () => {
    mesa.scrollLeft = 0;
    mesa.scrollTop = 0;
  };

  // ── Filtros ──
  const onFilter = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-filter]');
    if (!a) return;
    e.preventDefault();
    fold();
    filter = a.dataset.filter ?? 'all';
    nav?.querySelectorAll('[data-filter]').forEach((x) => x.removeAttribute('aria-current'));
    a.setAttribute('aria-current', 'true');
    let count = 0;
    for (const it of items) {
      const on = filter === 'all' || it.section === filter;
      if (on) count++;
      it.el.classList.toggle('is-out', !on);
      it.link.tabIndex = on ? 0 : -1;
      if (on) it.el.removeAttribute('aria-hidden');
      else it.el.setAttribute('aria-hidden', 'true');
    }
    // la ficha plegada cambia el área útil: medir después de plegar
    requestAnimationFrame(() => assign(true));
    if (status) {
      const name = a.textContent?.replace(/\d+/g, '').trim() ?? '';
      status.textContent = root.lang === 'en' ? `Showing ${count} photos: ${name}` : `Mostrando ${count} fotos: ${name}`;
    }
  };

  // ── Arranque ──
  measure();
  ox = tx = 0;
  oy = ty = 0;
  assign(false);
  render(); // mismo frame que mesa-live: posiciones y opacidades correctas desde el primer pintado

  // Vuelta desde una serie (o Escape): centrar y enfocar la diapositiva de la que se salió
  let restoreId: string | null = null;
  try {
    restoreId = sessionStorage.getItem(FOCUS_KEY);
    sessionStorage.removeItem(FOCUS_KEY);
  } catch {
    /* sin almacenamiento */
  }
  if (restoreId) {
    const it = items.find((i) => i.link.dataset.vtId === restoreId);
    if (it) {
      center(it, true);
      it.link.focus({ preventScroll: true });
    }
  }

  if (!runIntro) root.classList.remove('intro-pending');
  else {
    const Rn = Math.hypot(vw, vh) / 2;
    items.forEach((it) => {
      const d = Math.hypot(it.cx - vw / 2, it.cy - vh / 2) / Rn;
      gsap.to(it, { drop: 1, duration: 0.7, ease: 'power3.out', delay: 0.45 + Math.min(1.2, d) * 0.5 });
    });
    wake(2200);
    setTimeout(() => root.classList.remove('intro-run', 'intro-pending'), 1300);
  }

  gsap.ticker.add(tick);
  mesa.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  mesa.addEventListener('pointerleave', onLeave);
  mesa.addEventListener('click', onClickCapture, true);
  mesa.addEventListener('wheel', onWheel, { passive: false });
  mesa.addEventListener('keydown', onKey);
  mesa.addEventListener('focusin', onFocusIn);
  mesa.addEventListener('scroll', onScroll);
  nav?.addEventListener('click', onFilter);
  const onResize = () => {
    measure();
    assign(false);
  };
  window.addEventListener('resize', onResize);
  // Arrastrar una imagen nativa rompería el gesto
  const noDrag = (e: DragEvent) => e.preventDefault();
  mesa.addEventListener('dragstart', noDrag);

  return {
    items,
    size: () => S,
    velocity: () => ({ x: vx, y: vy }),
    onFrame(fn) {
      frameFns.add(fn);
      return () => frameFns.delete(fn);
    },
    invalidate: (ms = 120) => wake(ms),
    destroy() {
      gsap.ticker.remove(tick);
      if (loupe) {
        gsap.killTweensOf(loupe);
        loupe.style.removeProperty('opacity');
        loupe.style.removeProperty('transform');
      }
      items.forEach((it) => {
        gsap.killTweensOf(it);
        it.el.style.removeProperty('transform');
        it.el.style.removeProperty('opacity');
        it.el.style.removeProperty('z-index');
        it.el.classList.remove('is-out');
        it.el.removeAttribute('aria-hidden');
        it.link.tabIndex = 0;
      });
      boxLinks.forEach((a) => a.removeAttribute('tabindex'));
      mesa.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      mesa.removeEventListener('pointerleave', onLeave);
      mesa.removeEventListener('click', onClickCapture, true);
      mesa.removeEventListener('wheel', onWheel);
      mesa.removeEventListener('keydown', onKey);
      mesa.removeEventListener('focusin', onFocusIn);
      mesa.removeEventListener('scroll', onScroll);
      mesa.removeEventListener('dragstart', noDrag);
      nav?.removeEventListener('click', onFilter);
      window.removeEventListener('resize', onResize);
      frameFns.clear();
      mesa.classList.remove('is-loupe', 'is-dragging');
      intro?.classList.remove('is-folded');
      root.classList.remove('mesa-live', 'intro-run', 'webgl');
    },
  };
}
