/** Marcas de lápiz graso: se dibujan una vez, escalonadas, cuando entran en pantalla. */
export function initMarks(after: Promise<void>): () => void {
  const marks = document.querySelectorAll<SVGElement>('.mark:not(.is-drawn)');
  if (!marks.length) return () => {};
  let io: IntersectionObserver | null = null;
  let alive = true;
  after.then(() => {
    if (!alive) return;
    io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const el = en.target as SVGElement;
          el.style.setProperty('--delay', `${i++ * 140}ms`);
          el.classList.add('is-drawn');
          io?.unobserve(el);
        }
      },
      { threshold: 0.5 },
    );
    marks.forEach((m) => io!.observe(m));
  });
  return () => {
    alive = false;
    io?.disconnect();
  };
}
