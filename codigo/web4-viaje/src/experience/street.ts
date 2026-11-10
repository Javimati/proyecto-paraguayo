import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  Points,
  Quaternion,
  ShaderMaterial,
  SrcAlphaFactor,
  Vector2,
  Vector3,
  Vector4,
  ZeroFactor,
} from 'three';
import { SPOT_FRAG, SPOT_VERT } from './shaders';

/**
 * «La calle de los recuerdos»: la ciudad de noche que une las estaciones.
 * Edificios con ventanas encendidas a ambos lados del recorrido, farolas de sodio con su cono de luz,
 * aceras, reflejos en el asfalto mojado (los dibuja el suelo y los edificios espejados) y lluvia fina.
 * Todo se coloca solo a partir del recorrido de la cámara, sin tapar nunca una foto ni su encuadre.
 */

export const FLOOR_Y = -2.6;
export const MAX_LAMPS = 12;

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}
export interface Seg {
  a: Vector2;
  b: Vector2;
  r: number;
}
export interface Circle {
  c: Vector2;
  r: number;
}

export interface StreetShared {
  uFog: { value: Color };
  uTint: { value: Color };
  uCam: { value: Vector3 };
  uTime: { value: number };
}

export interface StreetOpts {
  path: Vector3[]; // muestras del recorrido de la cámara
  rects: Rect[]; // zonas de las estaciones (aquí no se construye)
  circles: Circle[]; // fotos y cámaras
  segs: Seg[]; // líneas de visión cámara → foto
  room: Rect | null; // interior seco (capítulo 1)
  high: boolean;
  mobile: boolean;
  shared: StreetShared;
  pixelRatio: number;
  lamps: { value: Vector4[] };
  lampCols: { value: Vector3[] };
}

/* ───────── shaders ───────── */
const LAMP_UNIFORMS = /* glsl */ `
  uniform vec4 uLamps[${MAX_LAMPS}];
  uniform vec3 uLampCol[${MAX_LAMPS}];
`;
const NOISE = /* glsl */ `
  float hash1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash1(i), hash1(i + vec2(1, 0)), u.x), mix(hash1(i + vec2(0, 1)), hash1(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }
  // charcos: mismo patrón en el suelo y en los reflejos
  float puddleAt(vec2 p) { return smoothstep(0.52, 0.6, fbm(p * 0.21 + 3.7)); }
`;

