#!/usr/bin/env node
// npm run photos:check
// Revisa las series: pies y alt (ES/EN), tamaño, metadatos de autor y archivos.
// Extrae la paleta de cada foto a src/data/palettes.json (fondo "mood").
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const SERIES_DIR = path.join(ROOT, 'src/content/series');
const OUT = path.join(ROOT, 'src/data/palettes.json');
const MAX_SIDE = 4000;
const IMG_EXT = /\.(jpe?g|png|webp|avif|tiff?)$/i;

const errors = [];
const warnings = [];
const palettes = {};

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function frontmatter(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${file}: no tiene frontmatter (bloque entre ---)`);
  return YAML.parse(m[1]);
}

/** Paleta de 3 colores: cuantización simple 4 bits/canal sobre una miniatura. */
async function palette(file) {
  const { data, info } = await sharp(file).resize(64, 64, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
    buckets.set(key, b);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const picked = [];
  for (const c of sorted) {
    const col = [c.r / c.n, c.g / c.n, c.b / c.n];
    // descarta colores casi iguales a los ya elegidos
    if (picked.every((p) => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 40)) picked.push(col);
    if (picked.length === 3) break;
  }
  while (picked.length < 3) picked.push(picked[picked.length - 1] ?? [0, 0, 0]);
  const { dominant } = await sharp(file).stats();
  return { dominant: hex(dominant.r, dominant.g, dominant.b), palette: picked.map((c) => hex(...c)) };
}

function authorFromExif(meta) {
  if (!meta.exif) return {};
  try {
    const e = exifReader(meta.exif);
    const img = e.Image ?? e.image ?? {};
    return { artist: img.Artist, copyright: img.Copyright };
  } catch {
    return {};
  }
}

const slugs = (await readdir(SERIES_DIR, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
if (slugs.length === 0) errors.push('No hay ninguna serie en src/content/series/');

let total = 0;
let nPick = 0,
  nFeatured = 0;
for (const slug of slugs) {
  const dir = path.join(SERIES_DIR, slug);
  const mdPath = path.join(dir, 'index.md');
  const rel = path.relative(ROOT, mdPath);
  if (!existsSync(mdPath)) { errors.push(`${slug}: falta index.md`); continue; }
  let fm;
  try { fm = frontmatter(await readFile(mdPath, 'utf8'), rel); } catch (e) { errors.push(e.message); continue; }

  for (const k of ['title', 'title_en', 'section', 'place', 'date', 'summary', 'summary_en', 'cover', 'order']) {
    if (fm[k] === undefined || fm[k] === '') errors.push(`${rel}: falta «${k}»`);
  }
  if (fm.provisional) warnings.push(`${slug}: serie marcada como PROVISIONAL`);
  if (fm.cover && !existsSync(path.join(dir, fm.cover))) errors.push(`${rel}: la portada «${fm.cover}» no existe`);

  const photos = Array.isArray(fm.photos) ? fm.photos : [];
  if (photos.length === 0) errors.push(`${rel}: no tiene fotos (lista «photos»)`);
  const referenced = new Set();

  for (const [i, p] of photos.entries()) {
    const where = `${slug} · foto ${i + 1}${p?.file ? ` (${p.file})` : ''}`;
    if (!p?.file) { errors.push(`${where}: falta «file»`); continue; }
    const abs = path.join(dir, p.file);
    referenced.add(path.normalize(abs));
    for (const k of ['caption', 'caption_en']) if (!p[k]?.trim()) errors.push(`${where}: sin pie de foto (${k})`);
    for (const k of ['alt', 'alt_en']) if (!p[k]?.trim()) errors.push(`${where}: sin texto alternativo (${k})`);
    if (p.alt && /^(foto|imagen|image|photo)\s*\d*$/i.test(p.alt.trim())) errors.push(`${where}: el alt no describe la imagen («${p.alt}»)`);
    if (String(p.caption ?? '').includes('[PROVISIONAL]')) warnings.push(`${where}: pie provisional`);
    if (p.pick) nPick++;
    if (p.featured) nFeatured++;
    if (!existsSync(abs)) { errors.push(`${where}: el archivo no existe`); continue; }

    const meta = await sharp(abs).metadata();
    const side = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (side > MAX_SIDE) warnings.push(`${where}: ${meta.width}×${meta.height} px, más de ${MAX_SIDE} px de lado largo (exporta más pequeña)`);
    const { artist, copyright } = authorFromExif(meta);
    if (!artist) warnings.push(`${where}: sin autor en EXIF (Artist)`);
    if (!copyright) warnings.push(`${where}: sin copyright en EXIF`);
    if (artist && /PROVISIONAL/i.test(artist)) warnings.push(`${where}: imagen de muestra, no es de Álvaro`);

    palettes[`${slug}/${path.basename(p.file)}`] = await palette(abs);
    total++;
  }

  for (const f of await readdir(dir)) {
    if (IMG_EXT.test(f) && !referenced.has(path.normalize(path.join(dir, f)))) {
      warnings.push(`${slug}: «${f}» está en la carpeta pero no aparece en index.md`);
    }
  }
}

// «pick» = sello «Selección» en la mesa (muy pocas); «featured» = /editores (~15)
if (nPick > 8) warnings.push(`Hay ${nPick} fotos con «pick» (sello «Selección»): resérvalo a unas 6 para que signifique algo`);
if (nFeatured < 8 || nFeatured > 20) warnings.push(`Hay ${nFeatured} fotos «featured» para /editores: lo razonable son unas 15`);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(palettes, null, 2) + '\n');

// Agrupa avisos repetidos para que la salida se lea
const provisional = warnings.filter((w) => /pie provisional|imagen de muestra/.test(w));
const rest = warnings.filter((w) => !provisional.includes(w));
console.log(`\nSeries: ${slugs.length} · Fotos revisadas: ${total} · Selección (pick): ${nPick} · Editores (featured): ${nFeatured} · Paletas → ${path.relative(ROOT, OUT)}\n`);
if (rest.length) { console.log(`AVISOS (${rest.length}):`); rest.forEach((w) => console.log('  · ' + w)); }
if (provisional.length) console.log(`\nAVISOS de contenido provisional: ${provisional.length} (pies o imágenes de muestra pendientes de sustituir)`);
if (errors.length) {
  console.log(`\nERRORES (${errors.length}):`); errors.forEach((e) => console.log('  ✗ ' + e));
  console.log('\nCorrige los errores antes de publicar.');
  process.exit(1);
}
console.log('\nSin errores.');
