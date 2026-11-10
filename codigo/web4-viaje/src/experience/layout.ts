import { Quaternion, Vector3 } from 'three';
import type { ViajeData, ViajePhoto } from './types';

/**
 * Estaciones: cada capítulo es un decorado propio con una foto héroe y satélites.
 * El recorrido ya no es un pasillo: el scroll salta de PARADA en parada (una por foto principal);
 * en cada parada la cámara mira de frente una foto que llena ~2/3 del encuadre.
 * Las posiciones de cámara se calculan en tiempo real (dependen del aspecto de la ventana).
 */

export type Preset = 'room' | 'layers' | 'wall' | 'stage' | 'carousel' | 'develop' | 'axis';
export type Role = 'hero' | 'sat' | 'thumb';

export interface Slot {
  photo: ViajePhoto;
  chapter: number;
  index: number; // índice global (orden de lectura)
  role: Role;
  stop: number; // índice de parada global (-1 si es una miniatura sin parada)
  pos: Vector3;
  quat: Quaternion;
  normal: Vector3; // hacia donde mira la foto (hacia la cámara que la encuadra)
  width: number;
  height: number;
  /** desplazamiento de la cámara en su parada (p. ej. contrapicado en el escenario) */
  camOffset: Vector3;
  /** color de contraluz (escenario) */
  back: [number, number, number] | null;
}

export interface Stop {
  index: number;
  chapter: number;
  slot: number;
}

export interface ChapterZone {
  index: number;
  preset: Preset;
  firstStop: number;
  lastStop: number;
  anchor: Vector3;
  tint: [number, number, number];
  /** centro del carrusel (solo preset carousel) */
  center: Vector3 | null;
  hero: number; // índice de slot de la foto héroe
}

export interface Layout {
  slots: Slot[];
  stops: Stop[];
  zones: ChapterZone[];
  finalAnchor: Vector3;
  mobile: boolean;
}

const UP = new Vector3(0, 1, 0);

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0.5, 0.5, 0.5];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** color saturado y luminoso a partir del dominante (para haces de luz) */
function vivid(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const mx = Math.max(r, g, b, 0.001);
  const mn = Math.min(r, g, b);
  const sat = mx - mn < 0.08 ? 0 : 1;
  const k = 1 / mx;
  const c: [number, number, number] = [r * k, g * k, b * k];
  // grises → luz cálida de escenario
  if (!sat) return [1, 0.78, 0.5];
  return [0.35 + 0.65 * c[0], 0.35 + 0.65 * c[1], 0.35 + 0.65 * c[2]];
}

const PRESETS: Preset[] = ['room', 'layers', 'wall', 'stage', 'carousel', 'develop'];

function size(p: ViajePhoto, h: number, maxW = Infinity) {
  let height = h;
  let width = h * (p.w / p.h);
  if (width > maxW) {
    width = maxW;
    height = width / (p.w / p.h);
  }
  return { width, height };
}

function quatFromNormal(n: Vector3) {
  // el plano (PlaneGeometry) mira a +Z: rotarlo para que su normal sea n
  return new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n.clone().normalize());
}

