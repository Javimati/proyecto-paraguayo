/**
 * Shaders propios. Regla de oro: el interior de una foto se dibuja con sus píxeles tal cual
 * (texturas sin conversión de espacio de color, sin iluminación, sin tone mapping). Todo lo que
 * "da ambiente" (niebla, haz, grano, viñeta) va fuera de la foto o se aplica solo cuando la foto está lejos.
 */

/* ───────── Foto: plano sin iluminación con marco fino ───────── */
export const PHOTO_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const PHOTO_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform float uReveal;     // 0..1 aparición del plano (tras la nube de puntos)
  uniform vec2 uMargin;      // margen del marco en unidades UV del plano
  uniform vec3 uFog;         // color de niebla del capítulo
  uniform vec2 uFogRange;    // inicio / fin de la niebla en distancia
  uniform float uGlow;       // brillo del filo del marco (haz encima, hover)
  uniform float uHero;       // 1 = foto en el lightbox / foto activa: nunca niebla
  uniform float uLum;        // 1 = foto activa (píxeles tal cual) · <1 = foto secundaria atenuada
  uniform float uDevelop;    // 1 = revelada (tal cual) · <1 = papel sin revelar (capítulo «Lo que viene»)
  uniform float uFade;       // 0..1 los planos que la cámara atraviesa se deshacen en ascuas (recuerdo que se va)
  uniform float uSoft;       // 0..1 recuerdo lejano: desenfocado; 0 en reposo (foto intacta)
  uniform vec2 uAspect;      // ancho/alto del plano (para el grano del deshacer)
  varying vec2 vUv;
  varying float vDist;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float n21(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec2 inner = (vUv - uMargin) / (1.0 - 2.0 * uMargin);
    bool inImage = all(greaterThanEqual(inner, vec2(0.0))) && all(lessThanEqual(inner, vec2(1.0)));
    vec3 col;
    if (inImage) {
      col = uHasTex > 0.5 ? texture2D(uTex, inner).rgb : vec3(0.02);
      if (uSoft > 0.01 && uHasTex > 0.5) {
        // enfoque de recuerdo: anillo de 8 muestras, solo mientras la foto no es la activa
        vec3 acc = col;
        float rad = uSoft * 0.014;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398 + 0.39;
          acc += texture2D(uTex, inner + vec2(cos(a), sin(a) * uAspect.x) * rad).rgb;
        }
        col = acc / 9.0;
      }
      if (uDevelop < 0.999) {
        // revelado: las sombras aparecen antes que las luces sobre papel claro
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        float k = smoothstep(0.0, 1.0, uDevelop * 1.55 - l * 0.55);
        col = mix(vec3(0.80, 0.79, 0.75), col, k);
      }
      col *= uLum;
    } else {
      // marco: papel muy oscuro con un filo de luz en el borde exterior
      vec2 e = min(vUv, 1.0 - vUv) / uMargin;       // 0 en el borde exterior, 1 en el interior
      float edge = 1.0 - smoothstep(0.0, 0.35, min(e.x, e.y));
      col = vec3(0.055, 0.055, 0.06) + vec3(0.9, 0.86, 0.78) * edge * (0.10 + 0.55 * uGlow);
    }
    // niebla por distancia: lejos se funde con el espacio; cerca (y en el lightbox) la foto queda intacta
    float fog = (1.0 - uHero) * smoothstep(uFogRange.x, uFogRange.y, vDist);
    col = mix(col, uFog, fog);
    float alpha = uReveal;
    if (uFade < 0.999) {
      // se deshace en ascuas desde los bordes, con el filo encendido
      float n = n21(vUv * uAspect * 7.0) * 0.65 + n21(vUv * uAspect * 23.0) * 0.35;
      n = n * 0.85 + (1.0 - min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)) * 2.0) * 0.15;
      float th = uFade * 1.12 - 0.06;
      float keep = smoothstep(n - 0.015, n + 0.015, th);
      float ember = (1.0 - smoothstep(0.0, 0.07, th - n)) * keep * step(0.001, uFade);
      col = mix(col, vec3(1.0, 0.52, 0.18) * 1.6, ember);
      alpha *= keep;
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ───────── Nube de puntos que muestrea la foto y se condensa en ella ───────── */
export const POINTS_VERT = /* glsl */ `
  attribute vec2 aGrid;
  attribute vec4 aRand;
  uniform sampler2D uTex;
  uniform float uProgress;
  uniform vec2 uScale;       // tamaño del plano (el objeto hereda la escala del plano)
  uniform float uCell;       // tamaño de celda en unidades de mundo
  uniform float uViewportH;
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = aRand.w * 0.3;
    float p = clamp((uProgress - d) / 0.7, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - p, 3.0);
    vec3 target = vec3(aGrid - 0.5, 0.0);
    // salida dispersa: nube en abanico delante del plano, en unidades de mundo convertidas a locales
    vec3 scatter = (aRand.xyz * vec3(0.9, 0.7, 0.45) + vec3(0.0, 0.0, 0.35)) / vec3(uScale, 1.0);
    float swirl = (1.0 - e) * 1.8;
    vec3 s = vec3(cos(swirl + aRand.x * 6.0), sin(swirl + aRand.y * 6.0), 0.0) * (1.0 - e) * 0.25 / vec3(uScale, 1.0);
    vec3 pos = mix(target + scatter, target, e) + s;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = uCell * projectionMatrix[1][1] * uViewportH * 0.5 / max(-mv.z, 0.01);
    gl_PointSize = clamp(mix(px * 0.35, px * 1.15, e), 1.0, 64.0);
    vColor = texture2D(uTex, aGrid).rgb;
    vAlpha = smoothstep(0.0, 0.15, p) * (1.0 - smoothstep(0.82, 1.0, uProgress));
  }
`;

