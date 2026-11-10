/** Setlist: un show activo cada vez (hover o foco). El escenario muestra su foto. */
const LAST = 'directo:last-show';

export function rememberShow(slug: string) {
  try {
    sessionStorage.setItem(LAST, slug);
  } catch {
    /* nada */
  }
}

export function initSetlist(opts: { restoreFocus: boolean }): () => void {
  const list = document.querySelector<HTMLElement>('[data-setlist]');
  if (!list) return () => {};
  const shows = Array.from(list.querySelectorAll<HTMLElement>('[data-show]'));
  if (!shows.length) return () => {};
  const links = shows.map((s) => s.querySelector<HTMLElement>('[data-show-link]')!);

  // El escenario fijo alinea su borde superior con el del papel
  const paper = document.querySelector<HTMLElement>('[data-paper]');
  const alignStage = () => {
    if (!paper || scrollY > 4) return;
    const top = Math.round(paper.getBoundingClientRect().top);
    if (top > 0) document.documentElement.style.setProperty('--stage-top', `${top}px`);
  };
  alignStage();
  window.addEventListener('resize', alignStage);

  let active: HTMLElement | null = null;
  const set = (s: HTMLElement) => {
    if (s === active) return;
    active?.classList.remove('is-active');
    s.classList.add('is-active');
    active = s;
    list.dispatchEvent(new CustomEvent('show:change', { detail: { index: shows.indexOf(s), el: s } }));
  };

  // Al volver de un evento, el show abierto queda activo y enfocado
  let start = shows[0];
  if (opts.restoreFocus) {
    let slug: string | null = null;
    try {
      slug = sessionStorage.getItem(LAST);
    } catch {
      slug = null;
    }
    const found = shows.find((s) => s.dataset.slug === slug);
    if (found) start = found;
  }
  set(start);
  if (opts.restoreFocus) start.querySelector<HTMLElement>('[data-show-link]')?.focus({ preventScroll: true });

  const onOver = (e: Event) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>('[data-show]');
    if (s) set(s);
  };
  const onClick = (e: Event) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>('[data-show]');
    if (s?.dataset.slug) rememberShow(s.dataset.slug);
  };
  list.addEventListener('pointerover', onOver);
  list.addEventListener('focusin', onOver);
  list.addEventListener('click', onClick);

  // Flechas arriba/abajo, Inicio y Fin entre shows (Enter abre: es un enlace)
  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const i = links.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const n =
      e.key === 'Home' ? links[0] : e.key === 'End' ? links[links.length - 1] : links[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (n) {
      e.preventDefault();
      n.focus();
    }
  };
  list.addEventListener('keydown', onKey);
  return () => {
    window.removeEventListener('resize', alignStage);
    list.removeEventListener('pointerover', onOver);
    list.removeEventListener('focusin', onOver);
    list.removeEventListener('click', onClick);
    list.removeEventListener('keydown', onKey);
  };
}