export function buildLayout(data: ViajeData, opts: { perChapter: number; thumbs: boolean; mobile: boolean }): Layout {
  const slots: Slot[] = [];
  const stops: Stop[] = [];
  const zones: ChapterZone[] = [];
  const mobile = opts.mobile;

  const add = (s: Omit<Slot, 'index' | 'stop'> & { isStop: boolean }) => {
    const index = slots.length;
    let stop = -1;
    if (s.isStop) {
      stop = stops.length;
      stops.push({ index: stop, chapter: s.chapter, slot: index });
    }
    const { isStop: _x, ...rest } = s;
    void _x;
    slots.push({ ...rest, index, stop });
    return index;
  };

  let anchorZ = 0;
  data.chapters.forEach((ch, ci) => {
    const preset: Preset = mobile ? 'axis' : PRESETS[ci % PRESETS.length];
    const all = ch.photos;
    const main = all.slice(0, Math.max(1, opts.perChapter));
    const extra = opts.thumbs && preset === 'wall' ? all.slice(main.length, main.length + 12) : [];
    const r = rand(ci * 31 + 7);
    const anchor = new Vector3(mobile ? 0 : Math.sin(ci * 1.7) * 10, 0, anchorZ);
    const firstStop = stops.length;
    const tint = main.reduce<[number, number, number]>(
      (acc, p) => {
        const c = hexToRgb(p.dominant);
        return [acc[0] + c[0] / main.length, acc[1] + c[1] / main.length, acc[2] + c[2] / main.length];
      },
      [0, 0, 0],
    );
    let center: Vector3 | null = null;
    let hero = -1;
    const base = { chapter: ci, camOffset: new Vector3(), back: null as Slot['back'] };
    const zFront = new Vector3(0, 0, 1);

    if (preset === 'axis') {
      // móvil: una foto por pantalla, centradas en el eje
      main.forEach((p, j) => {
        const { width, height } = size(p, 2.4, 2.0);
        const pos = anchor.clone().add(new Vector3(0, 0.15, -j * 7.5));
        const i = add({ ...base, photo: p, role: j === 0 ? 'hero' : 'sat', pos, quat: new Quaternion(), normal: zFront.clone(), width, height, isStop: true });
        if (j === 0) hero = i;
      });
      anchorZ -= main.length * 7.5 + 14;
    } else if (preset === 'room') {
      // un cuarto: la héroe en la pared del fondo bajo el haz de la ventana; el resto en las paredes laterales
      main.forEach((p, j) => {
        if (j === 0) {
          const { width, height } = size(p, 2.7, 4.6);
          const pos = anchor.clone().add(new Vector3(0, 0.25, -6.25));
          hero = add({ ...base, photo: p, role: 'hero', pos, quat: new Quaternion(), normal: zFront.clone(), width, height, isStop: true });
        } else {
          const left = j % 2 === 1;
          const n = new Vector3(left ? 1 : -1, 0, 0);
          const { width, height } = size(p, 2.2, 3.4);
          const k = Math.floor((j - 1) / 2);
          const pos = anchor.clone().add(new Vector3(left ? -4.94 : 4.94, 0.2, -3.6 + k * 3.6));
          add({ ...base, photo: p, role: 'sat', pos, quat: quatFromNormal(n), normal: n, width, height, isStop: true });
        }
      });
      anchorZ -= 34;
    } else if (preset === 'layers') {
      // la calle: capas en profundidad que se solapan; la cámara las atraviesa (Alex Webb)
      main.forEach((p, j) => {
        const { width, height } = size(p, 2.3 + r() * 0.4, 3.8);
        const side = j % 2 === 0 ? -1 : 1;
        const pos = anchor.clone().add(new Vector3(side * (0.9 + r() * 1.1), (r() - 0.5) * 0.7, -2 - j * 4.6));
        const yaw = side * (0.05 + r() * 0.08);
        const n = new Vector3(Math.sin(-yaw), 0, Math.cos(yaw)).normalize();
        const i = add({ ...base, photo: p, role: j === 0 ? 'hero' : 'sat', pos, quat: quatFromNormal(n), normal: n, width, height, isStop: true });
        if (j === 0) hero = i;
      });
      anchorZ -= main.length * 4.6 + 22;
    } else if (preset === 'wall') {
      // la noticia: muro de contactos en rejilla; la cámara lo barre en lateral
      const cols = 3;
      const cw = 3.3;
      const chh = 2.3;
      const gap = 0.3;
      const rows = Math.ceil(main.length / cols);
      const gw = cols * cw + (cols - 1) * gap;
      const gh = rows * chh + (rows - 1) * gap;
      const wallZ = -5;
      main.forEach((p, j) => {
        const c = j % cols;
        const rr = Math.floor(j / cols);
        const { width, height } = size(p, chh, cw);
        const pos = anchor.clone().add(new Vector3(-gw / 2 + cw / 2 + c * (cw + gap), gh / 2 - chh / 2 - rr * (chh + gap) + 0.3, wallZ));
        const i = add({ ...base, photo: p, role: j === 0 ? 'hero' : 'sat', pos, quat: new Quaternion(), normal: zFront.clone(), width, height, isStop: true });
        if (j === 0) hero = i;
      });
      // tira de contactos alrededor: miniaturas sin parada (se abren en el lightbox)
      const tw = 1.15;
      const th = 0.8;
      extra.forEach((p, j) => {
        const perRow = Math.max(1, Math.floor((gw + 2 * (tw + gap)) / (tw + 0.12)));
        const row = Math.floor(j / perRow);
        const col = j % perRow;
        const y = row === 0 ? gh / 2 + 0.3 + th / 2 + 0.35 : -gh / 2 + 0.3 - th / 2 - 0.35 - (row - 1) * (th + 0.12);
        const x = -((perRow - 1) * (tw + 0.12)) / 2 + col * (tw + 0.12);
        const { width, height } = size(p, th, tw);
        add({ ...base, photo: p, role: 'thumb', pos: anchor.clone().add(new Vector3(x, y, wallZ + 0.02)), quat: new Quaternion(), normal: zFront.clone(), width, height, isStop: false });
      });
      anchorZ -= 40;
    } else if (preset === 'stage') {
      // el directo: fotos colgadas sobre un escenario, a contraluz con haces del color de cada foto
      const n = main.length;
      main.forEach((p, j) => {
        const { width, height } = size(p, 2.3, 3.6);
        const x = (j - (n - 1) / 2) * 4.3;
        const pos = anchor.clone().add(new Vector3(x, 0.9 + (j % 2) * 0.35, -6 - (j % 2) * 0.8));
        const i = add({
          ...base,
          photo: p,
          role: j === 0 ? 'hero' : 'sat',
          pos,
          quat: new Quaternion(),
          normal: zFront.clone(),
          width,
          height,
          camOffset: new Vector3(0, -0.85, 0),
          back: vivid(p.dominant),
          isStop: true,
        });
        if (j === 0) hero = i;
      });
      anchorZ -= 40;
    } else if (preset === 'carousel') {
      // los eventos: un círculo de fotos alrededor de la cámara que gira con el scroll
      center = anchor.clone().add(new Vector3(0, 0, -7));
      const n = main.length;
      const R = 6.2;
      main.forEach((p, j) => {
        const a = (j / n) * Math.PI * 2; // a = 0 → la foto queda al fondo (−Z), de frente a quien llega
        const pos = center!.clone().add(new Vector3(Math.sin(a) * R, 0.2, -Math.cos(a) * R));
        const nrm = center!.clone().sub(pos).setY(0).normalize();
        const { width, height } = size(p, 2.4, 3.7);
        const i = add({ ...base, photo: p, role: j === 0 ? 'hero' : 'sat', pos, quat: quatFromNormal(nrm), normal: nrm, width, height, isStop: true });
        if (j === 0) hero = i;
      });
      anchorZ -= 38;
    } else {
      // lo que viene: un plano sin revelar que se revela al llegar
      main.forEach((p, j) => {
        if (j === 0) {
          const { width, height } = size(p, 2.9, 4.8);
          hero = add({ ...base, photo: p, role: 'hero', pos: anchor.clone().add(new Vector3(0, 0.25, -5)), quat: new Quaternion(), normal: zFront.clone(), width, height, isStop: true });
        } else {
          const side = j % 2 === 1 ? -1 : 1;
          const n = new Vector3(-side * 0.42, 0, 1).normalize();
          const { width, height } = size(p, 1.9, 3);
          add({ ...base, photo: p, role: 'sat', pos: anchor.clone().add(new Vector3(side * 5.1, 0.1, -3.4 - Math.floor((j - 1) / 2) * 2.6)), quat: quatFromNormal(n), normal: n, width, height, isStop: true });
        }
      });
      anchorZ -= 34;
    }

    zones.push({ index: ci, preset, firstStop, lastStop: stops.length - 1, anchor, tint, center, hero });
  });

  const finalAnchor = new Vector3(0, 0.6, anchorZ - 8);
  void UP;
  return { slots, stops, zones, finalAnchor, mobile };
}
