/**
 * Filtro de la rejilla (móvil y escritorio sin mesa viva). Sin Flip ni GSAP: alterna `hidden`
 * en el mismo frame del clic (el cambio de layout queda dentro de la ventana de interacción,
 * no cuenta como CLS) y las que entran aparecen con un fundido de opacidad en CSS.
 */
export function announce(count: number, a: HTMLElement): string {
  const name = a.textContent?.replace(/\d+/g, '').trim() ?? '';
  return document.documentElement.lang === 'en' ? `Showing ${count} photos: ${name}` : `Mostrando ${count} fotos: ${name}`;
}

export function initGridFilter({ motion }: { motion: boolean }): () => void {
  const nav = document.querySelector<HTMLElement>('[data-filters]');
  const status = document.querySelector<HTMLElement>('[data-filter-status]');
  if (!nav) return () => {};
  const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-mesa] .slide'));
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('[data-box]'));

  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-filter]');
    if (!a) return;
    e.preventDefault();
    const f = a.dataset.filter!;
    nav.querySelectorAll('[data-filter]').forEach((x) => x.removeAttribute('aria-current'));
    a.setAttribute('aria-current', 'true');
    let count = 0;
    for (const s of slides) {
      const on = f === 'all' || s.dataset.section === f;
      const wasHidden = s.hidden;
      s.hidden = !on;
      if (on) count++;
      if (motion && on && wasHidden) {
        s.classList.remove('is-entering');
        void s.offsetWidth;
        s.classList.add('is-entering');
      }
    }
    for (const b of boxes) b.hidden = f !== 'all' && b.dataset.box !== f;
    if (status) status.textContent = announce(count, a);
    document.querySelector('[data-mesa]')?.scrollIntoView({ block: 'start', behavior: motion ? 'smooth' : 'auto' });
  };
  nav.addEventListener('click', onClick);
  return () => nav.removeEventListener('click', onClick);
}
