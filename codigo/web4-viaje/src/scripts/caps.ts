/**
 * Detección de gama para la web 4 (ver CONTRACT.md).
 * none = sin WebGL2, reduced motion o la experiencia se apagó por fps en esta sesión → historia 2D
 * low  = móvil / equipo flojo → historia 2D
 * mid  = móvil potente o portátil modesto → 3D reducida
 * high = escritorio capaz → 3D completa
 */
export type Tier = 'high' | 'mid' | 'low' | 'none';

let webgl2Cache: boolean | null = null;

/** Sondeo de WebGL2 una sola vez por sesión de página; libera el contexto al momento. */
function hasWebGL2(): boolean {
  if (webgl2Cache !== null) return webgl2Cache;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    webgl2Cache = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Cache = false;
  }
  return webgl2Cache;
}

function sessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markGlOff(): void {
  try {
    sessionStorage.setItem('gl-off', '1');
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function detectTier(): Tier {
  // Solo para pruebas: ?tier=high|mid|low|none fuerza la gama (documentado en README)
  try {
    const forced = new URLSearchParams(location.search).get('tier');
    if (forced === 'high' || forced === 'mid' || forced === 'low' || forced === 'none') return forced;
  } catch {
    /* sin URL: seguir */
  }
  const mq = (q: string) => window.matchMedia(q).matches;
  if (mq('(prefers-reduced-motion: reduce)')) return 'none';
  if (sessionFlag('gl-off')) return 'none';

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return 'low';
  const cores = navigator.hardwareConcurrency ?? 2;
  const mem = nav.deviceMemory; // undefined en Safari/Firefox
  const coarse = mq('(pointer: coarse)');
  const width = window.innerWidth;

  // Checks baratos antes de crear ningún contexto WebGL
  // En móvil Safari puede capar los núcleos que informa: ahí solo se descartan los claramente flojos
  if (cores < (coarse ? 2 : 4) || (mem !== undefined && mem < 4)) return 'low';
  if (!hasWebGL2()) return 'none';

  if (coarse || width < 1024) {
    // Móvil o tablet con WebGL2: 3D reducida. Safari (iPhone) informa de pocos núcleos y no da la memoria,
    // así que antes nunca entraba; si va lento, el vigilante de fps lo pasa a la versión sin animación.
    return 'mid';
  }
  if (cores >= 8 && (mem === undefined || mem >= 8)) return 'high';
  return 'mid';
}
