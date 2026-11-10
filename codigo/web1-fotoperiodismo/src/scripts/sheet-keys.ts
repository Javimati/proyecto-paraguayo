/** Hoja de contactos con teclado: flechas entre fotogramas (Enter abre: es un enlace). */
export function initSheetKeys(): () => void {
  const sheet = document.querySelector<HTMLElement>('[data-sheet]');
  if (!sheet) return () => {};
  // Al volver de una serie (#fr-…), el foco queda en el fotograma de la foto que se veía
  if (location.hash.startsWith('#fr-')) {
    const back = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    back?.focus({ preventScroll: true });
  }
  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const current = (e.target as HTMLElement).closest<HTMLElement>('[data-frame]');
    if (!current) return;
    const frames = Array.from(sheet.querySelectorAll<HTMLElement>('[data-frame]'));
    const i = frames.indexOf(current);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowRight') next = frames[i + 1];
    else if (e.key === 'ArrowLeft') next = frames[i - 1];
    else if (e.key === 'Home') next = frames[0];
    else if (e.key === 'End') next = frames[frames.length - 1];
    else {
      const r = current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const down = e.key === 'ArrowDown';
      let best = Infinity;
      for (const f of frames) {
        const fr = f.getBoundingClientRect();
        const dy = down ? fr.top - r.bottom : r.top - fr.bottom;
        if (dy < -2) continue;
        const score = dy * 4 + Math.abs(fr.left + fr.width / 2 - cx);
        if (score < best) {
          best = score;
          next = f;
        }
      }
    }
    if (next) {
      e.preventDefault();
      next.focus();
      next.scrollIntoView({ block: 'nearest' });
    }
  };
  sheet.addEventListener('keydown', onKey);
  return () => sheet.removeEventListener('keydown', onKey);
}
