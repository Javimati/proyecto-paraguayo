/**
 * «A través del visor» — capa 3D de la web 4.
 * Un único renderer WebGL2 y un único bucle rAF. Ver CONTRACT.md.
 *
 * Estructura: ESTACIONES. Cada capítulo es un decorado propio (cuarto, capas de calle, muro de contactos,
 * escenario, carrusel, plano sin revelar). El scroll salta de parada en parada; en cada parada la cámara
 * mira de frente una foto que llena ~2/3 del encuadre. Al final, todas las fotos vuelan a una hoja de contactos.
 *
 * Fidelidad: las fotos se dibujan sin iluminación, sin tone mapping y sin conversión de color
 * (texturas NoColorSpace → píxeles tal cual). La foto activa no lleva niebla ni atenuado. Grano, viñeta,
 * linterna y barridos de luz se aplican en post solo fuera de las fotos (máscara en el alfa del render target).
 */
import {
  BackSide,
  DoubleSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CustomBlending,
  CylinderGeometry,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  NoColorSpace,
  NoToneMapping,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SrcAlphaFactor,
  Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
  ZeroFactor,
  type Material,
} from 'three';
import { buildLayout, type Slot } from './layout';
import {
  buildStreet,
  makeLampUniforms,
  FLOOR2_FRAG,
  FLOOR2_VERT,
  FLOOR_Y,
  REFL_FRAG,
  REFL_VERT,
  additive,
  type Circle,
  type Rect,
  type Seg,
  type Street,
} from './street';
import { TextureLoader } from './textures';
import { ExperienceUI } from './ui';
import { ViajeSound } from './sound';
import { NativeLayer, type Quad } from './native';
import {
  DIM_FRAG,
  DUST_FRAG,
  DUST_VERT,
  PHOTO_FRAG,
  PHOTO_VERT,
  POINTS_FRAG,
  POINTS_VERT,
  POST_FRAG,
  POST_VERT,
  SKY_FRAG,
  SKY_VERT,
  SPOT_FRAG,
  SPOT_VERT,
  TITLE_FRAG,
  TITLE_VERT,
  ROOM_FRAG,
  ROOM_VERT,
  WINDOW_FRAG,
  POOL_VERT,
} from './shaders';
import type { Experience, MountOptions } from './types';

export type { Experience, MountOptions, ViajeData, Tier } from './types';

const FRAME = 0.045; // ancho del marco en unidades de mundo
const REVEAL_TIME = 0.6; // s, nube de puntos de la héroe
const FADE_TIME = 0.45; // s, aparición del resto
const BASE_FOG = new Color(0.016, 0.017, 0.024);
const UP = new Vector3(0, 1, 0);
const TEXT_COLOR = new Color(0.92, 0.91, 0.88);

declare global {
  interface Window {
    __VIAJE_NO_FPS_GUARD?: boolean;
  }
}

interface PhotoObj {
  slot: Slot;
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  points: Points<BufferGeometry, ShaderMaterial> | null;
  base: { p: Vector3; q: Quaternion; s: Vector3 };
  mos: { p: Vector3; q: Quaternion; s: Vector3 };
  tex: Texture | null;
  smallTex: Texture | null;
  hires: boolean;
  /** versión grande cargada como textura (url y ancho), elegida por el tamaño real en pantalla */
  hiresUrl: string | null;
  hiresW: number;
  loading: boolean;
  revealT: number; // héroe: -1 sin empezar · 0..REVEAL_TIME
  fadeIn: number; // 0..1
  develop: number; // 0..1 (solo «Lo que viene»)
  hover: number;
  spot: Mesh<CylinderGeometry, ShaderMaterial> | null;
  backs: Mesh<CylinderGeometry, ShaderMaterial>[];
  refl: Mesh<PlaneGeometry, ShaderMaterial> | null;
  stamp: Mesh<PlaneGeometry, ShaderMaterial> | null;
}

interface Pose {
  p: Vector3;
  l: Vector3;
}

const LABEL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
/** placa de calle esmaltada (se ilumina un poco con la linterna y se funde en la niebla) */
const PLAQUE_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uFog;
  uniform float uI;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vec4 t = texture2D(uTex, vUv);
    vec3 col = t.rgb * (0.55 + 0.45 * uI);
    // brillo especular del esmalte
    col += vec3(0.25, 0.25, 0.3) * pow(1.0 - abs(vUv.x + vUv.y * 0.4 - 0.7), 12.0) * t.a * uI;
    col = mix(col, uFog, smoothstep(10.0, 46.0, vDist));
    gl_FragColor = vec4(col, t.a);
  }
