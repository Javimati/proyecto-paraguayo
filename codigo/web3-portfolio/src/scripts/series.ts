/**
 * Serie: contador, barra mínima al subir, luz ambiente según la foto en pantalla,
 * foco en la foto de destino y Escape para volver a la mesa (a la misma diapositiva).
 */
export const FOCUS_KEY = 'mesa-focus';

export function initSeries(navigate: (href: string) => Promise<void>): () => void {
  const series = document.querySelector<HTMLElement>('[data-series]');
  if (!series) return () => {};
  const home = series.dataset.home ?? '/';
  const counter = document.querySelector<HTMLElement>('[data-counter-current]');
  const barCount = document.querySelector<HTMLElement>('[data-bar-current]');
  const bar = document.querySelector<HTMLElement>('[data-bar]');
  const reel = document.querySelector<HTMLElement>('[data-reel]');
  const head = document.querySelector<HTMLElement>('.series__head');
  const shots = Array.from(document.querySelectorAll<HTMLElement>('[data-shot]'));
  const body = document.body;
  const mobile = window.matchMedia('(max-width: 1023px)').matches;
  let current: HTMLElement | null = shots[0] ?? null;

  const setCurrent = (el: HTMLElement) => {
    current = el;
    const n = String(el.dataset.shot).padStart(2, '0');
    if (counter) counter.textContent = n;
    if (barCount) barCount.textContent = n;
    if (el.dataset.ambient) body.style.setProperty('--bg', el.dataset.ambient);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) if (en.isIntersecting) setCurrent(en.target as HTMLElement);
    },
    mobile && reel ? { root: reel, threshold: 0.6 } : { rootMargin: '-45% 0px -45% 0px' },
  );
  shots.forEach((s) => io.observe(s));

  // Llegada con ancla (#f-03): en móvil la tira es horizontal → se desplaza la tira, no la página,
  // para que la cabecera de la serie (título) siga a la vista.
  const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
  if (target && target.matches('[data-shot]')) {
    if (mobile && reel) {
      reel.scrollLeft = target.offsetLeft - reel.offsetLeft - parseFloat(getComputedStyle(reel).scrollPaddingLeft || '0');
      window.scrollTo(0, 0);
    }
    setCurrent(target);
    // foco para el lector de pantalla (lee esa foto y su pie); sin anillo si no se llegó con teclado
    const fig = target.querySelector<HTMLElement>('figure');
    if (fig) {
      fig.classList.add('is-arrival');
      fig.addEventListener('blur', () => fig.classList.remove('is-arrival'), { once: true });
      fig.focus({ preventScroll: true });
    }
  }

  // Barra mínima: visible al subir una vez pasada la cabecera
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const past = head ? y > head.offsetTop + head.offsetHeight : y > 300;
    bar?.classList.toggle('is-shown', past && y < lastY - 2);
    if (y > lastY + 2 || !past) bar?.classList.remove('is-shown');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const remember = () => {
    const id = current?.querySelector<HTMLElement>('[data-vt-id]')?.dataset.vtId;
    try {
      if (id) sessionStorage.setItem(FOCUS_KEY, id);
    } catch {
      /* sin almacenamiento */
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    remember();
    navigate(home);
  };
  // «Volver a la mesa» (y la barra) también recuerdan la foto
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a');
    if (a && new URL(a.href, location.href).pathname === new URL(home, location.href).pathname) remember();
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onClick);
  return () => {
    io.disconnect();
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onClick);
    body.style.removeProperty('--bg');
  };
}