export const POINTS_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c);
    if (r > 0.25) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

/* ───────── Polvo en el haz de la linterna ───────── */
export const DUST_VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform vec3 uCam;
  uniform vec3 uBeamDir;
  uniform float uTime;
  uniform float uBox;
  uniform float uPixelRatio;
  varying float vLight;
  varying float vFade;

  void main() {
    vec3 p = aSeed.xyz * uBox;
    p += vec3(sin(uTime * 0.11 + aSeed.w * 30.0), cos(uTime * 0.07 + aSeed.w * 20.0), sin(uTime * 0.05 + aSeed.w * 10.0)) * 0.6;
    // caja que acompaña a la cámara (envolvente)
    vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
    // distancia al eje del haz: dentro del cono el polvo brilla y se agita
    float along = max(dot(rel, uBeamDir), 0.0);
    float radial = length(rel - uBeamDir * along);
    float cone = 0.25 + along * 0.22;
    float inBeam = 1.0 - smoothstep(cone * 0.4, cone, radial);
    rel += normalize(rel - uBeamDir * along + 1e-4) * inBeam * 0.18 * sin(uTime * 2.0 + aSeed.w * 40.0);
    vec4 mv = viewMatrix * vec4(uCam + rel, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = clamp((1.6 + inBeam * 2.4) * uPixelRatio * 6.0 / max(depth, 0.5), 1.0, 9.0);
    vLight = 0.06 + inBeam * smoothstep(0.0, 1.5, along) * 0.9;
    vFade = smoothstep(0.3, 1.2, depth) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, depth));
  }
`;

export const DUST_FRAG = /* glsl */ `
  uniform vec3 uTint;
  varying float vLight;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.25, 0.0, dot(c, c));
    gl_FragColor = vec4(uTint * vLight * vFade * a, 1.0);
  }
