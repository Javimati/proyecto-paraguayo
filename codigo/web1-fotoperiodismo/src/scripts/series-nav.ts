/**
 * Serie: barra fina superior (rollo / título / fotograma / volver), contador de fotograma
 * y Escape para volver a la hoja de contactos, al fotograma de la foto que se estaba viendo.
 */
export function initSeriesNav(navigate: (href: string) => Promise<void>): () => void {
  const series = document.querySelector<HTMLElement>('[data-series]');
  if (!series) return () => {};
  const home = series.dataset.home ?? '/';
  const counter = document.querySelector<HTMLElement>('[data-counter-current]');
  const bar = document.querySelector<HTMLElement>('[data-seriesbar]');
  const head = document.querySelector<HTMLElement>('.series__head');
  const shots = Array.from(document.querySelectorAll<HTMLElement>('[data-shot]'));
  let current = shots[0];

  const setCurrent = (el: HTMLElement) => {
    current = el;
    if (counter) counter.textContent = String(el.dataset.shot).padStart(2, '0');
  };

  // En escritorio la tira es vertical; en móvil, horizontal: observamos ambos ejes
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) if (en.isIntersecting) setCurrent(en.target as HTMLElement);
    },
    { rootMargin: '-45% -45% -45% -45%' },
  );
  shots.forEach((s) => io.observe(s));

  // La barra aparece cuando la cabecera de la serie sale de pantalla
  let headIO: IntersectionObserver | null = null;
  if (bar && head) {
    headIO = new IntersectionObserver(([en]) => bar.classList.toggle('is-on', !en.isIntersecting), {
      threshold: 0,
    });
    headIO.observe(head);
  }

  const backHref = () => {
    const id = current?.querySelector<HTMLElement>('[data-vt-id]')?.dataset.vtId;
    return id ? `${home}#fr-${id}` : home;
  };
  const back = document.querySelectorAll<HTMLAnchorElement>('[data-back]');
  const updateBack = () => back.forEach((a) => (a.href = backHref()));
  back.forEach((a) => a.addEventListener('pointerenter', updateBack));
  back.forEach((a) => a.addEventListener('focus', updateBack));

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    navigate(backHref());
  };
  document.addEventListener('keydown', onKey);
  return () => {
    io.disconnect();
    headIO?.disconnect();
    document.removeEventListener('keydown', onKey);
  };
}