export const FACADE_VERT = /* glsl */ `
  attribute vec3 aSize;
  attribute vec4 aSeed;      // x,y,z aleatorios · w = tipo (0 edificio · 1 acera)
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec2 vFac;         // coordenadas de fachada en metros (u a lo ancho, v desde el suelo)
  varying float vFace;       // 0 fachada · 1 tejado
  varying vec4 vSeed;
  varying vec3 vSize;
  void main() {
    vec3 p = position;       // caja unidad con la base en y = 0
    vec3 m = p * aSize;
    if (abs(normal.x) > 0.5) vFac = vec2(m.z + aSize.z * 0.5, m.y);
    else vFac = vec2(m.x + aSize.x * 0.5, m.y);
    vFace = normal.y > 0.5 ? 1.0 : 0.0;
    vSeed = aSeed;
    vSize = aSize;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const FACADE_FRAG = /* glsl */ `
  uniform vec3 uFog;
  uniform vec3 uTint;
  uniform vec3 uCam;
  uniform float uTime;
  uniform float uMirror;     // 1 = edificio reflejado bajo el suelo mojado
  ${LAMP_UNIFORMS}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec2 vFac;
  varying float vFace;
  varying vec4 vSeed;
  varying vec3 vSize;
  ${NOISE}

  void main() {
    vec3 n = normalize(vN);
    // luz de las farolas cercanas
    vec3 light = vec3(0.0);
    for (int i = 0; i < ${MAX_LAMPS}; i++) {
      vec4 L = uLamps[i];
      if (L.w <= 0.0) continue;
      vec3 d = L.xyz - vWorld;
      float dd = dot(d, d);
      float facing = max(dot(n, d * inversesqrt(dd)), 0.0) * 0.75 + 0.25;
      light += uLampCol[i] * L.w * facing / (1.0 + dd * 0.22);
    }
    vec3 col;
    float emissive = 0.0;
    float kind = vSeed.w;
    if (kind > 0.5) {
      // acera: baldosa de cuadros (top) y bordillo
      float tile = 0.0;
      if (vFace > 0.5) {
        vec2 t = abs(fract(vWorld.xz / 0.3) - 0.5);
        tile = smoothstep(0.46, 0.5, max(t.x, t.y));
      }
      col = vec3(0.05, 0.05, 0.055) * (1.0 - tile * 0.45) * (0.4 + light * 1.6) + uFog * 0.4;
    } else if (vFace > 0.5) {
      col = uFog * 0.7 + vec3(0.012);
    } else {
      float storey = 3.1;
      float bay = 2.2 + vSeed.x * 0.9;
      vec2 cell = floor(vec2(vFac.x / bay, vFac.y / storey));
      vec2 f = vec2(fract(vFac.x / bay), fract(vFac.y / storey));
      float nb = floor(vSize.x / bay + 0.001);
      float h = hash1(cell + vSeed.yz * 91.0);
      // revoco oscuro con algo de mancha de humedad
      float stain = vnoise(vFac * vec2(0.6, 0.25) + vSeed.y * 40.0);
      vec3 wall = mix(vec3(0.032, 0.03, 0.03), vec3(0.05, 0.043, 0.038), vSeed.z) * (0.75 + 0.5 * stain);
      col = wall * (0.35 + light * 2.2) + uFog * 0.55;
      bool edgeBay = cell.x < 0.5 || cell.x > nb - 0.5;
      if (cell.y < 0.5) {
        // planta baja: persianas metálicas, algún local abierto y algún neón
        float inShop = step(0.08, f.x) * step(f.x, 0.92) * step(0.0, f.y) * step(f.y, 0.78);
        if (inShop > 0.5 && !edgeBay) {
          float slats = 0.5 + 0.5 * sin(vFac.y * 60.0);
          vec3 shutter = vec3(0.07, 0.07, 0.075) * (0.6 + 0.4 * slats) * (0.3 + light * 2.4);
          if (h > 0.78) {
            // local abierto: luz cálida del interior
            vec3 warm = mix(vec3(1.0, 0.62, 0.3), vec3(0.75, 0.85, 1.0), step(0.93, h));
            shutter = warm * (0.22 + 0.1 * vnoise(vFac * 3.0)) * smoothstep(0.0, 0.6, f.y + 0.2);
            emissive = 0.8;
          }
          col = shutter + uFog * 0.3;
        }
        float neonBand = step(0.82, f.y) * step(f.y, 0.87) * step(0.18, f.x) * step(f.x, 0.82);
        if (neonBand > 0.5 && h > 0.55 && h < 0.66 && !edgeBay) {
          vec3 neonC = h < 0.59 ? vec3(1.0, 0.18, 0.42) : h < 0.63 ? vec3(0.2, 0.85, 1.0) : vec3(1.0, 0.35, 0.12);
          float flick = step(0.06, fract(sin(floor(uTime * 7.0) + h * 99.0) * 431.7));
          col = neonC * (0.75 + 0.25 * flick);
          emissive = 1.0;
        }
      } else if (vFac.y < vSize.y - 0.7) {
        // ventanas
        float inWin = step(0.27, f.x) * step(f.x, 0.73) * step(0.3, f.y) * step(f.y, 0.86);
        float frame = inWin * (1.0 - step(0.3, f.x) * step(f.x, 0.70) * step(0.33, f.y) * step(f.y, 0.83));
        float mullion = inWin * (1.0 - step(0.012, abs(f.x - 0.5)));
        if (inWin > 0.5) {
          vec3 glass = vec3(0.012, 0.014, 0.02) + light * 0.05;
          float lit = step(0.7 - vSeed.x * 0.12, h);
          // alguna ventana se enciende o se apaga despacio (la ciudad vive)
          float slowT = floor(uTime / (7.0 + h * 13.0) + h * 5.0);
          lit = mix(lit, step(0.5, hash1(cell + slowT)), step(0.965, h));
          vec3 warm = mix(vec3(1.0, 0.66, 0.34), vec3(1.0, 0.82, 0.58), hash1(cell * 1.7));
          float tv = step(0.985, hash1(cell + 3.3));
          vec3 tvC = vec3(0.45, 0.6, 1.0) * (0.55 + 0.45 * sin(uTime * 9.0 + h * 50.0) * sin(uTime * 3.1 + h * 20.0));
          // cortina: degradado y silueta suave
          float curtain = 0.6 + 0.4 * smoothstep(0.3, 0.86, f.y) * (0.75 + 0.25 * hash1(cell + 7.0));
          vec3 inside = mix(warm, tvC, tv) * curtain * (0.55 + 0.45 * h);
          col = mix(glass, inside, lit);
          emissive = lit;
          col *= 1.0 - mullion * 0.8;
          col = mix(col, wall * 0.6, frame);
        }
        // lejos, la rejilla de ventanas se funde en su media (sin muaré)
        float aa = clamp(max(fwidth(vFac.x / bay), fwidth(vFac.y / storey)) * 2.2 - 0.25, 0.0, 1.0);
        vec3 avg = wall * (0.35 + light * 2.2) * 0.8 + vec3(1.0, 0.68, 0.38) * 0.07 * (0.6 + vSeed.x);
        col = mix(col, avg + uFog * 0.5, aa);
        emissive = mix(emissive, 0.35, aa);
        // balcones (cada dos plantas): barandilla
        float rail = step(mod(cell.y, 2.0), 0.5) * step(0.24, f.x) * step(f.x, 0.76);
        float bar = rail * (step(0.18, f.y) * step(f.y, 0.2) + step(0.29, f.y) * step(f.y, 0.31) * 0.6);
        col = mix(col, vec3(0.02) + light * 0.12, bar);
      } else {
        // cornisa
        col *= 0.7;
      }
    }
    float dist = length(vWorld - uCam);
    float fogK = smoothstep(9.0, 70.0, dist) * (1.0 - emissive * 0.55);
    col = mix(col, uFog * 1.1, fogK);
    if (uMirror > 0.5) {
      // reflejo: solo donde el suelo está mojado, apagado y difuso
      float fy = ${FLOOR_Y.toFixed(2)};
      vec3 ray = vWorld - uCam;
      vec2 P = uCam.xz + ray.xz * ((fy - uCam.y) / min(ray.y, -1e-3));
      float wet = puddleAt(P);
      float depth = fy - vWorld.y;
      float k = mix(0.07, 0.5, wet) * exp(-depth * 0.06);
      gl_FragColor = vec4(col * k * (0.25 + emissive * 0.9), 1.0);
      return;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const FLOOR2_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const FLOOR2_FRAG = /* glsl */ `
  uniform vec3 uCam;
  uniform vec3 uBeamDir;
  uniform vec3 uTint;
  uniform vec3 uFog;
  uniform float uTime;
  uniform vec4 uRoom;        // x0, z0, x1, z1 del interior seco
  uniform float uWet;
  ${LAMP_UNIFORMS}
  varying vec3 vWorld;
  ${NOISE}

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
    vec2 p = vWorld.xz;
    float inRoom = step(uRoom.x, p.x) * step(p.x, uRoom.z) * step(uRoom.y, p.y) * step(p.y, uRoom.w);

    // ── interior (cuarto de Arganda): el suelo de siempre, seco
    float g = grid(p, 1.0) * 0.5 + grid(p, 5.0) * 0.5;
    vec3 roomCol = uFog * 0.5 + uTint * (0.006 + g * 0.02 + pool * 0.26) + uTint * g * pool * 0.3;

    // ── calle: asfalto mojado, charcos, luz de farolas y sus estelas reflejadas
    float wet = puddleAt(p) * uWet;
    float asph = 0.55 + 0.45 * vnoise(p * 6.0) * vnoise(p * 1.3 + 4.0);
    vec3 col = uFog * 0.42 + vec3(0.011, 0.011, 0.013) * asph * (1.0 - wet * 0.5);
    float hc = max(uCam.y - ${FLOOR_Y.toFixed(2)}, 0.3);
    vec3 diffuse = vec3(0.0);
    vec3 refl = vec3(0.0);
    for (int i = 0; i < ${MAX_LAMPS}; i++) {
      vec4 L = uLamps[i];
      if (L.w <= 0.0) continue;
      vec2 lf = p - L.xz;
      float d2 = dot(lf, lf);
      diffuse += uLampCol[i] * L.w * exp(-d2 * 0.075);
      vec2 toC = uCam.xz - L.xz;
      float dc = length(toC);
      vec2 v = toC / max(dc, 1e-3);
      float hl = L.y - ${FLOOR_Y.toFixed(2)};
      float aq = dc * hl / (hl + hc);
      float al = dot(lf, v);
      float ac = length(lf - v * al);
      float wid = mix(0.42, 0.11, wet);
      float len = mix(1.2, 2.6, wet) + aq * 0.35;
      refl += uLampCol[i] * L.w * exp(-ac * ac / (wid * wid)) * exp(-pow((al - aq) / len, 2.0));
    }
    col += diffuse * (0.07 + 0.05 * asph) * (1.0 - wet * 0.55);
    col += refl * mix(0.07, 0.6, wet) * (0.75 + 0.25 * vnoise(p * vec2(2.0, 18.0) + uTime * 0.6));
    // ondas de lluvia en los charcos
    vec2 cp = p / 0.7;
    vec2 ci = floor(cp);
    float ph = hash1(ci);
    float r = fract(uTime * 0.7 + ph);
    float drop = step(0.55, hash1(ci + floor(uTime * 0.7 + ph)));
    float ring = exp(-pow((length(fract(cp) - 0.5 - (vec2(hash1(ci + 1.3), hash1(ci + 2.7)) - 0.5) * 0.4) - r * 0.45) * 30.0, 2.0)) * (1.0 - r) * (1.0 - r);
    col += (diffuse * 0.35 + refl * 0.25 + uTint * 0.01) * ring * drop * wet * 0.4 * uWet;
    // destellos del asfalto bajo la luz
    float glint = step(0.992, hash1(floor(p * 34.0))) * (0.5 + 0.5 * sin(uTime * 2.0 + hash1(floor(p * 34.0)) * 40.0));
    col += diffuse * glint * 0.25 * (1.0 - wet);
    // linterna del cursor también sobre el asfalto
    col += uTint * pool * (0.05 + wet * 0.12);

    col = mix(col, roomCol, inRoom);
    float fog = smoothstep(7.0, 60.0, dist);
    col = mix(col, uFog * 1.15 + uTint * 0.012, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const LAMP_VERT = /* glsl */ `
  attribute vec4 aSeed;
  varying vec3 vWorld;
  varying float vKind;
  void main() {
    vKind = aSeed.w;
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const LAMP_FRAG = /* glsl */ `
  uniform vec3 uFog;
  uniform vec3 uCam;
  varying vec3 vWorld;
  varying float vKind;      // 0 poste · 1 cabeza encendida
  void main() {
    float h = clamp((vWorld.y - ${FLOOR_Y.toFixed(2)}) / 4.8, 0.0, 1.0);
    vec3 col = vKind > 0.5 ? vec3(1.0, 0.8, 0.55) : vec3(0.025, 0.024, 0.026) + vec3(0.09, 0.06, 0.035) * h * h;
    float dist = length(vWorld - uCam);
    col = mix(col, uFog * 1.1, smoothstep(10.0, 70.0, dist) * (vKind > 0.5 ? 0.4 : 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GLOW_VERT = /* glsl */ `
  attribute vec3 aColor;
  uniform float uViewportH;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = clamp(2.6 * projectionMatrix[1][1] * uViewportH * 0.5 / max(depth, 0.1), 2.0, 420.0);
    vFade = smoothstep(0.6, 2.0, depth) * (1.0 - smoothstep(55.0, 90.0, depth));
  }
`;
const GLOW_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float halo = exp(-d * d * 7.0) * 0.55 + exp(-d * 18.0) * 1.2;
    // estrella de difracción muy sutil (diafragma)
    float star = exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 3.0) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 3.0);
    float a = (halo + star * 0.12) * vFade * (1.0 - smoothstep(0.85, 1.0, d));
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

const RAIN_VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform vec3 uCam;
  uniform float uTime;
  uniform float uBox;
  uniform float uPixelRatio;
  uniform float uRain;
  ${LAMP_UNIFORMS}
  varying float vLight;
  varying vec3 vCol;
  void main() {
    float H = 9.0;
    vec3 p = vec3(aSeed.x * uBox, 0.0, aSeed.z * uBox);
    float speed = 7.5 + aSeed.w * 3.0;
    p.y = ${FLOOR_Y.toFixed(2)} + H - mod(aSeed.y * H + uTime * speed, H);
    p.x += uTime * 0.6;
    vec3 rel = vec3(mod(p.x - uCam.x + uBox * 0.5, uBox) - uBox * 0.5, 0.0, mod(p.z - uCam.z + uBox * 0.5, uBox) - uBox * 0.5);
    vec3 w = vec3(uCam.x + rel.x, p.y, uCam.z + rel.z);
    vec3 lit = vec3(0.0);
    for (int i = 0; i < ${MAX_LAMPS}; i++) {
      vec4 L = uLamps[i];
      if (L.w <= 0.0) continue;
      vec3 d = L.xyz - w;
      vec2 dx = d.xz;
      // dentro del cono de la farola (debajo de la cabeza)
      float cone = 1.0 - smoothstep(0.4, 0.4 + max(d.y, 0.0) * 0.55, length(dx));
      lit += uLampCol[i] * L.w * cone * step(0.0, d.y) / (1.0 + dot(d, d) * 0.04);
    }
    vCol = lit;
    vec4 mv = viewMatrix * vec4(w, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = clamp(uPixelRatio * 26.0 / max(depth, 0.5), 1.0, 22.0);
    vLight = uRain * smoothstep(0.4, 1.4, depth) * (1.0 - smoothstep(uBox * 0.35, uBox * 0.5, depth)) * (0.06 + dot(lit, vec3(0.4)));
  }
`;
const RAIN_FRAG = /* glsl */ `
  varying float vLight;
  varying vec3 vCol;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // trazo vertical fino (gota con estela de movimiento)
    float s = exp(-pow(c.x * 22.0, 2.0)) * smoothstep(0.5, 0.0, abs(c.y));
    vec3 col = (vec3(0.5, 0.55, 0.6) * 0.25 + vCol * 0.9) * vLight * s;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ───────── utilidades ───────── */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function distSeg(p: Vector2, a: Vector2, b: Vector2) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}
const inRect = (p: Vector2, r: Rect, m = 0) => p.x > r.x0 - m && p.x < r.x1 + m && p.y > r.z0 - m && p.y < r.z1 + m;

export function additive(m: ShaderMaterial) {
  m.transparent = true;
  m.depthWrite = false;
  m.blending = CustomBlending;
  m.blendSrc = SrcAlphaFactor;
  m.blendDst = OneFactor;
  m.blendSrcAlpha = ZeroFactor;
  m.blendDstAlpha = OneFactor;
}

export const makeLampUniforms = () => ({
  lamps: { value: Array.from({ length: MAX_LAMPS }, () => new Vector4(0, 0, 0, 0)) },
  lampCols: { value: Array.from({ length: MAX_LAMPS }, () => new Vector3(1, 0.7, 0.4)) },
});

export interface Street {
  group: Group;
  setViewport(h: number, pixelRatio: number): void;
  update(cam: Vector3, rainAmount: number): void;
  setLowQuality(): void;
  dispose(): void;
  debug: { blds: { c: [number, number]; t: [number, number]; w: number; d: number; h: number; kind: number }[]; path: [number, number][] };
}

export function buildStreet(o: StreetOpts): Street {
  const group = new Group();
  const r = rand(20261110);
  const { shared, high, mobile } = o;

  /* ── recorrido remuestreado cada metro (en planta) ── */
  const pts: Vector2[] = [];
  for (const v of o.path) {
    const p = new Vector2(v.x, v.z);
    if (!pts.length || pts[pts.length - 1].distanceTo(p) > 0.25) pts.push(p);
  }
  // se prolonga la calle un poco antes del inicio y después del final
  if (pts.length >= 2) {
    const a = pts[0].clone().sub(pts[1]).normalize();
    const b = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
    for (let i = 1; i <= 6; i++) pts.unshift(pts[0].clone().addScaledVector(a, 3));
    for (let i = 1; i <= 12; i++) pts.push(pts[pts.length - 1].clone().addScaledVector(b, 3));
  }
  const path: Vector2[] = [];
  const tangents: Vector2[] = [];
  {
    let acc = 0;
    path.push(pts[0].clone());
    for (let i = 1; i < pts.length; i++) {
      const seg = pts[i].distanceTo(pts[i - 1]);
      let t = 1 - acc;
      while (t <= seg) {
        path.push(pts[i - 1].clone().lerp(pts[i], t / seg));
        t += 1;
      }
      acc = seg - (t - 1);
    }
    for (let i = 0; i < path.length; i++) {
      const a = path[Math.max(0, i - 3)];
      const b = path[Math.min(path.length - 1, i + 3)];
      tangents.push(b.clone().sub(a).normalize());
    }
  }
  const pathDist = (p: Vector2) => {
    let m = Infinity;
    for (let i = 0; i < path.length; i += 1) {
      const d = (path[i].x - p.x) ** 2 + (path[i].y - p.y) ** 2;
      if (d < m) m = d;
    }
    return Math.sqrt(m);
  };
  const blocked = (p: Vector2, clear: number, rectMargin = 0) => {
    for (const rc of o.rects) if (inRect(p, rc, rectMargin)) return true;
    for (const c of o.circles) if (p.distanceTo(c.c) < c.r) return true;
    for (const s of o.segs) if (distSeg(p, s.a, s.b) < s.r) return true;
    return pathDist(p) < clear;
  };

  /* ── edificios ── */
  type B = { c: Vector2; t: Vector2; w: number; d: number; h: number; kind: number; rad: number };
  const blds: B[] = [];
  /** prueba exacta: rectángulo orientado (c, t) de w × d frente a todo lo que no se puede tapar */
  const fits = (c: Vector2, t: Vector2, w: number, d: number, clear: number) => {
    const n = new Vector2(-t.y, t.x);
    const hw = w / 2, hd = d / 2;
    const inside = (p: Vector2, m: number) => {
      const dx = p.x - c.x, dy = p.y - c.y;
      return Math.abs(dx * t.x + dy * t.y) < hw + m && Math.abs(dx * n.x + dy * n.y) < hd + m;
    };
    for (const p of path) if (inside(p, clear)) return false;
    for (const ci of o.circles) if (inside(ci.c, ci.r)) return false;
    for (const sg of o.segs) {
      const len = sg.a.distanceTo(sg.b);
      for (let k = 0; k <= len; k += 0.5) if (inside(sg.a.clone().lerp(sg.b, len ? k / len : 0), sg.r)) return false;
    }
    for (const rc of o.rects) {
      for (const q of [new Vector2(rc.x0, rc.z0), new Vector2(rc.x1, rc.z0), new Vector2(rc.x0, rc.z1), new Vector2(rc.x1, rc.z1)]) if (inside(q, 0)) return false;
      for (let fx = -hw; fx <= hw + 1e-6; fx += Math.max(hw / Math.ceil(hw), 0.5))
        for (let fz = -hd; fz <= hd + 1e-6; fz += Math.max(hd / Math.ceil(hd), 0.5)) {
          const q = c.clone().addScaledVector(t, fx).addScaledVector(n, fz);
          if (inRect(q, rc)) return false;
        }
    }
    const rad = Math.min(w, d) * 0.5;
    for (const b of blds) if (b.kind === 0 && b.c.distanceTo(c) < (rad + b.rad) * 0.92) return false;
    return true;
  };
  const L = path.length;
  const rows: { offs: number[]; hMin: number; hMax: number; clear: number }[] = [
    { offs: [5.2, 6.4, 8, 10, 13], hMin: 7, hMax: 19, clear: 3.4 },
    { offs: [15, 19, 24], hMin: 14, hMax: 34, clear: 9 },
  ];
  if (mobile) rows.pop();
  for (const row of rows)
    for (const side of [-1, 1]) {
      let s = 2;
      while (s < L - 2) {
        const w = 4.2 + r() * 4.2;
        const i = Math.min(L - 1, Math.floor(s + w / 2));
        const P = path[i];
        const T = tangents[i];
        const N = new Vector2(-T.y, T.x).multiplyScalar(side);
        const d = 6 + r() * 4;
        let placed = false;
        for (const off of row.offs) {
          const c = P.clone().addScaledVector(N, off + d / 2);
          if (fits(c, T, w, d, row.clear)) {
            const h = row.hMin + Math.pow(r(), 1.6) * (row.hMax - row.hMin);
            blds.push({ c, t: T.clone(), w, d, h, kind: 0, rad: Math.min(w, d) * 0.5 });
            // acera delante de la fachada
            if (row === rows[0]) {
              const sc = P.clone().addScaledVector(N, off - 1.1);
              if (!blocked(sc, 1.6, 0.4)) blds.push({ c: sc, t: T.clone(), w: w + 0.3, d: 2.2, h: 0.16, kind: 1, rad: 0 });
            }
            placed = true;
            break;
          }
        }
        s += placed ? w + (r() < 0.12 ? 1.6 : 0.12) : 2;
      }
    }

  const box = new BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const nB = blds.length;
  const sizeA = new Float32Array(nB * 3);
  const seedA = new Float32Array(nB * 4);
  const mats: Matrix4[] = [];
  const mtx = new Matrix4();
  const q = new Quaternion();
  blds.forEach((b, i) => {
    sizeA.set([b.w, b.h, b.d], i * 3);
    seedA.set([r(), r(), r(), b.kind], i * 4);
    const yaw = Math.atan2(-b.t.y, b.t.x); // la caja tiene el ancho en X
    q.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    mtx.compose(new Vector3(b.c.x, FLOOR_Y, b.c.y), q, new Vector3(b.w, b.h, b.d));
    mats.push(mtx.clone());
  });

  const { lamps, lampCols } = o;

  const facadeMat = (mirror: boolean) => {
    const m = new ShaderMaterial({
      vertexShader: FACADE_VERT,
      fragmentShader: FACADE_FRAG,
      uniforms: { ...shared, uMirror: { value: mirror ? 1 : 0 }, uLamps: lamps, uLampCol: lampCols },
      side: mirror ? DoubleSide : undefined,
    });
    if (mirror) additive(m);
    return m;
  };
  const makeInst = (mirror: boolean) => {
    const im = new InstancedMesh(box, facadeMat(mirror), nB);
    const flip = new Matrix4().makeScale(1, -1, 1);
    const toF = new Matrix4().makeTranslation(0, FLOOR_Y, 0);
    const fromF = new Matrix4().makeTranslation(0, -FLOOR_Y, 0);
    mats.forEach((m, i) => {
      if (mirror) im.setMatrixAt(i, toF.clone().multiply(flip).multiply(fromF).multiply(m));
      else im.setMatrixAt(i, m);
    });
    im.geometry = box.clone();
    im.geometry.setAttribute('aSize', new InstancedBufferAttribute(sizeA, 3));
    im.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seedA, 4));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.frustumCulled = false;
    return im;
  };
  const facades = nB ? makeInst(false) : null;
  const mirror = nB && high ? makeInst(true) : null;
  if (facades) group.add(facades);
  if (mirror) {
    mirror.renderOrder = -4;
    group.add(mirror);
  }

  /* ── farolas ── */
  const lampPos: Vector3[] = [];
  const lampColor: Vector3[] = [];
  const lampArm: { foot: Vector3; dir: Vector2 }[] = [];
  {
    const every = mobile ? 13 : 10;
    let side = 1;
    for (let i = 4; i < L - 2; i += every) {
      const P = path[i];
      const T = tangents[i];
      let ok = false;
      for (const off of [3.4, 4.2, 2.8]) {
        const N = new Vector2(-T.y, T.x).multiplyScalar(side);
        const foot = P.clone().addScaledVector(N, off);
        if (o.room && inRect(foot, o.room, 1)) break;
        let bad = false;
        for (const c of o.circles) if (foot.distanceTo(c.c) < c.r + 0.3) bad = true;
        for (const s of o.segs) if (distSeg(foot, s.a, s.b) < s.r + 0.3) bad = true;
        if (pathDist(foot) < 2.2) bad = true;
        if (bad) continue;
        const dir = N.clone().negate();
        const head = new Vector3(foot.x + dir.x * 0.85, FLOOR_Y + 4.7, foot.y + dir.y * 0.85);
        lampPos.push(head);
        // sodio casi todas; alguna LED fría
        lampColor.push(r() < 0.18 ? new Vector3(0.75, 0.85, 1.0) : new Vector3(1.0, 0.64, 0.3));
        lampArm.push({ foot: new Vector3(foot.x, FLOOR_Y, foot.y), dir });
        ok = true;
        break;
      }
      if (ok) side = -side;
    }
  }
  const nL = lampPos.length;
  let poles: InstancedMesh | null = null;
  let glow: Points<BufferGeometry, ShaderMaterial> | null = null;
  const cones: Mesh<CylinderGeometry, ShaderMaterial>[] = [];
  const thin = new BoxGeometry(1, 1, 1);
  const coneGeo = new CylinderGeometry(0.1, 1, 1, 32, 1, true);
  if (nL) {
    const parts = nL * 3;
    poles = new InstancedMesh(thin, new ShaderMaterial({ vertexShader: LAMP_VERT, fragmentShader: LAMP_FRAG, uniforms: { uFog: shared.uFog, uCam: shared.uCam } }), parts);
    const seeds = new Float32Array(parts * 4);
    lampArm.forEach((la, i) => {
      const yaw = Math.atan2(la.dir.x, la.dir.y);
      q.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      // poste
      mtx.compose(new Vector3(la.foot.x, FLOOR_Y + 2.4, la.foot.z), q, new Vector3(0.11, 4.8, 0.11));
      poles!.setMatrixAt(i * 3, mtx);
      // brazo
      mtx.compose(new Vector3(la.foot.x + la.dir.x * 0.45, FLOOR_Y + 4.78, la.foot.z + la.dir.y * 0.45), q, new Vector3(0.07, 0.07, 0.95));
      poles!.setMatrixAt(i * 3 + 1, mtx);
      // cabeza
      mtx.compose(new Vector3(lampPos[i].x, lampPos[i].y, lampPos[i].z), q, new Vector3(0.3, 0.07, 0.52));
      poles!.setMatrixAt(i * 3 + 2, mtx);
      seeds[(i * 3 + 2) * 4 + 3] = 1;
    });
    poles.geometry = thin.clone();
    poles.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4));
    poles.frustumCulled = false;
    group.add(poles);

    const g = new BufferGeometry();
    const pos = new Float32Array(nL * 3);
    const colA = new Float32Array(nL * 3);
    lampPos.forEach((p, i) => {
      pos.set([p.x, p.y - 0.08, p.z], i * 3);
      colA.set([lampColor[i].x, lampColor[i].y, lampColor[i].z], i * 3);
    });
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aColor', new BufferAttribute(colA, 3));
    const gm = new ShaderMaterial({ vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, uniforms: { uViewportH: { value: 800 } } });
    additive(gm);
    glow = new Points(g, gm);
    glow.frustumCulled = false;
    glow.renderOrder = 7;
    group.add(glow);

    lampPos.forEach((p, i) => {
      const m = new ShaderMaterial({
        vertexShader: SPOT_VERT,
        fragmentShader: SPOT_FRAG,
        uniforms: { uTint: { value: new Color(lampColor[i].x, lampColor[i].y, lampColor[i].z) }, uI: { value: 0 }, uK: { value: 0.11 } },
        side: DoubleSide,
      });
      additive(m);
      const c = new Mesh(coneGeo, m);
      const len = p.y - FLOOR_Y + 0.05;
      c.position.set(p.x, p.y - len / 2, p.z);
      c.scale.set(2.3, len, 2.3);
      c.renderOrder = 6;
      c.visible = false;
      group.add(c);
      cones.push(c);
    });
  }

  /* ── lluvia ── */
  let rain: Points<BufferGeometry, ShaderMaterial> | null = null;
  if (high && !mobile) {
    const N = 2600;
    const seeds = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) seeds[i] = r();
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    const m = new ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      uniforms: { uCam: shared.uCam, uTime: shared.uTime, uBox: { value: 22 }, uPixelRatio: { value: o.pixelRatio }, uRain: { value: 0 }, uLamps: lamps, uLampCol: lampCols },
    });
    additive(m);
    rain = new Points(g, m);
    rain.frustumCulled = false;
    rain.renderOrder = 8;
    group.add(rain);
  }

  const order = lampPos.map((_, i) => i);
  const dists = new Float32Array(nL);
  return {
    group,
    debug: { blds: blds.map((b) => ({ c: [b.c.x, b.c.y] as [number, number], t: [b.t.x, b.t.y] as [number, number], w: b.w, d: b.d, h: b.h, kind: b.kind })), path: path.map((p) => [p.x, p.y] as [number, number]) },
    setViewport(h, pr) {
      if (glow) glow.material.uniforms.uViewportH.value = h;
      if (rain) rain.material.uniforms.uPixelRatio.value = pr;
    },
    update(cam, rainAmount) {
      for (let i = 0; i < nL; i++) dists[i] = (lampPos[i].x - cam.x) ** 2 + (lampPos[i].z - cam.z) ** 2;
      order.sort((a, b) => dists[a] - dists[b]);
      for (let k = 0; k < MAX_LAMPS; k++) {
        const i = order[k];
        if (i === undefined) {
          lamps.value[k].w = 0;
          continue;
        }
        const p = lampPos[i];
        const fade = 1 - Math.min(Math.max((Math.sqrt(dists[i]) - 38) / 14, 0), 1);
        lamps.value[k].set(p.x, p.y, p.z, fade);
        lampCols.value[k].copy(lampColor[i]);
      }
      for (let i = 0; i < nL; i++) {
        const d = Math.sqrt(dists[i]);
        // lejos se apaga; muy cerca (la cámara dentro del cono) también, para no velar la imagen
        const I = (1 - Math.min(Math.max((d - 18) / 30, 0), 1)) * Math.min(Math.max((d - 1.8) / 3.2, 0), 1);
        cones[i].visible = I > 0.01;
        cones[i].material.uniforms.uI.value = I;
      }
      if (rain) rain.material.uniforms.uRain.value = rainAmount;
    },
    setLowQuality() {
      if (mirror) mirror.visible = false;
      if (rain) rain.visible = false;
    },
    dispose() {
      group.traverse((obj) => {
        const m = obj as Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      box.dispose();
      thin.dispose();
      coneGeo.dispose();
    },
  };
}

/* ───────── reflejo de una foto en el suelo mojado ───────── */
export const REFL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
export const REFL_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec2 uMargin;
  uniform float uK;          // intensidad (visibilidad × aparición × luminancia)
  uniform vec3 uCam;
  uniform float uTime;
  uniform vec4 uRoom;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    float fy = ${FLOOR_Y.toFixed(2)};
    vec3 ray = vWorld - uCam;
    vec2 P = uCam.xz + ray.xz * ((fy - uCam.y) / min(ray.y, -1e-3));
    float inRoom = step(uRoom.x, P.x) * step(P.x, uRoom.z) * step(uRoom.y, P.y) * step(P.y, uRoom.w);
    float wet = mix(puddleAt(P), 0.35, inRoom);
    vec2 inner = (vUv - uMargin) / (1.0 - 2.0 * uMargin);
    // ondulación del agua y desenfoque vertical
    inner.x += (vnoise(P * 3.0 + vec2(0.0, uTime * 0.7)) - 0.5) * 0.025 * (1.0 - inRoom);
    vec3 col = vec3(0.0);
    if (uHasTex > 0.5 && inner.x > 0.0 && inner.x < 1.0 && inner.y > 0.0 && inner.y < 1.0) {
      for (int i = 0; i < 5; i++) col += texture2D(uTex, clamp(inner + vec2(0.0, (float(i) - 2.0) * 0.012), 0.0, 1.0)).rgb;
      col /= 5.0;
    }
    float depth = fy - vWorld.y;
    float dist = length(ray);
    float k = mix(0.08, 0.62, wet) * exp(-depth * 0.55) * (1.0 - smoothstep(10.0, 40.0, dist)) * uK;
    gl_FragColor = vec4(col * k, 1.0);
  }
`;
