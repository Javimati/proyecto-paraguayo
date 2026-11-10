/* Shaders GLSL (WebGL1/2 compatibles). Coordenadas: uRect en px CSS desde arriba-izquierda.
   Regla de la casa: DENTRO del marco de una foto los píxeles son fieles. Nada de baños de gel,
   brillos, viñetas ni cañones sobre la imagen. La luz de escenario va FUERA del marco (HALO_FRAG). */

export const VERT = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform vec4 uRect;
uniform vec2 uViewport;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec2 p = position.xy + 0.5;                 // 0..1, y hacia arriba
  vec2 px = uRect.xy + vec2(p.x, 1.0 - p.y) * uRect.zw;
  vec2 clip = px / uViewport * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const COMMON = /* glsl */ `
precision highp float;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

/** Foto del escenario en la home: fundido entre el show anterior y el actual. Nada más. */
export const STAGE_FRAG = /* glsl */ `
${COMMON}
uniform sampler2D tCur;
uniform sampler2D tPrev;
uniform vec2 uCurRes;
uniform vec2 uPrevRes;
uniform vec4 uRect;
uniform float uMix;
uniform float uIntro;
// «contain»: la foto entera, sin recortar; lo que sobra del marco queda negro
vec2 fit(vec2 uv, vec2 res) {
  float ra = uRect.z / uRect.w;
  float ri = res.x / res.y;
  vec2 s = ra > ri ? vec2(ra / ri, 1.0) : vec2(1.0, ri / ra);
  return (uv - 0.5) * s + 0.5;
}
vec3 sampleFit(sampler2D t, vec2 res) {
  vec2 uv = fit(vUv, res);
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  return texture2D(t, clamp(uv, 0.0, 1.0)).rgb * inside;
}
void main() {
  vec3 cur = sampleFit(tCur, uCurRes);
  vec3 prev = sampleFit(tPrev, uPrevRes);
  vec3 col = mix(prev, cur, uMix);
  // la sala se enciende una vez al cargar (0,8 s); en reposo, píxeles fieles
  col *= mix(0.25, 1.0, uIntro);
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * Luz de escenario alrededor del marco: haces con el gel del show que bajan desde arriba,
 * bruma lenta y un derrame suave en torno a la foto. Dentro del marco vale 0.
 * Plano a pantalla completa; uStage = rectángulo de la foto en px.
 */
export const HALO_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uViewport;
uniform vec4 uStage;
uniform vec3 uGel;
uniform float uTime;
uniform float uFlash;
uniform float uIntro;
float beam(vec2 px, vec2 src, float ang, float spread) {
  vec2 d = px - src;
  float a = atan(d.x, d.y) - ang;
  float fall = smoothstep(uViewport.y * 1.1, 0.0, length(d));
  return smoothstep(spread, 0.0, abs(a)) * fall;
}
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uViewport;
  vec2 c = uStage.xy + uStage.zw * 0.5;
  // distancia al rectángulo de la foto (0 dentro)
  vec2 q = abs(px - c) - uStage.zw * 0.5;
  float dRect = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float outside = smoothstep(0.0, 2.0, dRect);

  float t = uTime;
  vec2 top = vec2(c.x, -uViewport.y * 0.15);
  float w = uStage.z;
  float b = beam(px, top + vec2(-w * 0.32, 0.0), 0.10 + 0.16 * sin(t * 0.21), 0.07)
          + beam(px, top + vec2(w * 0.30, 0.0), -0.12 + 0.14 * sin(t * 0.27 + 1.3), 0.065)
          + 0.7 * beam(px, top, 0.10 * sin(t * 0.17 + 2.1), 0.05);
  float haze = 0.55 + 0.45 * noise(px / 220.0 + vec2(t * 0.05, -t * 0.03));
  // derrame alrededor del marco, como el rebote de la luz en el humo
  float spill = exp(-dRect / 140.0);
  float I = (b * haze * 0.16 + spill * 0.14) * uIntro;
  // destello de estroboscopio: solo fuera de la foto, breve
  I += uFlash * 0.28 * exp(-dRect / 260.0);
  I *= outside;
  vec3 col = mix(uGel, vec3(1.0, 0.97, 0.92), clamp(uFlash, 0.0, 1.0) * 0.6);
  gl_FragColor = vec4(col, clamp(I, 0.0, 0.5));
}`;

/** Foto de evento: arrastre de obturación con la velocidad (vuelve a nitidez al parar) y encendido breve. */
export const PHOTO_FRAG = /* glsl */ `
${COMMON}
uniform sampler2D tMap;
uniform float uVel;
uniform float uReveal;
void main() {
  vec2 uv = vUv;
  float v = clamp(uVel, -1.0, 1.0);
  vec3 col;
  if (abs(v) < 0.002) {
    col = texture2D(tMap, uv).rgb;            // en reposo: la foto tal cual
  } else {
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 11; i++) {
      float k = float(i) / 10.0 - 0.5;
      float w = 1.0 - abs(k) * 1.4;
      acc += texture2D(tMap, clamp(uv + vec2(0.0, k * v * 0.045), 0.0, 1.0)).rgb * w;
      wsum += w;
    }
    col = acc / wsum;
  }
  // se enciende desde brillo 0,6, sin tocar la saturación
  col *= mix(0.6, 1.0, smoothstep(0.0, 1.0, uReveal));
  gl_FragColor = vec4(col, 1.0);
}`;
