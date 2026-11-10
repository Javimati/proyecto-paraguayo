/** Evento: contador «Tema 03/08» (su borde toma el gel de la foto en pantalla) y Escape para volver. */
export function initEventNav(navigate: (href: string) => Promise<void>): () => void {
  const ev = document.querySelector<HTMLElement>('[data-event]');
  if (!ev) return () => {};
  const home = ev.dataset.home ?? '/';
  const counter = document.querySelector<HTMLElement>('[data-counter]');
  const shots = document.querySelectorAll<HTMLElement>('[data-shot]');
  const film = document.querySelector<HTMLElement>('[data-film]');
  const mobile = matchMedia('(max-width: 1023px)').matches;
  // En la tira horizontal móvil el tema activo es el que ocupa el centro horizontal
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target as HTMLElement;
        if (counter) counter.textContent = String(el.dataset.shot).padStart(2, '0');
        if (el.dataset.gel) document.body.style.setProperty('--ambient', el.dataset.gel);
      }
    },
    mobile && film ? { root: film, rootMargin: '0px -45% 0px -45%' } : { rootMargin: '-45% 0px -45% 0px' },
  );
  shots.forEach((s) => io.observe(s));
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    navigate(home);
  };
  document.addEventListener('keydown', onKey);
  return () => {
    io.disconnect();
    document.removeEventListener('keydown', onKey);
    document.body.style.removeProperty('--ambient');
  };
}