`;

/* ───────── Suelo: rejilla tenue y charco de luz donde apunta la linterna ───────── */
export const FLOOR_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uCam;
  uniform vec3 uBeamDir;
  uniform vec3 uTint;
  uniform vec3 uFog;
  uniform float uTime;
  varying vec3 vWorld;

  float grid(vec2 p, float s) {
    vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    vec3 rel = vWorld - uCam;
    float dist = length(rel);
    float along = max(dot(rel, uBeamDir), 0.0);
    float radial = length(rel - uBeamDir * along);
    float pool = (1.0 - smoothstep(0.0, 0.6 + along * 0.32, radial)) * smoothstep(0.5, 3.0, along);
    float g = grid(vWorld.xz, 1.0) * 0.5 + grid(vWorld.xz, 5.0) * 0.5;
    vec3 col = uFog * 0.5 + uTint * (0.006 + g * 0.028 + pool * 0.26) + uTint * g * pool * 0.3;
    float fog = smoothstep(6.0, 40.0, dist);
    col = mix(col, uFog * 1.2 + uTint * 0.018, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ───────── Cielo / fondo: degradado con banda de bruma en el horizonte ───────── */
export const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

export const SKY_FRAG = /* glsl */ `
  uniform vec3 uFog;
  uniform vec3 uTint;
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    float h = vDir.y;
    vec3 horizon = uFog * 1.25 + uTint * 0.02;
    vec3 col = mix(horizon, uFog * 0.25, smoothstep(0.0, 0.55, h));
    col = mix(col, uFog * 0.6, smoothstep(0.0, -0.3, h));
    col += uTint * 0.016 * exp(-abs(h) * 14.0);            // banda de bruma
    float stars = step(0.9993, hash(floor(vDir * 420.0))) * smoothstep(0.1, 0.6, h) * 0.35;
    col += vec3(stars);
    // perfil de ciudad lejana con ventanas encendidas (Madrid de noche al fondo)
    float az = atan(vDir.x, vDir.z);
    float bc = floor(az * 70.0);
    float bh = 0.012 + pow(hash(vec3(bc, 1.0, 2.0)), 3.0) * 0.075 + step(0.985, hash(vec3(bc, 5.0, 1.0))) * 0.07;
    float far = floor(az * 33.0);
    float bh2 = 0.03 + pow(hash(vec3(far, 7.0, 3.0)), 2.0) * 0.06;
    float sil2 = step(h, bh2) * step(-0.02, h);
    float sil = step(h, bh) * step(-0.02, h);
    col = mix(col, uFog * 0.95 + uTint * 0.01, sil2 * 0.6);
    col = mix(col, uFog * 0.7, sil);
    vec2 wc = floor(vec2(az * 900.0, h * 900.0));
    float win = step(0.86, hash(vec3(wc, bc))) * sil * step(0.004, h);
    col += vec3(1.0, 0.7, 0.4) * win * 0.22 * (0.7 + 0.3 * sin(uTime * 0.5 + wc.x));
    // resplandor anaranjado de la ciudad en la bruma baja
    col += vec3(1.0, 0.55, 0.25) * 0.02 * exp(-abs(h - 0.02) * 18.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ───────── Post: luz de linterna en la niebla, grano, viñeta, estela de velocidad, atenuado ───────── */
export const POST_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const POST_FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uVel;        // velocidad de viaje (0 en reposo)
  uniform float uDim;        // 0..1 atenuado del lightbox
  uniform vec2 uPointer;     // 0..1
  uniform vec3 uTint;
  uniform float uGrain;
  uniform float uBlur;       // 0..1 desenfoque de foco (detrás de la intro, fondo del lightbox)
  uniform float uDark;       // 0..1 oscurecimiento mientras está desenfocada
  uniform float uFx;         // 1 = grano, viñeta y linterna (gama alta)
  uniform float uSweep;      // 0..1 intensidad del barrido de luz entre capítulos
  uniform float uSweepPos;   // posición del barrido (0..1)
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec4 base = texture2D(tScene, vUv);
    vec3 col = base.rgb;
    float photo = 1.0 - base.a;          // máscara: 1 donde hay foto

    // desenfoque de foco: disco de 16 muestras (barato, sin pases extra)
    if (uBlur > 0.002) {
      vec2 px = 1.0 / uRes;
      float rad = uBlur * 22.0;
      vec3 acc = col;
      float wsum = 1.0;
      for (int i = 0; i < 16; i++) {
        float fi = float(i);
        float a = fi * 2.39996;
        float r = sqrt((fi + 0.5) / 16.0) * rad;
        acc += texture2D(tScene, vUv + vec2(cos(a), sin(a)) * r * px).rgb;
        wsum += 1.0;
      }
      col = acc / wsum;
      col *= mix(1.0, 0.45, uDark);
    }

    // estela radial solo mientras se viaja rápido (vuelve a 0 en reposo)
    float v = clamp(abs(uVel), 0.0, 1.0);
    if (v > 0.002) {
      vec2 dir = vUv - 0.5;
      vec3 acc = col;
      for (int i = 1; i <= 7; i++) {
        float k = float(i) / 7.0;
        acc += texture2D(tScene, vUv - dir * k * v * 0.09).rgb;
      }
      col = mix(col, acc / 8.0, smoothstep(0.0, 0.25, v));
    }

    // luz de linterna en la bruma alrededor del cursor (fuera de las fotos)
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    float d = length((vUv - uPointer) * asp);
    float haze = noise(vUv * 3.0 + vec2(uTime * 0.03, -uTime * 0.02)) * 0.6 + noise(vUv * 9.0 - uTime * 0.05) * 0.4;
    float beam = exp(-d * d * 10.0) * (0.5 + 0.5 * haze);
    col += uTint * beam * 0.16 * (1.0 - photo) * uFx;

    // barrido de luz entre capítulos: banda diagonal suave, solo fuera de las fotos
    if (uSweep > 0.001) {
      float band = exp(-pow((vUv.x + (vUv.y - 0.5) * 0.35 - uSweepPos) * 3.2, 2.0));
      col += uTint * band * uSweep * 0.11 * (1.0 - photo);
      // quemado de película entre capítulos: luz cálida que entra por el borde, como un carrete velado
      float bandL = exp(-pow((vUv.x - (uSweepPos * 1.3 - 0.4)) * 3.0, 2.0));
      float edge = smoothstep(0.35, 0.0, min(vUv.x, 1.0 - vUv.x)) * 0.6 + smoothstep(0.3, 0.0, vUv.y) * 0.4;
      float leak = bandL * edge * (0.55 + 0.45 * noise(vUv * vec2(2.0, 6.0) + uTime * 0.4));
      col += mix(vec3(1.0, 0.3, 0.06), vec3(1.0, 0.72, 0.38), leak) * leak * uSweep * 0.22 * (1.0 - photo);
    }

    // viñeta y grano: fuera de las fotos
    float vig = smoothstep(1.15, 0.35, length((vUv - 0.5) * asp * 1.05));
    col *= mix(1.0, mix(0.55, 1.0, vig), (1.0 - photo) * uFx);
    float g = hash(vUv * uRes + fract(uTime * 7.13) * 100.0) - 0.5;
    col += g * uGrain * (1.0 - photo) * uFx;

    // atenuado del lightbox: todo baja a casi negro (la foto abierta se dibuja aparte, encima)
    col *= mix(1.0, 0.06, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ───────── Atenuado sin post (gama media) ───────── */
export const DIM_FRAG = /* glsl */ `
  uniform float uDim;
  void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, uDim * 0.93); }
`;

/* ───────── Foco cenital sobre cada foto (cono volumétrico) y charco de luz en el suelo ───────── */
export const SPOT_VERT = /* glsl */ `
  varying float vV;
  varying float vFres;
  void main() {
    vV = uv.y;                                   // 1 arriba (fuente) → 0 abajo
    vec4 w = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vec3 view = normalize(cameraPosition - w.xyz);
    vFres = pow(abs(dot(n, view)), 1.6);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
export const SPOT_FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform float uI;
  uniform float uK;          // intensidad base del cono (los contraluces del escenario son más fuertes)
  varying float vV;
  varying float vFres;
  void main() {
    float a = pow(vV, 1.25) * (1.0 - smoothstep(0.9, 1.0, vV) * 0.6) * vFres * uI * uK;
    gl_FragColor = vec4(uTint * a, 1.0);
  }
`;
export const POOL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const POOL_FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform float uI;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a = a * a * uI * 0.22;
    gl_FragColor = vec4(uTint * a, 1.0);
  }
`;

/* ───────── Título del capítulo en 3D (texto en CanvasTexture) con revelado cinético ───────── */
export const TITLE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const TITLE_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uProg;       // 0..1 una sola línea de tiempo por título
  uniform vec3 uColor;
  uniform vec3 uFog;
  varying vec2 vUv;
  void main() {
    // cada columna entra subiendo, de izquierda a derecha, con borde suave
    float local = clamp(uProg * 1.45 - vUv.x * 0.45, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - local, 3.0);
    vec2 uv = vec2(vUv.x, vUv.y - (1.0 - e) * 0.32);
    float a = texture2D(uTex, uv).a;
    if (uv.y < 0.0 || uv.y > 1.0) a = 0.0;
    a *= smoothstep(0.0, 0.35, local);
    vec3 col = mix(uFog, uColor, 0.92);
    gl_FragColor = vec4(col, a * 0.96);
  }
`;

/* ───────── Paredes del cuarto (capítulo 1): oscuras, con luz de ventana derramada ───────── */
export const ROOM_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
export const ROOM_FRAG = /* glsl */ `
  uniform vec3 uFog;
  uniform vec3 uTint;
  uniform vec3 uLight;       // posición del charco de luz de la ventana (mundo)
  uniform float uI;
  varying vec3 vWorld;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float d = length(vWorld - uLight);
    float pool = exp(-d * d * 0.09) * uI;
    float grain = hash(floor(vWorld.xy * 40.0) + floor(vWorld.z * 40.0)) * 0.012;
    vec3 col = uFog * 1.6 + vec3(0.012, 0.011, 0.012) + grain + uTint * pool * 0.16;
    float floorFade = smoothstep(-2.7, 1.5, vWorld.y);
    col *= mix(0.75, 1.0, floorFade);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ───────── Ventana y haz de luz (capítulo 1) ───────── */
export const WINDOW_FRAG = /* glsl */ `
  uniform float uI;
  varying vec2 vUv;
  void main() {
    vec2 g = abs(vUv - 0.5);
    float mull = step(0.012, abs(vUv.x - 0.5)) * step(0.012, abs(vUv.y - 0.5));
    float glow = (1.0 - smoothstep(0.42, 0.5, max(g.x, g.y)));
    vec3 col = vec3(0.86, 0.84, 0.78) * glow * mull * uI;
    gl_FragColor = vec4(col, 1.0);
  }
`;
export const SHAFT_FRAG = /* glsl */ `
  uniform float uI;
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float across = 1.0 - smoothstep(0.25, 0.5, abs(vUv.x - 0.5));
    float along = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
    float haze = 0.65 + 0.35 * noise(vUv * vec2(6.0, 3.0) + vec2(0.0, uTime * 0.05));
    float a = across * along * haze * uI * 0.07;
    gl_FragColor = vec4(vec3(0.95, 0.9, 0.8) * a, 1.0);
  }
`;
