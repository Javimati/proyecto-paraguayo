/** Decide qué capa de mejora progresiva se activa. Ver docs/PLAN.md §3. */
export interface Caps {
  motion: boolean; // sin prefers-reduced-motion
  wide: boolean; // ≥1024 px y puntero fino: lupa, Lenis, entrada del titular
  webgl: boolean; // capa 2 permitida
}

// El sondeo de WebGL2 crea un contexto: se hace UNA vez por sesión y se libera enseguida.
let webgl2Probe: boolean | undefined;
function hasWebGL2(): boolean {
  if (webgl2Probe !== undefined) return webgl2Probe;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    webgl2Probe = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Probe = false;
  }
  return webgl2Probe;
}

/** La capa 2 se apagó por rendimiento en esta sesión: no se vuelve a intentar. */
export function markGLOff() {
  try {
    sessionStorage.setItem('gl-off', '1');
  } catch {
    /* almacenamiento no disponible */
  }
}
function glOff(): boolean {
  try {
    return sessionStorage.getItem('gl-off') === '1';
  } catch {
    return false;
  }
}

export function detect(): Caps {
  const mq = (q: string) => window.matchMedia(q).matches;
  const motion = !mq('(prefers-reduced-motion: reduce)');
  const wide = motion && mq('(min-width: 1024px) and (pointer: fine)');
  const nav = navigator as Navigator & { deviceMemory?: number };
  // primero los checks baratos; el contexto WebGL solo si todo lo demás pasa
  const webgl =
    wide &&
    (navigator.hardwareConcurrency ?? 0) >= 4 &&
    (nav.deviceMemory === undefined || nav.deviceMemory >= 4) &&
    !glOff() &&
    hasWebGL2();
  return { motion, wide, webgl };
}
