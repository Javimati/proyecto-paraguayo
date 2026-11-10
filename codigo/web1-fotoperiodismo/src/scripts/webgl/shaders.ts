/** Shaders de la capa 2. GLSL ES 1.0 (WebGL2 lo acepta y OGL lo compila igual). */

export const vertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;

uniform vec4 uRect;      // x, y, ancho, alto en px CSS (origen arriba-izquierda)
uniform vec2 uViewport;  // ancho, alto del viewport en px CSS
uniform float uVelocity; // velocidad de scroll normalizada y suavizada (-1..1)

varying vec2 vUv;

void main() {
  vUv = uv;
  vec2 p = position.xy + 0.5;           // 0..1, y hacia arriba
  float v = uVelocity;

  vec2 px = vec2(uRect.x + p.x * uRect.z, uRect.y + (1.0 - p.y) * uRect.w);

  // Tira de película: los bordes horizontales se arquean muy levemente según la velocidad
  float bend = sin(p.x * 3.14159265);
  px.y += bend * v * uRect.w * 0.015;

  vec2 clip = (px / uViewport) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `
precision highp float;

uniform sampler2D tMap;
uniform vec2 uImage;     // tamaño natural de la imagen
uniform vec2 uPlane;     // tamaño del plano en px CSS
uniform float uProgress; // 0 = imagen latente, 1 = imagen asentada
uniform float uTime;
uniform float uSeed;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  // object-fit: contain (los verticales viven dentro del marco 3:2 sobre negro)
  float s = min(uPlane.x / uImage.x, uPlane.y / uImage.y);
  vec2 drawn = uImage * s;
  vec2 uv = (vUv - 0.5) * (uPlane / drawn) + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

  float p = clamp(uProgress, 0.0, 1.0);
  if (p >= 1.0) {
    gl_FragColor = vec4(texture2D(tMap, uv).rgb, 1.0);
    return;
  }
  float rest = 1.0 - p;

  // Desplazamiento de canales mínimo, solo mientras revela
  float shift = rest * rest * 0.006;
  vec3 col;
  col.r = texture2D(tMap, uv + vec2(shift, 0.0)).r;
  col.g = texture2D(tMap, uv).g;
  col.b = texture2D(tMap, uv - vec2(shift, 0.0)).b;

  float lum = dot(col, vec3(0.299, 0.587, 0.114));

  // Revelado: las luces emergen antes que las sombras, en manchas irregulares como en la cubeta
  float n = vnoise(vUv * uPlane / 38.0 + uSeed * 17.0);
  float t = p * 1.55 - (1.0 - lum) * 0.42 - n * 0.16;
  float develop = smoothstep(0.0, 0.42, t);

  // parte de la imagen latente (tenue, sin color), no de negro
  vec3 latent = vec3(lum) * 0.18;
  vec3 outc = mix(latent, col, develop);

  // grano químico que se disipa
  float g = hash(floor(vUv * uPlane * 0.75) + fract(uTime * 7.0) * 113.0) - 0.5;
  outc += g * 0.08 * rest;

  // viñeteo que se abre
  vec2 d = vUv - 0.5;
  outc *= 1.0 - dot(d, d) * 1.2 * rest;

  gl_FragColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
`;
