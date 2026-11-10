/**
 * Pie de foto en teletipo. Solo toca la copia visible (aria-hidden): el texto accesible
 * está entero en el DOM desde el principio.
 */
const CPS = 420; // caracteres por segundo
const MAX_MS = 900; // ningún pie tarda más de esto

export function initTeletype(delayMs = 0): () => void {
  const caps = document.querySelectorAll<HTMLElement>('[data-teletype]:not(.is-typed)');
  if (!caps.length) return () => {};
  const rafs = new Set<number>();
  const restore: (() => void)[] = [];

  const type = (fig: HTMLElement) => {
    const wire = fig.querySelector<HTMLElement>('.caption__wire');
    if (!wire) return;
    const full = wire.textContent ?? '';
    const node = document.createTextNode('');
    wire.textContent = '';
    wire.append(node);
    wire.classList.add('is-typing');
    fig.classList.add('is-typed');
    const duration = Math.min(MAX_MS, (full.length / CPS) * 1000);
    const t0 = performance.now();
    restore.push(() => {
      wire.textContent = full;
      wire.classList.remove('is-typing');
    });
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      node.data = full.slice(0, Math.round(full.length * p));
      if (p < 1) {
        const id = requestAnimationFrame(step);
        rafs.add(id);
      } else {
        setTimeout(() => wire.classList.remove('is-typing'), 500);
      }
    };
    rafs.add(requestAnimationFrame(step));
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        io.unobserve(en.target);
        type(en.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  // Si se llega con la transición hoja → serie, no se escribe hasta que termine
  const start = setTimeout(() => caps.forEach((c) => io.observe(c)), delayMs);
  return () => {
    clearTimeout(start);
    io.disconnect();
    rafs.forEach(cancelAnimationFrame);
    restore.forEach((r) => r());
  };
}
