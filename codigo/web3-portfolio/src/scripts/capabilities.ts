/** Decide qué capa de mejora progresiva se activa. Ver docs/PLAN.md §3. */
export interface Caps {
  motion: boolean; // sin prefers-reduced-motion
  wide: boolean; // ≥1024 px y puntero fino: mesa viva, Lenis, SplitText
  webgl: boolean; // capa 2 permitida
}

export const GL_OFF_KEY = 'gl-off';

// El sondeo de WebGL2 se hace UNA vez por sesión de página (variable de módulo) y libera el contexto:
// sin esto cada navegación con View Transitions dejaba contextos vivos hasta el límite del navegador.
let webgl2Probe: boolean | null = null;
function hasWebGL2(): boolean {
  if (webgl2Probe !== null) return webgl2Probe;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    webgl2Probe = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Probe = false;
  }
  return webgl2Probe;
}

function glDisabledThisSession(): boolean {
  try {
    return sessionStorage.getItem(GL_OFF_KEY) === '1';
  } catch {
    return false;
  }
}

export function detect(): Caps {
  const mq = (q: string) => window.matchMedia(q).matches;
  const motion = !mq('(prefers-reduced-motion: reduce)');
  const wide = motion && mq('(min-width: 1024px) and (pointer: fine)');
  const nav = navigator as Navigator & { deviceMemory?: number };
  // primero lo barato; el contexto WebGL solo se crea si todo lo demás pasa
  const webgl =
    wide &&
    (navigator.hardwareConcurrency ?? 0) >= 4 &&
    (nav.deviceMemory === undefined || nav.deviceMemory >= 4) &&
    !glDisabledThisSession() &&
    hasWebGL2();
  return { motion, wide, webgl };
}

/** El monitor de fps apagó la capa 2: se recuerda para el resto de la sesión. */
export function rememberGLOff(): void {
  try {
    sessionStorage.setItem(GL_OFF_KEY, '1');
  } catch {
    /* sin almacenamiento */
  }
}
