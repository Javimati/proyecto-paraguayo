// Presupuestos de JS (gzip). Uso: npm run build && npm run check:js
//  - JS inicial de cada página (shell + historia 2D): < 60 KB
//  - Experiencia 3D + intro (import() diferido, solo gama ≥ mid): < 350 KB, medida aparte
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SHELL_LIMIT = 60 * 1024;
const EXP_LIMIT = 350 * 1024;
const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' KB';

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
// Grafo de imports ESTÁTICOS (los import() dinámicos no se siguen)
async function graph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = await readFile(entry, 'utf8').catch(() => '');
  for (const m of src.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^'"()]*?from\s*)?["']([^"']+\.js)["']/g)) {
    const spec = m[1];
    await graph(spec.startsWith('/') ? join(DIST, spec) : join(entry, '..', spec), seen);
  }
  return seen;
}
const sum = async (set) => {
  let n = 0;
  for (const f of set) n += await gz(f);
  return n;
};

let failed = false;
console.log('\nJS inicial por página (gzip), límite 60 KB');
for (const html of (await walk(DIST)).sort()) {
  const src = await readFile(html, 'utf8');
  const files = new Set();
  for (const m of src.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) await graph(join(DIST, m[1]), files);
  let inline = 0;
  for (const m of src.matchAll(/<script(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g))
    inline += gzipSync(m[1]).length;
  const total = (await sum(files)) + inline;
  const ok = total <= SHELL_LIMIT;
  if (!ok) failed = true;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${kb(total)}  /${relative(DIST, html)}`);
}

const ASTRO = join(DIST, '_astro');
const chunks = (await readdir(ASTRO)).filter((f) => f.endsWith('.js'));
const find = (prefix) => chunks.filter((f) => f.startsWith(prefix + '.')).map((f) => join(ASTRO, f));
const expSet = new Set();
for (const f of [...find('experience'), ...find('intro')]) await graph(f, expSet);
const exp = await sum(expSet);
const expOk = exp <= EXP_LIMIT;
if (!expOk) failed = true;
console.log(`\nExperiencia 3D + intro (diferidas), límite 350 KB\n  ${expOk ? 'ok  ' : 'FALLA'} ${kb(exp)}  (${[...expSet].map((f) => relative(ASTRO, f)).join(', ')})`);

console.log(failed ? '\nPresupuestos: FALLAN\n' : '\nPresupuestos: ok\n');
process.exit(failed ? 1 : 0);
