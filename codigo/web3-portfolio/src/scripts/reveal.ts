/** Proyector: cada foto de la serie "se enciende" al entrar (la animación vive en CSS). */
export function initReveal(): () => void {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)');
  if (!els.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