`;
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export async function mountExperience(o: MountOptions): Promise<Experience> {
  try {
    if (sessionStorage.getItem('gl-off') === '1') throw new Error('gl-off');
  } catch (e) {
    if ((e as Error).message === 'gl-off') throw e;
  }

  const { root, data, tier } = o;
  for (const ch of data.chapters)
    for (const ph of ch.photos)
      if (ph.variants?.length) {
        ph.srcset ??= ph.variants.map(([w, u]) => `${u} ${w}w`).join(', ');
        ph.original ??= ph.variants[ph.variants.length - 1][1];
      }
  const high = tier === 'high';
  const touch = matchMedia('(hover: none)').matches;
  const mobile = touch || innerWidth / Math.max(innerHeight, 1) < 1;
  // móvil (mid) también hasta 2×: a 1,25× las fotos del carrusel se veían blandas en pantallas retina.
  // Si va lento, degrade() baja a 1,25× y, si aún no basta, se pasa a la versión sin animación.
  const dprCap = 2;
  const sound = new ViajeSound();

  /* ───────── renderer ───────── */
  const renderer = new WebGLRenderer({ antialias: !high, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.toneMapping = NoToneMapping;
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(BASE_FOG, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  root.append(canvas);
  /** foto real (<img srcset>) encima del lienzo cuando la cámara está quieta o en el lightbox */
  const native = new NativeLayer(root);

  const scene = new Scene();
  const heroScene = new Scene();
  const camera = new PerspectiveCamera(mobile ? 58 : 46, 1, 0.05, 420);

  /* ───────── layout ───────── */
  const layout = buildLayout(data, { perChapter: high ? 6 : 5, thumbs: high && !mobile, mobile });
  const { slots, stops, zones, finalAnchor } = layout;
  const nStops = stops.length; // la parada nStops es la hoja de contactos final
  const loader = new TextureLoader(renderer, 3, high ? 8 : 2);

  /* ───────── uniforms compartidos ───────── */
  const fog = new Color().copy(BASE_FOG);
  const fogTarget = new Color().copy(BASE_FOG);
  const tint = new Color(1, 0.93, 0.82);
  const tintTarget = new Color(1, 0.93, 0.82);
  const beamDir = new Vector3(0, 0, -1);
  const uTime = { value: 0 };
  const shared = { uFog: { value: fog }, uTint: { value: tint }, uBeamDir: { value: beamDir }, uCam: { value: new Vector3() }, uTime };

  /* ───────── cielo y suelo ───────── */
  const sky = new Mesh(
    new SphereGeometry(300, 32, 16),
    new ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: { uFog: shared.uFog, uTint: shared.uTint, uTime }, side: BackSide, depthWrite: false }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  const lampU = makeLampUniforms();
  const uRoom = { value: new Vector4(1e5, 1e5, 1e5 + 1, 1e5 + 1) };
  const floor = new Mesh(
    new PlaneGeometry(360, 360, 1, 1),
    new ShaderMaterial({
      vertexShader: FLOOR2_VERT,
      fragmentShader: FLOOR2_FRAG,
      uniforms: { uCam: shared.uCam, uBeamDir: shared.uBeamDir, uTint: shared.uTint, uFog: shared.uFog, uTime, uRoom, uWet: { value: high ? 1 : 0.7 }, uLamps: lampU.lamps, uLampCol: lampU.lampCols },
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.renderOrder = -9;
  scene.add(floor);

  /* ───────── polvo ───────── */
  let dust: Points<BufferGeometry, ShaderMaterial> | null = null;
  if (high && !mobile) {
    const N = 1600;
    const seeds = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) seeds[i] = Math.random();
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    const m = new ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: { ...shared, uBox: { value: 14 }, uPixelRatio: { value: renderer.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
    });
    keepAlpha(m, true);
    dust = new Points(g, m);
    dust.frustumCulled = false;
    dust.renderOrder = 5;
    scene.add(dust);
  }

  /* ───────── geometrías comunes ───────── */
  const planeGeo = new PlaneGeometry(1, 1);
  const spotGeo = new CylinderGeometry(0.07, 1, 1, 40, 1, true); // punta arriba (+Y)
  const gridCache = new Map<string, BufferGeometry>();
  const gridGeo = (cols: number, rows: number) => {
    const key = `${cols}x${rows}`;
    let g = gridCache.get(key);
    if (g) return g;
    const n = cols * rows;
    const grid = new Float32Array(n * 2);
    const rnd = new Float32Array(n * 4);
    for (let y = 0, k = 0; y < rows; y++)
      for (let x = 0; x < cols; x++, k++) {
        grid[k * 2] = (x + 0.5) / cols;
        grid[k * 2 + 1] = (y + 0.5) / rows;
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6);
        rnd[k * 4] = Math.cos(a) * r;
        rnd[k * 4 + 1] = Math.sin(a) * r * 0.8;
        rnd[k * 4 + 2] = Math.random() * 1.6 - 0.2;
        rnd[k * 4 + 3] = Math.random();
      }
    g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aGrid', new BufferAttribute(grid, 2));
    g.setAttribute('aRand', new BufferAttribute(rnd, 4));
    gridCache.set(key, g);
    return g;
  };

  const coneMat = (color: { value: Color }, k: number) => {
    const m = new ShaderMaterial({ vertexShader: SPOT_VERT, fragmentShader: SPOT_FRAG, uniforms: { uTint: color, uI: { value: 0 }, uK: { value: k } }, transparent: true, depthWrite: false, side: DoubleSide });
    keepAlpha(m, true);
    return m;
  };
  /** cono con la punta en `src` que se abre hacia `dst` */
  const placeCone = (mesh: Mesh, src: Vector3, dst: Vector3, spread: number) => {
    const dir = dst.clone().sub(src);
    const len = dir.length();
    mesh.position.copy(src).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), dir.normalize());
    mesh.scale.set(spread, len, spread);
  };

  /* ───────── decorados por capítulo ───────── */
  const decor: Mesh[] = [];
  const decorMats: ShaderMaterial[] = [];
  const roomMat = (light: Vector3, I: number) => {
    const m = new ShaderMaterial({ vertexShader: ROOM_VERT, fragmentShader: ROOM_FRAG, uniforms: { uFog: shared.uFog, uTint: shared.uTint, uLight: { value: light }, uI: { value: I } } });
    decorMats.push(m);
    return m;
  };
  const addPlane = (mat: ShaderMaterial, pos: Vector3, rotY: number, rotX: number, w: number, h: number, chapter: number) => {
    const m = new Mesh(planeGeo, mat);
    m.position.copy(pos);
    m.rotation.set(rotX, rotY, 0, 'YXZ');
    m.scale.set(w, h, 1);
    m.userData.chapter = chapter;
    scene.add(m);
    decor.push(m);
    return m;
  };
  const windowLights: { win: ShaderMaterial; shaft: ShaderMaterial; chapter: number }[] = [];
  for (const z of zones) {
    const A = z.anchor;
    if (z.preset === 'room') {
      const hero = slots[z.hero];
      const light = hero.pos.clone().add(new Vector3(-hero.width * 0.35, -0.2, 0.02));
      const wall = roomMat(light, 1);
      addPlane(wall, A.clone().add(new Vector3(0, -0.1, -6.5)), 0, 0, 10.2, 5.2, z.index); // fondo
      addPlane(wall, A.clone().add(new Vector3(-5, -0.1, -1.2)), Math.PI / 2, 0, 10.8, 5.2, z.index); // izquierda
      addPlane(wall, A.clone().add(new Vector3(5, -0.1, -1.2)), -Math.PI / 2, 0, 10.8, 5.2, z.index); // derecha
      addPlane(roomMat(light, 0.4), A.clone().add(new Vector3(0, 2.5, -1.2)), 0, Math.PI / 2, 10.2, 10.8, z.index); // techo
      // ventana alta en la pared izquierda y su haz sobre la héroe
      const win = new ShaderMaterial({ vertexShader: POOL_VERT, fragmentShader: WINDOW_FRAG, uniforms: { uI: { value: 0.9 } } });
      decorMats.push(win);
      const wpos = A.clone().add(new Vector3(-4.97, 1.55, -5.3));
      addPlane(win, wpos, Math.PI / 2, 0, 1.1, 1.5, z.index);
      const shaftC = coneMat({ value: new Color(1, 0.92, 0.78) }, 0.05);
      const shaft = new Mesh(spotGeo, shaftC);
      placeCone(shaft, wpos.clone().add(new Vector3(0.05, 0.1, 0)), light.clone().add(new Vector3(0.5, -0.4, 0.2)), 1.8);
      shaft.renderOrder = 6;
      shaft.userData.chapter = z.index;
      scene.add(shaft);
      decor.push(shaft);
      windowLights.push({ win, shaft: shaftC, chapter: z.index });
    } else if (z.preset === 'wall') {
      // muro: fondo oscuro detrás de la rejilla
      const s0 = slots.filter((s) => s.chapter === z.index);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const s of s0) {
        x0 = Math.min(x0, s.pos.x - s.width / 2);
        x1 = Math.max(x1, s.pos.x + s.width / 2);
        y0 = Math.min(y0, s.pos.y - s.height / 2);
        y1 = Math.max(y1, s.pos.y + s.height / 2);
      }
      const c = new Vector3((x0 + x1) / 2, (y0 + y1) / 2, s0[0].pos.z - 0.06);
      addPlane(roomMat(c.clone().add(new Vector3(0, 1.5, 0.5)), 0.5), c, 0, 0, x1 - x0 + 3, y1 - y0 + 2.6, z.index);
    } else if (z.preset === 'stage') {
      // tarima del escenario
      const s0 = slots.filter((s) => s.chapter === z.index);
      const cx = s0.reduce((a, s) => a + s.pos.x, 0) / s0.length;
      const st = A.clone().add(new Vector3(cx - A.x, -1.55, -5.8));
      addPlane(roomMat(st.clone().add(new Vector3(0, 0, 0.6)), 1.1), st, 0, -Math.PI / 2, s0.length * 4.3 + 4, 5.5, z.index);
    }
  }

  /* ───────── fotos ───────── */
  const photos: PhotoObj[] = slots.map((slot) => {
    const W = slot.width + FRAME * 2;
    const H = slot.height + FRAME * 2;
    const isDevelop = zones[slot.chapter].preset === 'develop' && slot.role === 'hero';
    const mat = new ShaderMaterial({
      vertexShader: PHOTO_VERT,
      fragmentShader: PHOTO_FRAG,
      uniforms: {
        uTex: { value: null },
        uHasTex: { value: 0 },
        uReveal: { value: 0 },
        uMargin: { value: new Vector2(FRAME / W, FRAME / H) },
        uFog: shared.uFog,
        uFogRange: { value: new Vector2(9, 40) },
        uGlow: { value: 0 },
        uHero: { value: 0 },
        uLum: { value: 0.35 },
        uDevelop: { value: isDevelop ? 0 : 1 },
        uFade: { value: 1 },
        uSoft: { value: 0 },
        uAspect: { value: new Vector2(W / H, 1) },
      },
      transparent: true,
      depthWrite: true,
      blending: CustomBlending,
    });
    mat.blendSrc = SrcAlphaFactor;
    mat.blendDst = OneMinusSrcAlphaFactor;
    mat.blendSrcAlpha = ZeroFactor;
    mat.blendDstAlpha = OneMinusSrcAlphaFactor;
    const mesh = new Mesh(planeGeo, mat);
    mesh.scale.set(W, H, 1);
    mesh.position.copy(slot.pos);
    mesh.quaternion.copy(slot.quat);
    mesh.userData.index = slot.index;
    mesh.visible = false;
    scene.add(mesh);

    // foco cenital (no en el cuarto: allí manda la ventana)
    let spot: PhotoObj['spot'] = null;
    const preset = zones[slot.chapter].preset;
    if (slot.role !== 'thumb' && preset !== 'room' && preset !== 'stage') {
      spot = new Mesh(spotGeo, coneMat(shared.uTint, 0.07));
      const src = slot.pos.clone().addScaledVector(slot.normal, 1.1).add(new Vector3(0, slot.height * 0.5 + 3.2, 0));
      const dst = slot.pos.clone().addScaledVector(slot.normal, 0.6).add(new Vector3(0, -slot.height * 0.5 - 0.8, 0));
      placeCone(spot, src, dst, Math.max(slot.width, 1.6) * 0.55);
      spot.renderOrder = 6;
      spot.visible = false;
      scene.add(spot);
    }
    // contraluces del escenario: dos haces cruzados del color de la foto, por detrás
    const backs: PhotoObj['backs'] = [];
    if (slot.back) {
      const col = { value: new Color(slot.back[0], slot.back[1], slot.back[2]) };
      for (const side of [-1, 1]) {
        const b = new Mesh(spotGeo, coneMat(col, 0.16));
        const src = slot.pos.clone().add(new Vector3(side * (slot.width * 0.5 + 1.2), slot.height * 0.5 + 3.4, -1.6));
        const dst = slot.pos.clone().add(new Vector3(-side * slot.width * 0.25, -slot.height * 0.5 - 1.2, 2.2));
        placeCone(b, src, dst, 1.3);
        b.renderOrder = 6;
        b.visible = false;
        scene.add(b);
        backs.push(b);
      }
    }
    // reflejo en el suelo mojado (gama alta)
    let refl: PhotoObj['refl'] = null;
    if (high && slot.role !== 'thumb') {
      const rm = new ShaderMaterial({
        vertexShader: REFL_VERT,
        fragmentShader: REFL_FRAG,
        uniforms: { uTex: mat.uniforms.uTex, uHasTex: mat.uniforms.uHasTex, uMargin: mat.uniforms.uMargin, uK: { value: 0 }, uCam: shared.uCam, uTime, uRoom },
        side: DoubleSide,
      });
      additive(rm);
      refl = new Mesh(planeGeo, rm);
      refl.matrixAutoUpdate = false;
      refl.renderOrder = -3;
      refl.visible = false;
      scene.add(refl);
    }
    return {
      slot,
      mesh,
      refl,
      stamp: null,
      points: null,
      base: { p: slot.pos.clone(), q: slot.quat.clone(), s: new Vector3(W, H, 1) },
      mos: { p: new Vector3(), q: new Quaternion(), s: new Vector3(1, 1, 1) },
      tex: null,
      smallTex: null,
      hires: false,
      hiresUrl: null,
      hiresW: 0,
      loading: false,
      revealT: -1,
      fadeIn: 0,
      develop: isDevelop ? 0 : 1,
      hover: 0,
      spot,
      backs,
    };
  });

  /* ───────── hoja de contactos final (poses de destino) ───────── */
  const N = photos.length;
  const mosCols = Math.max(4, Math.ceil(Math.sqrt(N * 1.9)));
  const mosRows = Math.ceil(N / mosCols);
  const cellW = 1.5;
  const cellH = 1.02;
  const mosGap = 0.14;
  const gridW = mosCols * cellW + (mosCols - 1) * mosGap;
  const gridH = mosRows * cellH + (mosRows - 1) * mosGap;
  photos.forEach((p, i) => {
    const c = i % mosCols;
    const r = Math.floor(i / mosCols);
    p.mos.p.set(finalAnchor.x - gridW / 2 + cellW / 2 + c * (cellW + mosGap), finalAnchor.y + gridH / 2 - cellH / 2 - r * (cellH + mosGap), finalAnchor.z);
    const a = p.slot.photo.w / p.slot.photo.h;
    let w = cellW, h = cellW / a;
    if (h > cellH) {
      h = cellH;
      w = h * a;
    }
    p.mos.s.set(w, h, 1);
  });

  const makePoints = (p: PhotoObj) => {
    const aspect = p.slot.photo.w / p.slot.photo.h;
    const cols = aspect >= 1 ? (high ? 72 : 48) : Math.round((high ? 72 : 48) * aspect);
    const rows = aspect >= 1 ? Math.round(cols / aspect) : high ? 72 : 48;
    const W = p.slot.width + FRAME * 2;
    const H = p.slot.height + FRAME * 2;
    const m = new ShaderMaterial({
      vertexShader: POINTS_VERT.replace('vec3 target = vec3(aGrid - 0.5, 0.0);', 'vec3 target = vec3(uMargin + aGrid * (1.0 - 2.0 * uMargin) - 0.5, 0.002);').replace('uniform float uTime;', 'uniform float uTime;\n  uniform vec2 uMargin;'),
      fragmentShader: POINTS_FRAG,
      uniforms: {
        uTex: { value: p.tex },
        uProgress: { value: 0 },
        uScale: { value: new Vector2(W, H) },
        uCell: { value: p.slot.width / cols },
        uViewportH: { value: height },
        uTime,
        uMargin: { value: new Vector2(FRAME / W, FRAME / H) },
      },
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
    });
    keepAlpha(m, false);
    const pts = new Points(gridGeo(cols, rows), m);
    pts.frustumCulled = false;
    pts.renderOrder = 4;
    p.mesh.add(pts);
    p.points = pts;
  };

  /* ───────── títulos 3D (detrás de la foto héroe, parcialmente tapados) ───────── */
  const titles: { mesh: Mesh<PlaneGeometry, ShaderMaterial>; chapter: number; prog: number }[] = [];
  const buildTitles = async () => {
    try {
      await Promise.race([document.fonts.load('700 120px Bricolage'), new Promise((r) => setTimeout(r, 1500))]);
    } catch {
      /* fuente de respaldo */
    }
    if (disposed) return;
    for (const z of zones) {
      const ch = data.chapters[z.index];
      const hero = slots[z.hero];
      if (!ch || !hero) continue;
      const cv = document.createElement('canvas');
      const ctx = cv.getContext('2d');
      if (!ctx) continue;
      const fs = 300;
      const font = `700 ${fs}px Bricolage, "Bricolage Fallback", sans-serif`;
      ctx.font = font;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-fs * 0.035}px`;
      const tw = Math.ceil(ctx.measureText(ch.title).width) + 80;
      cv.width = Math.min(4096, tw);
      cv.height = Math.round(fs * 1.25);
      ctx.font = font;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-fs * 0.035}px`;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(ch.title, 40, fs * 0.98);
      const tex = new CanvasTexture(cv);
      tex.colorSpace = NoColorSpace;
      tex.minFilter = LinearFilter;
      tex.generateMipmaps = false;
      const mat = new ShaderMaterial({
        vertexShader: TITLE_VERT,
        fragmentShader: TITLE_FRAG,
        uniforms: { uTex: { value: tex }, uProg: { value: 0 }, uColor: { value: TEXT_COLOR }, uFog: shared.uFog },
        transparent: true,
        depthWrite: false,
        // sin test de profundidad: las paredes del cuarto no lo recortan («esde Arganda»);
        // se dibuja antes que las fotos (renderOrder -1), así la foto héroe sigue tapándolo en parte
        depthTest: false,
      });
      keepAlpha(mat, false);
      const mesh = new Mesh(planeGeo, mat);
      const aspect = cv.width / cv.height;
      const right = new Vector3(1, 0, 0).applyQuaternion(hero.quat);
      if (mobile) {
        let w = Math.min(hero.width * 1.1, 2.3);
        let h = w / aspect;
        // los títulos cortos no crecen sin límite: alto máximo para que no se metan bajo la cabecera
        if (h > 0.36) {
          h = 0.36;
          w = h * aspect;
        }
        mesh.scale.set(w, h, 1);
        mesh.position.copy(hero.pos).add(new Vector3(0, hero.height / 2 + h * 0.75 + 0.05, -0.05));
      } else {
        let h = hero.height * 0.64;
        let w = h * aspect;
        const maxW = hero.width * 2.4 + 3;
        if (w > maxW) {
          w = maxW;
          h = w / aspect;
        }
        mesh.scale.set(w, h, 1);
        mesh.position
          .copy(hero.pos)
          .addScaledVector(hero.normal, -2.2)
          .addScaledVector(UP, hero.height * 0.36)
          .addScaledVector(right, -hero.width * 0.55 - w * 0.12);
      }
      mesh.quaternion.copy(hero.quat);
      mesh.renderOrder = -1;
      mesh.visible = false;
      scene.add(mesh);
      titles.push({ mesh, chapter: z.index, prog: 0 });

      // placa de calle a la entrada de cada capítulo (salvo el primero, que empieza en casa)
      if (z.index > 0) {
        const pc = document.createElement('canvas');
        pc.width = 1024;
        pc.height = 360;
        const g = pc.getContext('2d');
        if (g) {
          const rr = (x: number, y: number, w: number, h: number, r: number) => {
            g.beginPath();
            g.moveTo(x + r, y);
            g.arcTo(x + w, y, x + w, y + h, r);
            g.arcTo(x + w, y + h, x, y + h, r);
            g.arcTo(x, y + h, x, y, r);
            g.arcTo(x, y, x + w, y, r);
            g.closePath();
          };
          const grd = g.createLinearGradient(0, 0, 0, 360);
          grd.addColorStop(0, '#24456f');
          grd.addColorStop(1, '#152a47');
          rr(6, 6, 1012, 348, 34);
          g.fillStyle = grd;
          g.fill();
          rr(26, 26, 972, 308, 22);
          g.lineWidth = 9;
          g.strokeStyle = '#f2efe6';
          g.stroke();
          g.fillStyle = '#f2efe6';
          g.textAlign = 'center';
          g.font = '500 40px Martian, "Martian Fallback", monospace';
          const num = String(ch.n).padStart(2, '0');
          g.fillText(`${data.lang === 'en' ? 'CHAPTER' : 'CAPÍTULO'} ${num}`, 512, 102);
          let fs2 = 150;
          const ttl = ch.title.toUpperCase();
          g.font = `800 ${fs2}px Bricolage, "Bricolage Fallback", sans-serif`;
          while (g.measureText(ttl).width > 880 && fs2 > 60) {
            fs2 -= 6;
            g.font = `800 ${fs2}px Bricolage, "Bricolage Fallback", sans-serif`;
          }
          g.fillText(ttl, 512, 240 + fs2 * 0.18);
          // tornillos
          for (const [x, y] of [[60, 60], [964, 60], [60, 300], [964, 300]]) {
            g.beginPath();
            g.arc(x, y, 9, 0, Math.PI * 2);
            g.fillStyle = '#c9c4b8';
            g.fill();
          }
          const pt = new CanvasTexture(pc);
          pt.colorSpace = NoColorSpace;
          pt.anisotropy = 4;
          const pm = new ShaderMaterial({ vertexShader: LABEL_VERT, fragmentShader: PLAQUE_FRAG, uniforms: { uTex: { value: pt }, uFog: shared.uFog, uI: { value: 0.6 } }, transparent: true, side: DoubleSide });
          keepAlpha(pm, false);
          const plate = new Mesh(planeGeo, pm);
          plate.scale.set(1.9, 1.9 * (360 / 1024), 1);
          plate.visible = false;
          plate.renderOrder = 2;
          scene.add(plate);
          const pole = new Mesh(new CylinderGeometry(0.035, 0.035, 1, 8), new ShaderMaterial({ vertexShader: LABEL_VERT, fragmentShader: 'uniform vec3 uFog; varying float vDist; void main(){ gl_FragColor = vec4(mix(vec3(0.05,0.05,0.055), uFog, smoothstep(10.0,46.0,vDist)), 1.0); }', uniforms: { uFog: shared.uFog } }));
          pole.visible = false;
          scene.add(pole);
          plaques.push({ plate, pole, chapter: z.index });
        }
      }
    }
    placeTitles();
  };
  const plaques: { plate: Mesh<PlaneGeometry, ShaderMaterial>; pole: Mesh; chapter: number }[] = [];
  /** en escritorio el título se coloca respecto al encuadre de la parada héroe: empieza dentro del cuadro, a la
   *  izquierda, y pasa por detrás de la foto (que lo tapa en parte) */
  const placeTitles = () => {
    const P: Pose = { p: new Vector3(), l: new Vector3() };
    for (const t of mobile ? [] : titles) {
      const z = zones[t.chapter];
      const heroS = slots[z.hero];
      stopPose(z.firstStop, P);
      const dir = P.l.clone().sub(P.p).normalize();
      const right = new Vector3().crossVectors(dir, UP).normalize();
      const up = new Vector3().crossVectors(right, dir).normalize();
      const dCam = P.l.distanceTo(P.p) + (z.preset === 'room' ? 0.16 : 2.2); // en el cuarto, entre la foto y la pared
      const vh = 2 * dCam * tanHalf();
      const vw = vh * camera.aspect;
      const aspectT = t.mesh.scale.x / t.mesh.scale.y;
      let h = Math.min(vh * 0.165, heroS.height * 0.9);
      let w = h * aspectT;
      if (w > vw * 0.92) {
        w = vw * 0.92;
        h = w / aspectT;
      }
      t.mesh.scale.set(w, h, 1);
      t.mesh.position
        .copy(P.p)
        .addScaledVector(dir, dCam)
        .addScaledVector(right, -vw / 2 + vw * 0.06 + w / 2)
        .addScaledVector(up, vh * 0.345);
      t.mesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), dir.clone().negate());
    }
    // placas: en la curva de transición hacia el capítulo, a la derecha, colgadas de un poste
    for (const pq of plaques) {
      const z = zones[pq.chapter];
      const s0 = z.firstStop - 1 + 0.5;
      poseAt(s0);
      const a = camPos.clone();
      poseAt(s0 + 0.04);
      const fwd = camPos.clone().sub(a).setY(0);
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
      fwd.normalize();
      const right = new Vector3().crossVectors(fwd, UP).normalize();
      const at = a.clone().addScaledVector(fwd, 5.5).addScaledVector(right, 2.1);
      at.y = Math.max(a.y - 0.6, FLOOR_Y + 2.2);
      pq.plate.position.copy(at);
      pq.plate.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), fwd.clone().negate().addScaledVector(right, -0.35).normalize());
      // poste por detrás de la placa, del suelo hasta su borde superior
      const nrm = new Vector3(0, 0, 1).applyQuaternion(pq.plate.quaternion);
      const top = at.y + pq.plate.scale.y / 2 + 0.08;
      const ph = top - FLOOR_Y;
      pq.pole.position.set(at.x - nrm.x * 0.07, FLOOR_Y + ph / 2, at.z - nrm.z * 0.07);
      pq.pole.scale.set(1, ph, 1);
    }
  };

  /* ───────── lightbox: plano héroe que se dibuja encima del post ───────── */
  const heroMat = new ShaderMaterial({
    vertexShader: PHOTO_VERT,
    fragmentShader: PHOTO_FRAG,
    uniforms: {
      uTex: { value: null },
      uHasTex: { value: 0 },
      uReveal: { value: 1 },
      uMargin: { value: new Vector2(0.003, 0.003) },
      uFog: shared.uFog,
      uFogRange: { value: new Vector2(999, 1000) },
      uGlow: { value: 0.6 },
      uHero: { value: 1 },
      uLum: { value: 1 },
      uDevelop: { value: 1 },
      uFade: { value: 1 },
      uSoft: { value: 0 },
      uAspect: { value: new Vector2(1, 1) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const hero = new Mesh(planeGeo, heroMat);
  hero.visible = false;
  heroScene.add(hero);

  /* ───────── post ───────── */
  const quadGeo = new PlaneGeometry(2, 2);
  const postScene = new Scene();
  const postMat = new ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    uniforms: {
      tScene: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uTime,
      uVel: { value: 0 },
      uDim: { value: 0 },
      uPointer: { value: new Vector2(0.5, 0.5) },
      uTint: shared.uTint,
      uGrain: { value: 0.045 },
      uBlur: { value: 1 },
      uDark: { value: 1 },
      uFx: { value: high ? 1 : 0 },
      uSweep: { value: 0 },
      uSweepPos: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const postQuad = new Mesh(quadGeo, postMat);
  postQuad.frustumCulled = false;
  postScene.add(postQuad);
  const dimScene = new Scene();
  const dimMat = new ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: DIM_FRAG, uniforms: { uDim: postMat.uniforms.uDim }, transparent: true, depthTest: false, depthWrite: false });
  const dimQuad = new Mesh(quadGeo, dimMat);
  dimQuad.frustumCulled = false;
  dimScene.add(dimQuad);

  let usePost = high;
  let rt: WebGLRenderTarget | null = null;
  const makeRT = () => {
    rt?.dispose();
    rt = null;
    const s = renderer.getDrawingBufferSize(new Vector2());
    rt = new WebGLRenderTarget(s.x, s.y, { samples: usePost ? 4 : 0, type: renderer.capabilities.isWebGL2 ? UnsignedByteType : HalfFloatType, depthBuffer: true });
    postMat.uniforms.tScene.value = rt.texture;
  };

  /* ───────── UI ───────── */
  const ui = new ExperienceUI(
    o.ui,
    data,
    slots,
    {
      goChapter: (i) => goChapterIndex(i),
      focusPhoto: (i) => focusPhoto(i),
      activatePhoto: (i) => openIndex(i),
      close: () => closeLightbox(),
      prev: () => stepLightbox(-1),
      next: () => stepLightbox(1),
      toggleSound: (on) => {
        sound.setEnabled(on);
        if (on) sound.setChapter(Math.max(activeChapter, 0), true);
      },
    },
    sound.on,
  );
  ui.el.style.opacity = '0';
  ui.el.style.transition = 'opacity .8s ease';

  /* ───────── estado ───────── */
  let started = false;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let cs = 0; // posición actual (en paradas)
  let csV = 0; // velocidad del muelle de la cámara (paradas/s)
  let ts = 0; // posición objetivo
  let vel = 0;
  let focus = 0;
  let introK = 1; // 1 = encuadre cerrado detrás de la intro (match-cut) · 0 = encuadre normal
  let activeChapter = -1;
  let hovered = -1;
  let focusIndex = -1;
  let pointerDirty = true;
  let lastInput = 0;
  const pointer = new Vector2(0.5, 0.5);
  const pointerS = new Vector2(0.5, 0.5);
  const ndc = new Vector2();
  let hasPointer = false;
  const raycaster = new Raycaster();
  let width = 1;
  let height = 1;

  /** 0 = viajando · 1 = cámara quieta delante de una foto (sin balanceo ni parallax: la foto queda clavada) */
  let restW = 0;
  let restSince = 0;
  let lbOpen = false;
  let lbIndex = -1;
  let lbT = 0;
  let lbDir = 0;
  let lbFade = 1;
  let lbSwap: number | null = null;
  const lbFrom = { p: new Vector3(), q: new Quaternion(), s: new Vector3() };
  const lbTo = { p: new Vector3(), q: new Quaternion(), s: new Vector3() };

  /* ───────── encuadres ───────── */
  const tanHalf = () => Math.tan((camera.fov * Math.PI) / 360);
  const fitDist = (w: number, h: number, fillH: number, fillW: number) => {
    const t = tanHalf();
    return Math.max(h / fillH / (2 * t), w / fillW / (2 * t * camera.aspect));
  };
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const stopPose = (k: number, out: Pose) => {
    const s = slots[stops[k].slot];
    const W = s.width + FRAME * 2;
    const H = s.height + FRAME * 2;
    const isHero = s.role === 'hero';
    // móvil: las verticales algo más pequeñas para que el título del capítulo quepa encima, bajo la cabecera
    const d = mobile ? fitDist(W, H, H > W ? (isHero ? 0.46 : 0.54) : 0.6, 0.86) : fitDist(W, H, isHero ? 0.56 : 0.68, isHero ? 0.52 : 0.74);
    out.p.copy(s.pos).addScaledVector(s.normal, d).add(s.camOffset);
    out.l.copy(s.pos).addScaledVector(s.camOffset, 0.15);
    const right = tmpA.crossVectors(s.normal, UP).normalize().negate(); // derecha de pantalla
    if (mobile) {
      // la foto arriba; abajo queda sitio para el texto
      const vh = 2 * d * tanHalf();
      out.p.addScaledVector(UP, -vh * 0.1);
      out.l.addScaledVector(UP, -vh * 0.1);
    } else if (isHero) {
      // la héroe a la derecha: el título gigante asoma a la izquierda y el texto queda abajo a la izquierda
      const vw = 2 * d * tanHalf() * camera.aspect;
      out.p.addScaledVector(right, -vw * 0.1);
      out.l.addScaledVector(right, -vw * 0.1);
    }
    return out;
  };
  const finalPose = (out: Pose) => {
    const fillW = mobile ? 0.94 : 0.9;
    const fillH = mobile ? 0.46 : 0.52;
    const d = fitDist(gridW, gridH, fillH, fillW);
    const vh = 2 * d * tanHalf();
    out.p.copy(finalAnchor).add(new Vector3(0, -vh * (mobile ? 0.16 : 0.12), d));
    out.l.copy(finalAnchor).add(new Vector3(0, -vh * (mobile ? 0.16 : 0.12), 0));
    return out;
  };

  const PA: Pose = { p: new Vector3(), l: new Vector3() };
  const PB: Pose = { p: new Vector3(), l: new Vector3() };
  /** longitud real (mundo) de cada tramo parada k → k+1 (el último va a la hoja de contactos) */
  let segLen: number[] = [];
  const computeSegs = () => {
    const A: Pose = { p: new Vector3(), l: new Vector3() };
    const B: Pose = { p: new Vector3(), l: new Vector3() };
    segLen = [];
    for (let k = 0; k < nStops; k++) {
      stopPose(k, A);
      if (k + 1 < nStops) stopPose(k + 1, B);
      else finalPose(B);
      const cross = k + 1 >= nStops || stops[k].chapter !== stops[k + 1].chapter;
      segLen.push(A.p.distanceTo(B.p) * (cross ? 1.25 : 1) + (cross ? 4 : 0));
    }
  };
  /** 1 en tramos cortos (dentro de un capítulo) · ~0,4 en los saltos largos entre capítulos */
  const segScale = (a: number, b: number) => {
    if (!segLen.length) return 1;
    const lo = clamp(Math.floor(Math.min(a, b)), 0, nStops - 1);
    const hi = clamp(Math.ceil(Math.max(a, b)) - 1, lo, nStops - 1);
    let L = 0;
    for (let k = lo; k <= hi; k++) L = Math.max(L, segLen[k]);
    return clamp(Math.sqrt(4.5 / Math.max(L, 0.1)), 0.26, 1);
  };
  const camPos = new Vector3();
  const camLook = new Vector3();
  let segSweep = 0;
  let segSweepPos = 0;
  const poseAt = (s: number) => {
    segSweep = 0;
    s = clamp(s, 0, nStops);
    if (s >= nStops - 1) {
      // última parada → hoja de contactos
      const u = smoother(clamp(s - (nStops - 1), 0, 1));
      stopPose(nStops - 1, PA);
      finalPose(PB);
      bezier(PA.p, PB.p, u, 4, camPos);
      camLook.lerpVectors(PA.l, PB.l, u);
      return;
    }
    const k = Math.floor(s);
    const u = s - k;
    stopPose(k, PA);
    if (u < 1e-4) {
      camPos.copy(PA.p);
      camLook.copy(PA.l);
      return;
    }
    stopPose(k + 1, PB);
    const eu = smoother(u);
    const ca = stops[k].chapter;
    const cb = stops[k + 1].chapter;
    if (ca === cb) {
      const z = zones[ca];
      if (z.preset === 'carousel' && z.center) {
        orbit(z.center, PA.p, PB.p, eu, camPos);
        orbit(z.center, PA.l, PB.l, eu, camLook);
      } else {
        camPos.lerpVectors(PA.p, PB.p, eu);
        camLook.lerpVectors(PA.l, PB.l, eu);
        // arco cinematográfico: se separa un poco del decorado entre parada y parada
        tmpA.copy(PA.p).sub(PA.l).add(tmpB.copy(PB.p).sub(PB.l)).normalize();
        camPos.addScaledVector(tmpA, Math.sin(Math.PI * u) * 0.9);
      }
    } else {
      // cambio de capítulo: grúa por encima, con barrido de luz
      bezier(PA.p, PB.p, eu, 2.2, camPos);
      camLook.lerpVectors(PA.l, PB.l, smoother(clamp(u * 1.25 - 0.12, 0, 1)));
      segSweep = Math.pow(Math.sin(Math.PI * u), 2);
      segSweepPos = u * 1.5 - 0.25;
    }
  };
  const bezier = (a: Vector3, b: Vector3, u: number, lift: number, out: Vector3) => {
    const c = tmpA.lerpVectors(a, b, 0.5).addScaledVector(UP, lift);
    const iu = 1 - u;
    out.set(
      iu * iu * a.x + 2 * iu * u * c.x + u * u * b.x,
      iu * iu * a.y + 2 * iu * u * c.y + u * u * b.y,
      iu * iu * a.z + 2 * iu * u * c.z + u * u * b.z,
    );
  };
  const orbit = (c: Vector3, a: Vector3, b: Vector3, u: number, out: Vector3) => {
    const ax = a.x - c.x, az = a.z - c.z, bx = b.x - c.x, bz = b.z - c.z;
    const ra = Math.hypot(ax, az), rb = Math.hypot(bx, bz);
    const aa = Math.atan2(ax, az);
    let ab = Math.atan2(bx, bz);
    while (ab - aa > Math.PI) ab -= Math.PI * 2;
    while (ab - aa < -Math.PI) ab += Math.PI * 2;
    const an = aa + (ab - aa) * u;
    const r = ra + (rb - ra) * u;
    out.set(c.x + Math.sin(an) * r, a.y + (b.y - a.y) * u, c.z + Math.cos(an) * r);
  };

  /* ───────── carga de texturas ───────── */
  const firstChapter = photos.filter((p) => p.slot.chapter === 0);
  let firstLoaded = 0;
  o.onProgress?.(0);
  const zoneDist = (p: PhotoObj, at: number) => {
    const z = zones[p.slot.chapter];
    return at < z.firstStop ? z.firstStop - at : at > z.lastStop ? at - z.lastStop : 0;
  };
  const ensureTex = (p: PhotoObj) => {
    if (p.smallTex || p.loading) return;
    p.loading = true;
    loader
      .load(p.slot.photo.srcSmall, zoneDist(p, ts) * 10 + p.slot.index * 0.01)
      .then((t) => {
        if (disposed) return;
        p.smallTex = t;
        if (!p.hiresUrl || !p.tex) setTex(p, t);
        if (p.slot.chapter === 0) {
          firstLoaded++;
          o.onProgress?.(firstLoaded / firstChapter.length);
        }
      })
      .catch(() => {
        if (p.slot.chapter === 0) {
          firstLoaded++;
          o.onProgress?.(firstLoaded / firstChapter.length);
        }
      });
  };
  /** ancho en píxeles físicos del lienzo que ocupa la foto en su parada (para elegir la textura justa) */
  const PN: Pose = { p: new Vector3(), l: new Vector3() };
  const neededPx = (p: PhotoObj) => {
    const bufW = width * renderer.getPixelRatio();
    if (p.slot.stop < 0) return bufW * 0.3;
    stopPose(p.slot.stop, PN);
    const d = Math.max(PN.p.distanceTo(p.slot.pos), 0.5);
    return (p.slot.width / (2 * d * tanHalf() * camera.aspect)) * bufW;
  };
  const maxTex = Math.min(renderer.capabilities.maxTextureSize || 4096, 4096);
  /** ancho en píxeles físicos que ocupa AHORA la foto en pantalla (satélites, carrusel, fotos de paso) */
  const SP = new Vector3();
  const screenPx = (p: PhotoObj) => {
    p.mesh.updateMatrixWorld();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [lx, ly] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] as const) {
      SP.set(lx, ly, 0).applyMatrix4(p.mesh.matrixWorld).project(camera);
      if (SP.z > 1 || SP.z < -1) return 0;
      x0 = Math.min(x0, SP.x); x1 = Math.max(x1, SP.x); y0 = Math.min(y0, SP.y); y1 = Math.max(y1, SP.y);
    }
    // fuera de pantalla: no hace falta más detalle
    if (x1 < -1 || x0 > 1 || y1 < -1 || y0 > 1) return 0;
    const s = renderer.getDrawingBufferSize(SV2);
    return Math.max(((x1 - x0) / 2) * s.x, ((y1 - y0) / 2) * s.y * (p.slot.photo.w / p.slot.photo.h));
  };
  const SV2 = new Vector2();
  const ensureHires = (p: PhotoObj, needAtLeast = 0) => {
    const vs = p.slot.photo.variants;
    let url = p.slot.photo.src;
    let w = 1600;
    if (vs && vs.length) {
      const need = Math.max(p.slot.stop >= 0 ? neededPx(p) : 0, needAtLeast);
      const fit = vs.filter(([vw]) => vw <= maxTex && vw <= 3200);
      const pickV = fit.find(([vw]) => vw >= need) ?? fit[fit.length - 1] ?? vs[0];
      [w, url] = pickV;
    }
    if (url === p.slot.photo.srcSmall) return;
    if (p.hires && (url === p.hiresUrl || w <= p.hiresW)) return;
    const prevUrl = p.hiresUrl;
    p.hires = true;
    p.hiresUrl = url;
    p.hiresW = w;
    loader
      .load(url, -1)
      .then((t) => {
        if (disposed || p.hiresUrl !== url) return;
        setTex(p, t);
        if (lbOpen && lbIndex === p.slot.index) heroMat.uniforms.uTex.value = t;
        if (prevUrl && prevUrl !== url) loader.release(prevUrl);
      })
      .catch(() => {
        if (p.hiresUrl === url) {
          p.hires = false;
          p.hiresUrl = null;
          p.hiresW = 0;
        }
      });
  };
  /** vuelve a la textura pequeña y libera la grande (fotos lejanas): la memoria de GPU no crece al viajar */
  const dropHires = (p: PhotoObj) => {
    if (!p.hiresUrl || !p.smallTex) return;
    const url = p.hiresUrl;
    p.hires = false;
    p.hiresUrl = null;
    p.hiresW = 0;
    setTex(p, p.smallTex);
    loader.release(url);
  };
  const setTex = (p: PhotoObj, t: Texture) => {
    p.tex = t;
    p.mesh.material.uniforms.uTex.value = t;
    p.mesh.material.uniforms.uHasTex.value = 1;
    if (p.points) p.points.material.uniforms.uTex.value = t;
  };
  photos.forEach((p) => ensureTex(p));
  // la héroe del capítulo 1 se ve ya (desenfocada) detrás de la intro: en alta en cuanto se pueda
  queueMicrotask(() => !disposed && ensureHires(photos[zones[0].hero]));

  /* ───────── navegación ───────── */
  const curStop = () => clamp(Math.round(cs), 0, nStops);
  const goChapterIndex = (i: number) => {
    const z = zones[clamp(i, 0, zones.length - 1)];
    if (lbOpen) closeLightbox();
    const target = z.firstStop;
    const curChapter = cs >= nStops - 0.5 ? zones.length : stops[clamp(Math.round(cs), 0, nStops - 1)].chapter;
    if (Math.abs(curChapter - z.index) > 1) {
      ui.curtainJump(() => {
        ts = cs = target;
        csV = 0;
        vel = 0;
      });
    } else ts = target;
  };
  const nearestStopInChapter = (p: PhotoObj) => {
    const z = zones[p.slot.chapter];
    let best = z.firstStop;
    let bd = Infinity;
    for (let k = z.firstStop; k <= z.lastStop; k++) {
      const d = slots[stops[k].slot].pos.distanceTo(p.slot.pos);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };
  const inMosaic = () => cs > nStops - 0.5;
  const focusPhoto = (i: number) => {
    const p = photos[i];
    if (!p) return;
    focusIndex = i;
    if (inMosaic()) return;
    ts = p.slot.stop >= 0 ? p.slot.stop : nearestStopInChapter(p);
  };
  const openIndex = (i: number) => {
    const p = photos[i];
    if (!p) return;
    if (!inMosaic()) {
      const target = p.slot.stop >= 0 ? p.slot.stop : nearestStopInChapter(p);
      if (Math.abs(cs - target) > 0.6) {
        ts = cs = target;
        csV = 0;
        vel = 0;
        poseAt(cs);
        camera.position.copy(camPos);
        camera.lookAt(camLook);
        camera.updateMatrixWorld();
        layoutPhotos(0);
      }
    }
    ensureTex(p);
    ensureHires(p);
    openLightbox(i);
  };

  const camForward = new Vector3();
  const fitHero = (p: PhotoObj) => {
    const D = 2.2;
    camera.getWorldDirection(camForward);
    const vh = 2 * D * tanHalf();
    const vw = vh * camera.aspect;
    const aspect = p.slot.photo.w / p.slot.photo.h;
    const reserve = width < 760 ? 0.34 : 0.25;
    let h = vh * (1 - reserve);
    let w = h * aspect;
    if (w > vw * 0.9) {
      w = vw * 0.9;
      h = w / aspect;
    }
    lbTo.p.copy(camera.position).addScaledVector(camForward, D);
    const upv = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    lbTo.p.addScaledVector(upv, vh * (width < 760 ? 0.06 : 0.0));
    lbTo.q.copy(camera.quaternion);
    lbTo.s.set(w * 1.006, h * 1.006, 1);
  };
  const openLightbox = (i: number) => {
    const p = photos[i];
    lbIndex = i;
    lbOpen = true;
    lbDir = 1;
    p.mesh.updateMatrixWorld();
    p.mesh.matrixWorld.decompose(lbFrom.p, lbFrom.q, lbFrom.s);
    heroMat.uniforms.uTex.value = p.tex;
    heroMat.uniforms.uHasTex.value = p.tex ? 1 : 0;
    heroMat.uniforms.uReveal.value = 1;
    lbFade = 1;
    hero.visible = true;
    p.mesh.visible = false;
    ui.openDialog(p.slot);
    ui.showHint(null);
    canvas.style.cursor = 'zoom-out';
    o.onLightbox?.(true);
  };
  const closeLightbox = () => {
    if (!lbOpen) return;
    const p = photos[lbIndex];
    p.mesh.updateMatrixWorld();
    p.mesh.matrixWorld.decompose(lbFrom.p, lbFrom.q, lbFrom.s);
    lbOpen = false;
    lbDir = -1;
    ui.closeDialog(lbIndex);
    o.onLightbox?.(false);
  };
  const stepLightbox = (dir: number) => {
    if (!lbOpen) return;
    const n = clamp(lbIndex + dir, 0, photos.length - 1);
    if (n === lbIndex) return;
    lbSwap = n;
  };

  /* ───────── entrada ───────── */
  const WHEEL_K = 0.0022; // ≈ 450 px de rueda por parada
  const onWheel = (e: WheelEvent) => {
    if (!started) return;
    e.preventDefault();
    if (lbOpen) return;
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? height : 1;
    const dy = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
    ts = clamp(ts + clamp(dy, -200, 200) * WHEEL_K, 0, nStops);
    lastInput = performance.now();
    focusIndex = -1;
  };
  let touchY = 0;
  let touchX = 0;
  let touchMoved = 0;
  let touchV = 0;
  let touchT = 0;
  const onTouchStart = (e: TouchEvent) => {
    sound.gesture();
    if (!started || lbOpen) return;
    touchY = e.touches[0].clientY;
    touchX = e.touches[0].clientX;
    touchMoved = 0;
    touchV = 0;
    touchT = performance.now();
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!started || lbOpen) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = touchY - y + (touchX - x) * 0.6;
    touchMoved += Math.abs(touchY - y) + Math.abs(touchX - x);
    touchY = y;
    touchX = x;
    const now = performance.now();
    touchV = dy / Math.max(now - touchT, 1);
    touchT = now;
    ts = clamp(ts + dy / (height * 0.55), 0, nStops);
    lastInput = now;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!started || lbOpen) return;
    if (touchMoved > 10) {
      // swipe con snap: un empujón rápido pasa a la siguiente foto
      const bias = clamp(touchV * 0.9, -0.6, 0.6);
      ts = clamp(Math.round(ts + bias), 0, nStops);
      lastInput = 0;
      return;
    }
    const t = e.changedTouches[0];
    handleTap(t.clientX, t.clientY);
  };
  const handleTap = (x: number, y: number) => {
    const hit = pick(x, y);
    if (hit < 0) return;
    const p = photos[hit];
    if (!inMosaic() && p.slot.stop >= 0 && Math.abs(cs - p.slot.stop) > 0.4) {
      ts = p.slot.stop; // una foto lejana: viajar hasta ella
      return;
    }
    openIndex(hit);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    pointer.set(e.clientX / width, e.clientY / height);
    hasPointer = true;
    pointerDirty = true;
    if (started && !lbOpen) ui.setAFVisible(true);
  };
  const onPointerLeave = () => {
    hasPointer = false;
    ui.setAFVisible(false);
  };
  let downAt = { x: 0, y: 0 };
  const onPointerDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY };
    sound.gesture();
  };
  const onClick = (e: MouseEvent) => {
    if (!started || e.button !== 0) return;
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    if (lbOpen) {
      closeLightbox();
      return;
    }
    handleTap(e.clientX, e.clientY);
  };
  const stepTo = (dir: number) => {
    ts = clamp(Math.round(ts) + dir, 0, nStops);
    lastInput = 0;
  };
  const onKey = (e: KeyboardEvent) => {
    sound.gesture();
    if (!started || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (lbOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLightbox(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLightbox(-1);
      }
      return;
    }
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    const onControl = !!a && /^(BUTTON|A|SUMMARY)$/.test(a.tagName) && !ui.isPhotoButton(a);
    let handled = true;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        stepTo(1);
        break;
      case 'ArrowUp':
      case 'PageUp':
        stepTo(-1);
        break;
      case ' ':
        if (onControl || ui.isPhotoButton(a)) handled = false;
        else stepTo(e.shiftKey ? -1 : 1);
        break;
      case 'Home':
        ts = 0;
        break;
      case 'End':
        ts = nStops;
        break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        const cur = focusIndex >= 0 ? focusIndex : activeSlot();
        const n = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, photos.length - 1);
        ui.focusPhotoButton(n);
        focusPhoto(n);
        break;
      }
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      if (!/Arrow(Left|Right)/.test(e.key)) focusIndex = -1;
    }
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!ui.isPhotoButton(e.relatedTarget as Element | null)) {
      focusIndex = -1;
      ui.showHint(null);
    }
  };
  const activeSlot = () => (inMosaic() ? 0 : stops[clamp(Math.round(cs), 0, nStops - 1)].slot);

  const pick = (x: number, y: number) => {
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const targets = photos.filter((p) => p.mesh.visible && p.mesh.material.uniforms.uReveal.value * p.mesh.material.uniforms.uFade.value > 0.6).map((p) => p.mesh);
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? (hit.object.userData.index as number) : -1;
  };

  const onResize = () => {
    width = root.clientWidth || innerWidth;
    height = root.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 58 : 46;
    camera.updateProjectionMatrix();
    const s = renderer.getDrawingBufferSize(new Vector2());
    postMat.uniforms.uRes.value.set(s.x, s.y);
    for (const p of photos) if (p.points) p.points.material.uniforms.uViewportH.value = s.y;
    if (dust) dust.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    makeRT();
    computeSegs();
    placeTitles();
    street?.setViewport(s.y, renderer.getPixelRatio());
    if (lbOpen && lbIndex >= 0) fitHero(photos[lbIndex]);
  };
  let visible = !document.hidden;
  const onVisibility = () => {
    visible = !document.hidden;
    if (visible && !raf && !disposed) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  const onContextLost = (e: Event) => {
    e.preventDefault();
    fallback('context-lost');
  };

  let street: Street | null = null;
  let roomRect: Rect | null = null;
  const prevHtmlOverflow = document.documentElement.style.overflow;
  const listen = () => {
    addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('click', onClick);
    addEventListener('keydown', onKey);
    ui.el.addEventListener('focusout', onFocusOut);
  };
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  onResize();

  /* ───────── la calle: se construye a partir del recorrido real de la cámara ───────── */
  try {
    const path: Vector3[] = [];
    for (let s = 0; s <= nStops + 1e-6; s += 0.04) {
      poseAt(s);
      path.push(camPos.clone());
    }
    const rects: Rect[] = [];
    const circles: Circle[] = [];
    const segs: Seg[] = [];
    const P: Pose = { p: new Vector3(), l: new Vector3() };
    for (const z of zones) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      const grow = (x: number, zz: number, r: number) => {
        x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, zz - r); z1 = Math.max(z1, zz + r);
      };
      for (const sl of slots) if (sl.chapter === z.index) {
        grow(sl.pos.x, sl.pos.z, Math.max(sl.width, sl.height) / 2 + 0.6);
        circles.push({ c: new Vector2(sl.pos.x, sl.pos.z), r: sl.width / 2 + 0.8 });
      }
      for (let k = z.firstStop; k <= z.lastStop; k++) {
        stopPose(k, P);
        grow(P.p.x, P.p.z, 1.2);
        const sl = slots[stops[k].slot];
        segs.push({ a: new Vector2(P.p.x, P.p.z), b: new Vector2(sl.pos.x, sl.pos.z), r: 1.1 });
      }
      if (z.preset === 'room') {
        roomRect = { x0: z.anchor.x - 5.05, x1: z.anchor.x + 5.05, z0: z.anchor.z - 6.55, z1: z.anchor.z + 4.25 };
        grow(z.anchor.x, z.anchor.z - 1.2, 6.2);
      }
      if (z.center) grow(z.center.x, z.center.z, 7.6);
      rects.push({ x0: x0 - 0.8, x1: x1 + 0.8, z0: z0 - 0.8, z1: z1 + 0.8 });
    }
    finalPose(P);
    rects.push({ x0: finalAnchor.x - gridW / 2 - 1, x1: finalAnchor.x + gridW / 2 + 1, z0: finalAnchor.z - 1, z1: P.p.z + 1.5 });
    if (roomRect) {
      const rr = roomRect as Rect;
      uRoom.value.set(rr.x0, rr.z0, rr.x1, rr.z1);
    }
    street = buildStreet({ path, rects, circles, segs, room: roomRect, high, mobile, shared, pixelRatio: renderer.getPixelRatio(), lamps: lampU.lamps, lampCols: lampU.lampCols });
    scene.add(street.group);
    street.setViewport(renderer.getDrawingBufferSize(new Vector2()).y, renderer.getPixelRatio());
  } catch (e) {
    console.warn('[viaje] calle no disponible', e);
  }
  let rainK = 0;
  const mirrorM = new Matrix4().makeTranslation(0, FLOOR_Y, 0).multiply(new Matrix4().makeScale(1, -1, 1)).multiply(new Matrix4().makeTranslation(0, -FLOOR_Y, 0));

  /* ───────── calidad y vigilancia de fps ───────── */
  let quality = 2;
  let fpsFrames = 0;
  let fpsTime = 0;
  let guardFrom = 0;
  const degrade = () => {
    quality--;
    usePost = false;
    postMat.uniforms.uFx.value = 0;
    if (dust) dust.visible = false;
    street?.setLowQuality();
    for (const p of photos) if (p.refl) {
      p.refl.visible = false;
      p.refl = null;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    onResize();
  };
  const fallback = (reason: string) => {
    if (disposed) return;
    try {
      sessionStorage.setItem('gl-off', '1');
    } catch {
      /* sin almacenamiento */
    }
    api.destroy();
    o.onFallback?.(reason);
    window.dispatchEvent(new CustomEvent('viaje:fallback', { detail: reason }));
  };

  /* ───────── colocación de fotos (estación ↔ hoja de contactos) ───────── */
  let mosaic = 0;
  const qTilt = new Quaternion();
  const layoutPhotos = (dt: number) => {
    const restSlot = restW > 0 && cs <= nStops - 1 ? stops[clamp(Math.round(cs), 0, nStops - 1)].slot : -1;
    const px = hasPointer ? pointerS.x - 0.5 : 0;
    const py = hasPointer ? pointerS.y - 0.5 : 0;
    photos.forEach((p, i) => {
      const mi = mosaic > 0 ? smoother(clamp(mosaic * 1.6 - (i / N) * 0.6, 0, 1)) : 0;
      const target = (hovered === i || focusIndex === i) && !lbOpen ? 1 : 0;
      p.hover += (target - p.hover) * (1 - Math.exp(-dt * 7));
      if (mi > 0) {
        p.mesh.position.lerpVectors(p.base.p, p.mos.p, mi);
        p.mesh.quaternion.slerpQuaternions(p.base.q, p.mos.q, mi);
        p.mesh.scale.lerpVectors(p.base.s, p.mos.s, mi);
        if (p.hover > 0.001) p.mesh.position.z += p.hover * 0.25;
      } else {
        p.mesh.scale.copy(p.base.s);
        p.mesh.quaternion.copy(p.base.q);
        p.mesh.position.copy(p.base.p);
        const rk = i === restSlot ? smooth(restW) : 0;
        const hv = p.hover * (1 - rk);
        if (hv > 0.001) {
          p.mesh.position.addScaledVector(p.slot.normal, hv * 0.35);
          qTilt.setFromAxisAngle(UP, -px * 0.2 * hv);
          p.mesh.quaternion.multiply(qTilt);
          void py;
        }
        // en reposo, paralela al plano de la cámara: en pantalla es un rectángulo exacto (capa nativa a píxel)
        if (rk > 0) p.mesh.quaternion.slerp(camera.quaternion, rk);
      }
    });
  };

  /* ───────── bucle ───────── */
  const tmpV = new Vector3();
  const tmpS = new Vector3();
  const corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const camFwd = new Vector3();
  let lastLock = -1;

  let frameNo = 0;
  function frame(now: number) {
    raf = 0;
    if (disposed) return;
    if (!visible) return;
    raf = requestAnimationFrame(frame);
    frameNo++;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    uTime.value += dt;

    // snap suave a la parada más cercana cuando se deja de mover la rueda
    if (started && !lbOpen && lastInput && now - lastInput > 170) {
      ts = clamp(Math.round(ts), 0, nStops);
      lastInput = 0;
    }
    const prev = cs;
    // cámara con muelle críticamente amortiguado: arranca suave y frena suave (antes: arranque brusco).
    // Los tramos largos (cambio de capítulo) van más despacio, en proporción a su longitud real.
    {
      const omega = 5.6 * segScale(cs, ts);
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const acc = omega * omega * (ts - cs) - 2 * omega * csV;
        csV += acc * h;
        cs += csV * h;
      }
      if (cs < 0 || cs > nStops) {
        cs = clamp(cs, 0, nStops);
        csV = 0;
      }
      if (Math.abs(ts - cs) < 1e-4 && Math.abs(csV) < 2e-3) {
        cs = ts;
        csV = 0;
      }
    }
    const v = (cs - prev) / Math.max(dt, 1e-4);
    vel += (v - vel) * (1 - Math.exp(-dt * 10));
    const ps = 1 - Math.exp(-dt * 5);
    pointerS.x += (pointer.x - pointerS.x) * ps;
    pointerS.y += (pointer.y - pointerS.y) * ps;
    const px = hasPointer ? pointerS.x - 0.5 : 0;
    const py = hasPointer ? pointerS.y - 0.5 : 0;

    // reposo: la cámara se ha parado en una parada (no en la hoja final)
    const settled =
      started && !lbOpen && lbT === 0 && !lastInput && cs === ts && Math.abs(vel) < 0.02 && cs <= nStops - 1 && introK < 0.001 && focus > 0.999;
    if (settled) {
      if (!restSince) restSince = now;
      restW = Math.min(1, restW + dt / 0.35);
    } else {
      restSince = 0;
      restW = Math.max(0, restW - dt / 0.15);
    }
    const free = 1 - smooth(restW);
    // cámara
    poseAt(cs);
    if (introK > 0.0001) camPos.lerp(camLook, 0.22 * introK); // match-cut: la héroe llena la pantalla detrás de la intro
    camera.position.copy(camPos);
    camera.position.y += Math.sin(uTime.value * 0.6) * 0.012 * free;
    tmpV.copy(camLook);
    camera.lookAt(tmpV);
    // parallax suave con el ratón (respiración de cámara en mano)
    camera.rotateY(-px * 0.05 * free);
    camera.rotateX(-py * 0.035 * free);
    camera.updateMatrixWorld();
    camera.getWorldDirection(camFwd);
    shared.uCam.value.copy(camera.position);
    floor.position.x = camera.position.x;
    floor.position.z = camera.position.z;
    sky.position.copy(camera.position);

    // haz de la linterna: rayo de la cámara al cursor
    ndc.set(pointerS.x * 2 - 1, -(pointerS.y * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    beamDir.lerp(raycaster.ray.direction, 1 - Math.exp(-dt * 8)).normalize();

    // capítulo activo (con histéresis) y tinte
    mosaic = clamp(cs - (nStops - 1), 0, 1);
    const near = Math.round(cs);
    if (near < nStops && Math.abs(cs - near) < 0.35) {
      const cand = stops[near].chapter;
      if (cand !== activeChapter) {
        activeChapter = cand;
        ui.setChapter(cand);
        o.onChapter?.(data.chapters[cand]?.n ?? cand + 1);
        sound.setChapter(cand);
        const t = zones[cand].tint;
        fogTarget.setRGB(BASE_FOG.r + t[0] * 0.028, BASE_FOG.g + t[1] * 0.028, BASE_FOG.b + t[2] * 0.028);
        const m = Math.max(t[0], t[1], t[2], 0.001);
        tintTarget.setRGB(0.55 + 0.45 * (t[0] / m), 0.55 + 0.45 * (t[1] / m), 0.55 + 0.45 * (t[2] / m));
      }
    }
    const ck = 1 - Math.exp(-dt * 1.6);
    fog.lerp(fogTarget, ck);
    tint.lerp(tintTarget, ck);
    renderer.setClearColor(fog, 1);

    // fotos
    layoutPhotos(dt);
    let activeIdx = -1;
    let activeA = 0;
    for (const p of photos) {
      const z = zones[p.slot.chapter];
      const inWindow = mosaic > 0.001 || (cs > z.firstStop - 1.6 && cs < z.lastStop + 1.6) || (!started && p.slot.chapter === 0);
      const u = p.mesh.material.uniforms;
      if (!inWindow) {
        if (p.hiresUrl && !(lbIndex === p.slot.index && (lbOpen || lbT > 0))) dropHires(p);
        p.mesh.visible = false;
        if (p.refl) p.refl.visible = false;
        if (p.stamp) p.stamp.visible = false;
        if (p.spot) p.spot.visible = false;
        p.backs.forEach((b) => (b.visible = false));
        continue;
      }
      ensureTex(p);
      const a = p.slot.stop >= 0 ? 1 - clamp(Math.abs(cs - p.slot.stop), 0, 1) : 0;
      if (a > activeA) {
        activeA = a;
        activeIdx = p.slot.index;
      }
      if (p.slot.stop >= 0 && Math.abs(cs - p.slot.stop) < 1.3) ensureHires(p);
      else if (p.hiresUrl && !(lbIndex === p.slot.index && (lbOpen || lbT > 0)) && p.slot.stop >= 0 && Math.abs(cs - p.slot.stop) > 3) dropHires(p);
      // calidad por tamaño real en pantalla (carrusel, satélites, fotos que no son la parada actual): si la foto
      // ocupa más píxeles que su textura, se carga la versión justa; antes se quedaban en la de 480 px
      if (p.mesh.visible && (frameNo + p.slot.index) % 12 === 0) {
        const px = screenPx(p);
        const have = p.hiresW || 480;
        if (px > have * 1.1) ensureHires(p, px * 1.15);
        else if (p.hiresUrl && p.slot.stop < 0 && px < have * 0.35 && !(lbIndex === p.slot.index && (lbOpen || lbT > 0))) dropHires(p);
      }
      const isHeroSrc = (lbOpen || lbT > 0) && lbIndex === p.slot.index;
      p.mesh.visible = !isHeroSrc;

      // aparición: la héroe de cada estación se condensa desde una nube de puntos; el resto aparece suave
      if (p.tex) {
        if (p.slot.role === 'hero') {
          if (p.revealT < 0) {
            const instant = !started || Math.abs(vel) > 6 || mosaic > 0.01;
            if (instant) p.revealT = REVEAL_TIME;
            else if (Math.abs(cs - p.slot.stop) < 1.15) {
              p.revealT = 0;
              makePoints(p);
            }
          }
          if (p.revealT >= 0 && p.revealT < REVEAL_TIME) {
            p.revealT = Math.min(p.revealT + dt, REVEAL_TIME);
            const pr = p.revealT / REVEAL_TIME;
            if (p.points) p.points.material.uniforms.uProgress.value = pr;
            u.uReveal.value = clamp((pr - 0.55) / 0.45, 0, 1);
            if (pr >= 1 && p.points) {
              p.mesh.remove(p.points);
              p.points.material.dispose();
              p.points = null;
            }
          } else if (p.revealT >= REVEAL_TIME) u.uReveal.value = 1;
        } else {
          p.fadeIn = Math.min(p.fadeIn + dt / FADE_TIME, 1);
          u.uReveal.value = smooth(p.fadeIn);
        }
      }
      // revelado químico del plano «sin revelar» al llegar
      if (p.develop < 1 && (a > 0.7 || mosaic > 0.3) && started) {
        p.develop = Math.min(p.develop + dt / 1.9, 1);
        u.uDevelop.value = p.develop;
      }

      // luminancia: la foto activa tal cual; el resto ≤ 35 %; en la hoja final todas a pleno
      const hov = p.hover;
      const lum = Math.max(0.33 + 0.67 * Math.pow(a, 1.6), 0.33 + 0.37 * hov, 0.33 + 0.67 * mosaic);
      u.uLum.value = lbOpen && lbIndex !== p.slot.index ? lum : lum;
      u.uHero.value = Math.max(a, mosaic);
      // planos que la cámara atraviesa (capas de la calle, carrusel): se funden al acercarse
      tmpV.copy(p.mesh.position).sub(camera.position);
      const along = tmpV.dot(camFwd);
      u.uFade.value = smooth(clamp((along - 0.35) / 1.1, 0, 1));
      // filo del marco: la linterna (cursor/AF) lo enciende
      tmpV.normalize();
      const inBeam = clamp((tmpV.dot(beamDir) - 0.94) / 0.06, 0, 1);
      u.uGlow.value = Math.max(hov, inBeam * 0.6, a * 0.25);
      // recuerdo: desenfocado mientras no es la foto activa; nítido (intacto) al llegar
      u.uSoft.value = high && !lbOpen ? clamp(1 - Math.max(a * 1.15, hov, mosaic * 3), 0, 1) * 0.9 : 0;
      if (p.refl || p.stamp) p.mesh.updateMatrix();
      if (p.refl) {
        const k = u.uReveal.value * u.uFade.value * u.uLum.value * (1 - mosaic);
        p.refl.visible = p.mesh.visible && k > 0.01;
        if (p.refl.visible) {
          p.refl.matrix.multiplyMatrices(mirrorM, p.mesh.matrix);
          p.refl.matrixWorldNeedsUpdate = true;
          p.refl.material.uniforms.uK.value = k;
        }
      }
      if (p.stamp) {
        const o2 = u.uReveal.value * u.uFade.value * (0.25 + 0.75 * Math.pow(a, 2)) * (1 - mosaic) * (lbOpen ? 0 : 1);
        p.stamp.visible = p.mesh.visible && o2 > 0.01;
        if (p.stamp.visible) {
          const sx = p.mesh.scale.x, sy = p.mesh.scale.y;
          const sh = Math.min(0.15, sy * 0.07);
          const sw = sh * (512 / 112);
          tmpV.set(0.5 - sw / (2 * sx), -0.5 - (sh * 0.5 + 0.05) / sy, 0).applyMatrix4(p.mesh.matrix);
          p.stamp.matrix.compose(tmpV, p.mesh.quaternion, tmpS.set(sw, sh, 1));
          p.stamp.matrixWorldNeedsUpdate = true;
          p.stamp.material.uniforms.uO.value = o2;
        }
      }
      const lightI = u.uReveal.value * u.uFade.value * (1 - mosaic) * (0.3 + 0.9 * a + 0.4 * hov + 0.3 * inBeam);
      if (p.spot) {
        p.spot.visible = lightI > 0.01;
        p.spot.material.uniforms.uI.value = lightI;
      }
      for (const b of p.backs) {
        b.visible = lightI > 0.01;
        b.material.uniforms.uI.value = lightI * (0.8 + 0.2 * Math.sin(uTime.value * 1.3 + p.slot.index));
      }
    }
    // decorados: solo cerca de su capítulo
    for (const d of decor) {
      const z = zones[d.userData.chapter as number];
      d.visible = mosaic < 0.95 && cs > z.firstStop - 1.8 && cs < z.lastStop + 1.8;
    }
    if (street) {
      const rr = roomRect as Rect | null;
      const inside = !!rr && camera.position.x > rr.x0 - 0.5 && camera.position.x < rr.x1 + 0.5 && camera.position.z > rr.z0 - 0.5 && camera.position.z < rr.z1 + 0.5;
      rainK += ((inside ? 0 : 1) - rainK) * (1 - Math.exp(-dt * 1.5));
      street.update(camera.position, rainK * (1 - mosaic * 0.7));
    }
    for (const pq of plaques) {
      const z = zones[pq.chapter];
      const vis = mosaic < 0.9 && cs > z.firstStop - 2.2 && cs < z.firstStop + 1.5;
      pq.plate.visible = pq.pole.visible = vis;
      if (vis) {
        tmpV.copy(pq.plate.position).sub(camera.position).normalize();
        pq.plate.material.uniforms.uI.value = 0.55 + 0.45 * clamp((tmpV.dot(beamDir) - 0.9) / 0.1, 0, 1);
      }
    }
    for (const w of windowLights) {
      const z = zones[w.chapter];
      const near1 = 1 - clamp(Math.abs(cs - z.firstStop) - 0.2, 0, 1);
      w.win.uniforms.uI.value = 0.32 + 0.22 * near1;
      w.shaft.uniforms.uI.value = 0.6 + 0.5 * near1;
    }
    // títulos 3D: una sola línea de tiempo por título, derivada de la posición (sin reinicios)
    for (const t of titles) {
      const z = zones[t.chapter];
      const target = started && !lbOpen && mosaic < 0.5 ? 1 - clamp((Math.abs(cs - z.firstStop) - 0.1) / 0.75, 0, 1) : 0;
      t.prog += (target - t.prog) * (1 - Math.exp(-dt * (target > t.prog ? 2.4 : 4)));
      t.mesh.visible = t.prog > 0.003;
      t.mesh.material.uniforms.uProg.value = t.prog;
    }
    loader.reprioritize((url) => {
      const p = photos.find((q) => q.slot.photo.srcSmall === url || q.slot.photo.src === url);
      return p ? zoneDist(p, ts) * 10 + p.slot.index * 0.01 : 999;
    });

    // HUD y cursor AF
    if (started && !lbOpen) {
      // se recalcula en cada fotograma: si la cámara se mueve, lo que hay bajo el cursor cambia aunque el ratón esté quieto
      if (hasPointer) {
        pointerDirty = false;
        hovered = pick(pointer.x * width, pointer.y * height);
      } else hovered = -1;
      // sin foto bajo el cursor, el AF se engancha solo a la foto en la que está la cámara
      const autoLock = focusIndex < 0 && hovered < 0 && activeIdx >= 0 && activeA > 0.92 && mosaic < 0.01;
      const lockIndex = focusIndex >= 0 ? focusIndex : hovered >= 0 ? hovered : autoLock ? activeIdx : -1;
      let focusDist: number | null = null;
      const metaIdx = lockIndex >= 0 ? lockIndex : activeIdx;
      ui.setMeta('');
      let rect: { x: number; y: number; w: number; h: number } | null = null;
      if (lockIndex >= 0 && photos[lockIndex].mesh.visible) {
        const p = photos[lockIndex];
        // el recuadro AF va justo sobre el borde EXTERIOR del marco (esquinas del plano), a cualquier tamaño
        corners[0].set(-0.5, -0.5, 0);
        corners[1].set(0.5, -0.5, 0);
        corners[2].set(-0.5, 0.5, 0);
        corners[3].set(0.5, 0.5, 0);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        let behind = false;
        p.mesh.updateMatrixWorld();
        for (const c of corners) {
          c.applyMatrix4(p.mesh.matrixWorld).project(camera);
          if (c.z > 1 || c.z < -1) behind = true;
          const sx = (c.x * 0.5 + 0.5) * width;
          const sy = (-c.y * 0.5 + 0.5) * height;
          x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
        }
        // solo si la foto está de verdad en pantalla (al menos la mitad): nunca un marco colgado en el vacío
        const visW = Math.max(0, Math.min(x1, width) - Math.max(x0, 0));
        const visH = Math.max(0, Math.min(y1, height) - Math.max(y0, 0));
        if (!behind && visW * visH > 0.5 * (x1 - x0) * (y1 - y0)) rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      if (rect) {
        const p = photos[lockIndex];
        const n = String(lockIndex + 1).padStart(3, '0');
        const fresh = ui.afLock(rect, `AF · ${n}`, lockIndex);
        if (fresh && lockIndex !== lastLock) sound.af();
        lastLock = lockIndex;
        focusDist = p.mesh.position.distanceTo(camera.position);
        ui.setAFVisible(true);
        if (focusIndex >= 0) {
          ui.showHint(`${data.lang === 'en' ? 'Photo' : 'Foto'} ${n}/${String(photos.length).padStart(3, '0')} · ${data.lang === 'en' ? 'Enter to open' : 'Enter para abrir'}`);
        }
        // si el AF se ha enganchado solo (ratón fuera de la foto), el cursor normal sigue a la vista
        canvas.style.cursor = hovered === lockIndex ? 'none' : '';
      } else {
        lastLock = -1;
        ui.afFree(pointer.x * width, pointer.y * height);
        ui.setAFVisible(hasPointer);
        canvas.style.cursor = hasPointer ? 'none' : '';
        if (activeIdx >= 0 && activeA > 0.9) focusDist = photos[activeIdx].mesh.position.distanceTo(camera.position);
      }
      ui.tickAF(dt);
      ui.setFocusDistance(focusDist);
      ui.setCounter(metaIdx >= 0 ? metaIdx : 0);
      ui.setProgress(cs / nStops);
      ui.setCue(cs < 0.15 && !lbOpen);
      const z = zones[Math.max(activeChapter, 0)];
      ui.setChapterVisible(mosaic < 0.3 && Math.abs(cs - z.firstStop) < 0.55);
      ui.setEnd(cs > nStops - 0.18);
    }

    // lightbox
    if (lbSwap != null && lbOpen) {
      lbFade = Math.max(lbFade - dt / 0.16, 0);
      heroMat.uniforms.uReveal.value = lbFade;
      if (lbFade <= 0) {
        const n = lbSwap;
        lbSwap = null;
        photos[lbIndex].mesh.visible = true;
        const p = photos[n];
        lbIndex = n;
        if (!inMosaic() && p.slot.stop >= 0) {
          ts = cs = p.slot.stop;
          csV = 0;
        }
        ensureTex(p);
        ensureHires(p);
        heroMat.uniforms.uTex.value = p.tex;
        heroMat.uniforms.uHasTex.value = p.tex ? 1 : 0;
        p.mesh.visible = false;
        ui.updateDialog(p.slot);
        lbFade = 0.0001;
      }
    } else if (lbOpen && lbFade < 1) {
      lbFade = Math.min(lbFade + dt / 0.22, 1);
      heroMat.uniforms.uReveal.value = lbFade;
    }
    if (lbDir !== 0) {
      lbT = clamp(lbT + (lbDir * dt) / 0.7, 0, 1);
      if (lbT === 1 && lbDir > 0) lbDir = 0;
      if (lbT === 0 && lbDir < 0) {
        lbDir = 0;
        hero.visible = false;
        if (lbIndex >= 0) photos[lbIndex].mesh.visible = true;
        canvas.style.cursor = '';
      }
    }
    if (hero.visible && lbIndex >= 0) {
      const p = photos[lbIndex];
      if (!heroMat.uniforms.uHasTex.value && p.tex) {
        heroMat.uniforms.uTex.value = p.tex;
        heroMat.uniforms.uHasTex.value = 1;
      }
      fitHero(p);
      if (lbDir < 0) {
        p.mesh.updateMatrixWorld();
        p.mesh.matrixWorld.decompose(lbFrom.p, lbFrom.q, lbFrom.s);
      }
      const e = ease(lbT);
      hero.position.lerpVectors(lbFrom.p, lbTo.p, e);
      hero.quaternion.slerpQuaternions(lbFrom.q, lbTo.q, e);
      hero.scale.lerpVectors(lbFrom.s, lbTo.s, e);
      heroMat.uniforms.uMargin.value.set(0.003 + (FRAME / lbFrom.s.x) * (1 - e), 0.003 + (FRAME / lbFrom.s.y) * (1 - e));
    }
    const dim = ease(lbT) * (lbDir < 0 && lbT < 0.15 ? lbT / 0.15 : 1);
    postMat.uniforms.uDim.value = dim;

    // capa nativa: la foto real del navegador, encajada a píxel, en reposo y en el lightbox
    {
      let mesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;
      let photo: PhotoObj | null = null;
      let show = false;
      if (hero.visible && lbIndex >= 0) {
        photo = photos[lbIndex];
        mesh = hero;
        show = lbOpen && lbT >= 1 && lbDir === 0 && lbSwap == null && lbFade >= 1;
      } else if (started && mosaic < 0.001 && cs <= nStops - 1) {
        const k = clamp(Math.round(cs), 0, nStops - 1);
        if (Math.abs(cs - k) < 0.5) {
          photo = photos[stops[k].slot];
          mesh = photo.mesh;
          const u = mesh.material.uniforms;
          show = restW >= 0.999 && mesh.visible && u.uReveal.value >= 1 && u.uFade.value >= 0.999 && photo.develop >= 1 && u.uSoft.value < 0.002;
        }
      }
      let q: Quad | null = null;
      if (mesh && photo) {
        const mx = mesh.material.uniforms.uMargin.value as Vector2;
        mesh.updateMatrixWorld();
        const qx: Quad['x'] = [0, 0, 0, 0];
        const qy: Quad['y'] = [0, 0, 0, 0];
        const lc: [number, number][] = [
          [-0.5 + mx.x, 0.5 - mx.y],
          [0.5 - mx.x, 0.5 - mx.y],
          [0.5 - mx.x, -0.5 + mx.y],
          [-0.5 + mx.x, -0.5 + mx.y],
        ];
        let behind = false;
        lc.forEach(([lx, ly], i) => {
          tmpV.set(lx, ly, 0).applyMatrix4(mesh!.matrixWorld).project(camera);
          if (tmpV.z > 1 || tmpV.z < -1) behind = true;
          qx[i] = (tmpV.x * 0.5 + 0.5) * width;
          qy[i] = (-tmpV.y * 0.5 + 0.5) * height;
        });
        if (!behind) q = { x: qx, y: qy };
        // se prepara (descarga y decodifica) antes de llegar, con su ancho real en pantalla
        if (q) native.set(photo.slot.photo, Math.max(...qx) - Math.min(...qx));
      }
      native.update(q, show, dt);
    }

    if (dust) dust.material.uniforms.uCam.value.copy(camera.position);

    // post
    postMat.uniforms.uVel.value = clamp(vel / 3.5, -1, 1) * (usePost ? 1 : 0);
    postMat.uniforms.uPointer.value.set(pointerS.x, 1 - pointerS.y);
    postMat.uniforms.uSweep.value = segSweep * (usePost ? 0.9 : 0.6);
    postMat.uniforms.uSweepPos.value = segSweepPos;
    const blur = Math.max(1 - focus, usePost ? dim * 0.3 : 0);
    postMat.uniforms.uBlur.value = blur;
    postMat.uniforms.uDark.value = 1 - focus;

    // render
    loader.tick();
    const needRT = usePost || blur > 0.002 || segSweep > 0.01;
    if (needRT && rt) {
      renderer.setRenderTarget(rt);
      renderer.setClearColor(fog, 1);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, camera);
      if (!usePost && dim > 0.001) {
        renderer.autoClear = false;
        renderer.render(dimScene, camera);
        renderer.autoClear = true;
      }
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      if (dim > 0.001) {
        renderer.autoClear = false;
        renderer.render(dimScene, camera);
        renderer.autoClear = true;
      }
    }
    if (hero.visible) {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(heroScene, camera);
      renderer.autoClear = true;
    }

    // vigilancia de fps (tras 3 s del inicio, con la pestaña visible)
    if (started && !window.__VIAJE_NO_FPS_GUARD && now > guardFrom) {
      fpsFrames++;
      fpsTime += dt;
      if (fpsTime >= 2) {
        const fps = fpsFrames / fpsTime;
        fpsFrames = 0;
        fpsTime = 0;
        if (fps < 40) {
          if (quality > 1) {
            degrade();
            guardFrom = now + 1500;
          } else {
            console.warn(`[viaje] ${fps.toFixed(0)} fps: paso a la historia 2D`);
            fallback('low-fps');
          }
        }
      }
    }
  }
  raf = requestAnimationFrame(frame);
  void buildTitles();
  // gancho solo para pruebas automáticas (capturas): salta a una posición sin animar
  if (window.__VIAJE_NO_FPS_GUARD) {
    (window as unknown as { __viaje: unknown }).__viaje = {
      go: (v: number) => {
        ts = cs = clamp(v, 0, nStops);
        csV = 0;
        vel = 0;
        lastInput = 0;
      },
      stops: nStops,
      open: (i: number) => openIndex(i),
      state: () => ({ restW, cs, ts, csV, vel, lastInput, focus, introK, started, lbOpen, lbT, mosaic }),
      photo: (i: number) => {
        const p = photos[i];
        const u = p.mesh.material.uniforms;
        return { vis: p.mesh.visible, reveal: u.uReveal.value, fade: u.uFade.value, lum: u.uLum.value, soft: u.uSoft.value, hasTex: u.uHasTex.value, revealT: p.revealT, fadeIn: p.fadeIn, role: p.slot.role, stop: p.slot.stop, transparent: p.mesh.material.transparent, ro: p.mesh.renderOrder, texW: p.hiresW || (p.smallTex ? 480 : 0) };
      },
      cam: () => [camera.position.x, camera.position.y, camera.position.z, camLook.x, camLook.y, camLook.z],
      street: () => street?.debug,
      zones: zones.map((z) => [z.firstStop, z.lastStop]),
    };
  }

  /* ───────── API ───────── */
  let focusAnim = 0;
  const api: Experience = {
    start() {
      if (started || disposed) return;
      started = true;
      guardFrom = performance.now() + 3000;
      document.documentElement.style.overflow = 'hidden';
      listen();
      ui.el.style.opacity = '1';
      ui.setChapter(Math.max(activeChapter, 0));
      // termina de enfocar y retrocede: se descubre el cuarto de Arganda alrededor de la foto
      const from = focus;
      const k0 = introK;
      const t0 = performance.now();
      const step = () => {
        const tf = clamp((performance.now() - t0) / 450, 0, 1);
        const tk = clamp((performance.now() - t0 - 120) / 1600, 0, 1);
        focus = from + (1 - from) * ease(tf);
        introK = k0 * (1 - ease(tk));
        if ((tf < 1 || tk < 1) && !disposed) focusAnim = requestAnimationFrame(step);
      };
      focusAnim = requestAnimationFrame(step);
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(focusAnim);
      removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('click', onClick);
      removeEventListener('keydown', onKey);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.documentElement.style.overflow = prevHtmlOverflow;
      loader.dispose();
      sound.destroy();
      street?.dispose();
      for (const pq of plaques) (pq.plate.material.uniforms.uTex.value as Texture)?.dispose();
      for (const p of photos) (p.stamp?.material.uniforms.uTex.value as Texture | undefined)?.dispose();
      const mats = new Set<Material>();
      scene.traverse((obj) => {
        const m = obj as Mesh;
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
      });
      for (const t of titles) (t.mesh.material.uniforms.uTex.value as Texture)?.dispose();
      [heroMat, postMat, dimMat, ...decorMats].forEach((m) => mats.add(m));
      mats.forEach((m) => m.dispose());
      sky.geometry.dispose();
      floor.geometry.dispose();
      dust?.geometry.dispose();
      gridCache.forEach((g) => g.dispose());
      planeGeo.dispose();
      spotGeo.dispose();
      quadGeo.dispose();
      rt?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      native.destroy();
      ui.destroy();
    },
    goToChapter(n: number) {
      const i = data.chapters.findIndex((c) => c.n === n);
      goChapterIndex(i >= 0 ? i : n - 1);
    },
    openPhoto(id: string) {
      const p = photos.find((q) => q.slot.photo.id === id);
      if (p) openIndex(p.slot.index);
    },
    setFocus(amount: number) {
      focus = clamp(amount, 0, 1);
    },
  };
  return api;
}

/** Mezcla aditiva/normal en color sin tocar el alfa del destino (el alfa es la máscara de fotos). */
function keepAlpha(m: ShaderMaterial, additive: boolean) {
  m.blending = CustomBlending;
  m.blendSrc = SrcAlphaFactor;
  m.blendDst = additive ? OneFactor : OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = ZeroFactor;
  m.blendDstAlpha = OneFactor;
}
