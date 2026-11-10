export const vertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uRot;
uniform float uBend;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec2 p = vec2(position.x, -position.y) * uSize;
  // curvatura muy leve según la velocidad del scroll (serie); en la mesa vale 0
  p.y += sin(uv.x * 3.14159265) * uBend * uSize.y;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vec2 px = uCenter + p;
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}
`;

/*
 * Píxeles fieles: ni grano, ni viñeteo, ni desenfoque, ni separación de canales.
 * La única intervención es la entrada (serie): un fundido de exposición, como abrir el diafragma
 * del proyector (de -4 pasos a 0), que termina en la imagen exacta.
 */
export const fragment = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform float uImgAspect;
uniform vec2 uSize;
uniform float uAlpha;
uniform float uReveal;
varying vec2 vUv;

vec2 cover(vec2 uv) {
  float ra = uSize.x / uSize.y;
  vec2 s = ra > uImgAspect ? vec2(1.0, uImgAspect / ra) : vec2(ra / uImgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec3 col = texture2D(tMap, cover(vUv)).rgb;
  float rev = smoothstep(0.0, 1.0, uReveal);
  col *= exp2((rev - 1.0) * 4.0) * step(0.001, rev);
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}
`;
