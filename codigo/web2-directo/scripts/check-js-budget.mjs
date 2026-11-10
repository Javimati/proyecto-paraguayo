// Presupuesto de JS inicial (gzip) por página y peso de la imagen LCP de la home.
// Uso: npm run build && npm run check:js
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url).pathname;
const JS_LIMIT = 90 * 1024;
const LCP_LIMIT = 250 * 1024;
// La capa WebGL se carga después del LCP con import(): no cuenta.
const EXCLUDE = /three|ogl|webgl/i;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const cache = new Map();
async function gz(file) {
  if (!cache.has(file)) cache.set(file, gzipSync(await readFile(file)).length);
  return cache.get(file);
}

// Sigue imports estáticos (no los import() dinámicos) dentro de los módulos.
async function moduleGraph(entry, seen = new Set()) {
  if (seen.has(entry) || EXCLUDE.test(entry)) return seen;
  seen.add(entry);
  const src = await readFile(entry, 'utf8').catch(() => '');
  const re = /(?:^|[;\n}])\s*import\s*(?:[^'"()]*?from\s*)?["']([^"']+\.js)["']/g;
  for (const m of src.matchAll(re)) {
    const spec = m[1];
    const p = spec.startsWith('/') ? join(DIST, spec) : join(entry, '..', spec);
    await moduleGraph(p, seen);
  }
  return seen;
}

let failed = false;
const rows = [];
for (const html of await walk(DIST)) {
  const doc = await readFile(html, 'utf8');
  const entries = new Set();
  for (const m of doc.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) entries.add(m[1]);
  for (const m of doc.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) entries.add(m[1]);
  const files = new Set();
  for (const e of entries) {
    if (/^https?:/.test(e)) continue;
    for (const f of await moduleGraph(join(DIST, e))) files.add(f);
  }
  let total = 0;
  for (const f of files) total += await gz(f);
  // Scripts inline
  for (const m of doc.matchAll(/<script(?![^>]*src=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) {
    total += gzipSync(m[1]).length;
  }
  const page = '/' + relative(DIST, html);
  const over = total > JS_LIMIT;
  if (over) failed = true;
  rows.push([page, (total / 1024).toFixed(1) + ' KB', over ? 'FALLA' : 'ok']);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
console.log('\nJS inicial (gzip), límite 90 KB');
for (const r of rows) console.log(`  ${r[2].padEnd(5)} ${r[1].padStart(9)}  ${r[0]}`);

// Imagen LCP de la home: se mide el candidato de srcset/sizes que elegiría el navegador
// en móvil simulado (412 px, DPR 1,75, como Lighthouse) y en escritorio (1440 px, DPR 1).
function slotWidth(sizes, vw) {
  const px = (v) => {
    v = v.trim();
    let m;
    if ((m = v.match(/^min\((.+),(.+)\)$/))) return Math.min(px(m[1]), px(m[2]));
    if ((m = v.match(/^max\((.+),(.+)\)$/))) return Math.max(px(m[1]), px(m[2]));
    if ((m = v.match(/^calc\(([\d.]+)vw\s*([-+])\s*([\d.]+)px\)$/)))
      return (vw * +m[1]) / 100 + (m[2] === '-' ? -1 : 1) * +m[3];
    if ((m = v.match(/^([\d.]+)vw$/))) return (vw * +m[1]) / 100;
    if ((m = v.match(/^([\d.]+)px$/))) return +m[1];
    return vw;
  };
  for (const part of (sizes || '100vw').split(/,(?![^(]*\))/)) {
    const m = part.trim().match(/^(\((?:min|max)-width:\s*\d+px\))?\s*(.+)$/);
    const cond = m[1];
    if (!cond) return px(m[2]);
    const [, kind, n] = cond.match(/(min|max)-width:\s*(\d+)px/);
    if ((kind === 'min' && vw >= +n) || (kind === 'max' && vw <= +n)) return px(m[2]);
  }
  return vw;
}
function pick(srcset, need) {
  const cands = srcset
    .split(',')
    .map((c) => c.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w) || 0 }))
    .sort((a, b) => a.w - b.w);
  return cands.find((c) => c.w >= need) ?? cands.at(-1);
}

const home = await readFile(join(DIST, 'index.html'), 'utf8');
const lcpIdx = home.search(/<img[^>]*fetchpriority="high"/);
if (lcpIdx >= 0) {
  const img = home.slice(lcpIdx).match(/<img[^>]*>/)[0];
  // Si está dentro de <picture>, el navegador usa el primer <source> compatible (AVIF).
  const picStart = home.lastIndexOf('<picture', lcpIdx);
  const picEnd = home.lastIndexOf('</picture>', lcpIdx);
  const source =
    picStart > picEnd ? home.slice(picStart, lcpIdx).match(/<source[^>]*srcset="([^"]+)"/)?.[1] : null;
  const srcset = source ?? img.match(/\ssrcset="([^"]+)"/)?.[1];
  const sizes = img.match(/\ssizes="([^"]+)"/)?.[1];
  const scenarios = [
    ['móvil', 412, 1.75],
    ['escritorio', 1440, 1],
  ];
  for (const [name, vw, dpr] of scenarios) {
    const url = srcset ? pick(srcset, slotWidth(sizes, vw) * dpr).url : img.match(/\ssrc="([^"]+)"/)[1];
    if (/^https?:/.test(url)) continue;
    const size = (await stat(join(DIST, decodeURI(url.split('?')[0])))).size;
    const over = size > LCP_LIMIT;
    if (over) failed = true;
    console.log(
      `\nImagen LCP de la home (${name}): ${(size / 1024).toFixed(1)} KB (límite 250 KB) ${over ? 'FALLA' : 'ok'}  ${url}`,
    );
  }
} else {
  console.log('\nAviso: la home no tiene ninguna <img fetchpriority="high">.');
}

if (failed) {
  console.error('\nPresupuesto superado.');
  process.exit(1);
}
console.log('\nPresupuestos de JS e imagen: ok');
