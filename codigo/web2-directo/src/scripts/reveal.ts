/** Revelado: añade .is-revealed al entrar en pantalla (la animación vive en CSS). */
export function initReveal(): () => void {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)');
  if (!els.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add('is-revealed');
        io.unobserve(en.target);
      }
    },
    { rootMargin: '0px 0px 25% 0px', threshold: 0 },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
