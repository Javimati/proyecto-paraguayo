/**
 * Revelado: añade .is-revealed al entrar en pantalla (la animación vive en CSS).
 * Con scroll muy rápido se revela sin animación (.no-anim): no hay tiempo para verlo.
 */
export function initReveal(): () => void {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)');
  if (!els.length) return () => {};
  let lastY = window.scrollY;
  let lastT = performance.now();
  let speed = 0; // px/ms
  const onScroll = () => {
    const now = performance.now();
    const dt = Math.max(now - lastT, 1);
    speed = Math.abs(window.scrollY - lastY) / dt;
    lastY = window.scrollY;
    lastT = now;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  const io = new IntersectionObserver(
    (entries) => {
      const fast = speed > 4 && performance.now() - lastT < 120;
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        if (fast) en.target.classList.add('no-anim');
        en.target.classList.add('is-revealed');
        io.unobserve(en.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
  );
  els.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    window.removeEventListener('scroll', onScroll);
  };
}
