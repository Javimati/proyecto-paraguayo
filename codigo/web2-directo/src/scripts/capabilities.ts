/** Decide qué capa de mejora progresiva se activa. Ver docs/PLAN.md §3. */
export interface Caps {
  motion: boolean; // sin prefers-reduced-motion
  wide: boolean; // ≥1024 px y puntero fino: Lenis y capa 2 posible
  webgl: boolean; // capa 2 permitida
}

const GL_OFF = 'directo:gl-off';
let webgl2: boolean | null = null; // sondeo una sola vez por sesión de página

function glOff(): boolean {
  try {
    return sessionStorage.getItem(GL_OFF) === '1';
  } catch {
    return false;
  }
}
/** El monitor de fps apagó la capa 2: no se vuelve a intentar en esta sesión. */
export function rememberGLOff() {
  try {
    sessionStorage.setItem(GL_OFF, '1');
  } catch {
    /* sin almacenamiento: solo dura esta página */
  }
}

export function detect(): Caps {
  const mq = (q: string) => window.matchMedia(q).matches;
  const motion = !mq('(prefers-reduced-motion: reduce)');
  const wide = motion && mq('(min-width: 1024px) and (pointer: fine)');
  const nav = navigator as Navigator & { deviceMemory?: number };
  // Primero lo barato: si cualquiera falla, no se crea ningún contexto
  const cheap =
    wide &&
    (navigator.hardwareConcurrency ?? 0) >= 4 &&
    (nav.deviceMemory === undefined || nav.deviceMemory >= 4) &&
    !glOff();
  if (cheap && webgl2 === null) {
    try {
      const g = document.createElement('canvas').getContext('webgl2');
      webgl2 = !!g;
      g?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webgl2 = false;
    }
  }
  return { motion, wide, webgl: cheap && webgl2 === true };
}
