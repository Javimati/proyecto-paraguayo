/** Serie: contador de fotograma y Escape para volver a la hoja de contactos. */
export function initSeriesNav(navigate: (href: string) => Promise<void>): () => void {
  const series = document.querySelector<HTMLElement>('[data-series]');
  if (!series) return () => {};
  const home = series.dataset.home ?? '/';
  const counter = document.querySelector<HTMLElement>('[data-counter-current]');
  const shots = document.querySelectorAll<HTMLElement>('[data-shot]');

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting && counter) {
          counter.textContent = String((en.target as HTMLElement).dataset.shot).padStart(2, '0');
        }
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
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
  };
}
