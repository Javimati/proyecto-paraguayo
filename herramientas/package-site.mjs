#!/usr/bin/env node
/**
 * package-site.mjs — empaqueta una web Astro ya construida (dist/) en:
 *   1. preview/   → prototipo para publicar como artefacto de Claude (rutas relativas,
 *                   fuentes incrustadas, menos variantes de imagen, sin router, ≤256 archivos)
 *   2. <nombre>-cloudflare-subida-directa.zip → contenido de dist/ para Cloudflare Pages
 *   3. <nombre>-repositorio.zip              → código fuente para GitHub + Pages con build
 *
 * Uso:
 *   node /home/claude/tools/package-site.mjs <carpeta-web> <nombre> [--dist <carpeta>] [--keep-router] [--out <carpeta>]
 *   node /home/claude/tools/package-site.mjs /home/claude/alvaro-web web1-fotoperiodismo
 *
 * No construye nada: usa el dist/ que ya exista (hazlo antes con `npm run build`).
 * Sin dependencias: solo Node 18+ y los comandos `zip`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// ───────────────────────── argumentos ─────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const bool = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const KEEP_ROUTER = bool('--keep-router');
const distArg = flag('--dist');
const outArg = flag('--out');
const [siteArg, nameArg] = args;
if (!siteArg) {
  console.error('Uso: node package-site.mjs <carpeta-web> <nombre> [--dist dir] [--keep-router] [--out dir]');
  process.exit(1);
}
const SITE = path.resolve(siteArg);
const NAME = nameArg || path.basename(SITE);
const DIST = path.resolve(distArg || path.join(SITE, 'dist'));
const OUT = path.resolve(outArg || path.join('/home/claude/entregables', NAME));
const PREVIEW = path.join(OUT, 'preview');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`No encuentro ${DIST}/index.html. Construye la web antes (npm run build).`);
  process.exit(1);
}

const LIMIT_FILES = 256;
const LIMIT_FILE_BYTES = 20 * 1024 * 1024;
const LIMIT_TOTAL_BYTES = 64 * 1024 * 1024;
const TARGET_MID = 800; // ancho del candidato "medio"
const TARGET_MAX = 1600; // ancho máximo del candidato "grande"

const warnings = [];
const warn = (m) => warnings.push(m);

// ───────────────────────── utilidades ─────────────────────────
function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}
const posix = path.posix;
const exists = (rel) => {
  try {
    return fs.statSync(path.join(PREVIEW, rel)).isFile();
  } catch {
    return false;
  }
};

/** "/series/x#f-02" → archivo real del preview ("series/x/index.html") o null */
function resolveSitePath(urlPath) {
  let clean = urlPath.split('#')[0].split('?')[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  clean = clean.replace(/^\/+/, '');
  const candidates = clean === '' ? ['index.html'] : [clean, `${clean.replace(/\/$/, '')}/index.html`, `${clean.replace(/\/$/, '')}.html`];
  return candidates.find(exists) ?? null;
}

/** ruta relativa desde el directorio de `fromFile` hasta `toFile` (ambas relativas a la raíz) */
function rel(fromFile, toFile) {
  const r = posix.relative(posix.dirname(fromFile), toFile);
  return r.startsWith('.') ? r : `./${r}`;
}

/** reescribe una URL absoluta interna ("/algo") a relativa desde `fromFile`; deja el resto igual */
const missing = new Set();
const referenced = new Set();
function rewriteUrl(url, fromFile) {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
  const target = resolveSitePath(url);
  if (!target) {
    missing.add(url.split('#')[0]);
    return url;
  }
  referenced.add(target);
  return rel(fromFile, target) + hash;
}

function parseSrcset(v) {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [url, d = ''] = s.split(/\s+/);
      const w = /^(\d+)w$/.exec(d);
      return { url, d, w: w ? Number(w[1]) : null };
    });
}
/** deja 2 candidatos: el más cercano a TARGET_MID y el más grande ≤ TARGET_MAX */
function pickTwo(cands) {
  const withW = cands.filter((c) => c.w);
  if (withW.length <= 2) return cands;
  const sorted = [...withW].sort((a, b) => a.w - b.w);
  const mid = sorted.reduce((best, c) => (Math.abs(c.w - TARGET_MID) < Math.abs(best.w - TARGET_MID) ? c : best));
  const capped = sorted.filter((c) => c.w <= TARGET_MAX);
  const big = capped.length ? capped[capped.length - 1] : sorted[0];
  const picked = mid === big ? [mid] : [mid, big].sort((a, b) => a.w - b.w);
  return picked;
}
const fmtSrcset = (cands) => cands.map((c) => (c.d ? `${c.url} ${c.d}` : c.url)).join(', ');

// ───────────────────────── 1. copiar dist → preview ─────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(DIST, PREVIEW, { recursive: true });

// fuera lo que no sirve en el visor
for (const f of walk(PREVIEW)) {
  const b = posix.basename(f);
  if (/^sitemap.*\.xml$/.test(b) || ['robots.txt', '_headers', '_redirects', '_routes.json'].includes(b) || /\.(pdf|zip|map)$/i.test(b)) {
    fs.rmSync(path.join(PREVIEW, f));
  }
}

const files = walk(PREVIEW);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const cssFiles = files.filter((f) => f.endsWith('.css'));
const jsFiles = files.filter((f) => /\.m?js$/.test(f));

// ───────────────────────── 2. CSS: fuentes incrustadas + url() relativas ─────────────────────────
const MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
function processCss(css, fromFile) {
  // dentro de src: quitar formatos de respaldo (woff/ttf) si hay woff2, para no inflar el CSS
  css = css.replace(/src:\s*([^;}]+)/g, (m, list) => {
    if (!/\.woff2/.test(list)) return m;
    const parts = list.split(/,(?![^(]*\))/).map((s) => s.trim());
    const keep = parts.filter((p) => !/url\([^)]*\.(woff|ttf|otf)["']?\)/.test(p) || /\.woff2/.test(p));
    return `src: ${keep.join(', ')}`;
  });
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, url) => {
    if (url.startsWith('data:') || /^[a-z]+:/i.test(url) || url.startsWith('#') || url.startsWith('%23')) return m;
    let target;
    if (url.startsWith('/')) target = resolveSitePath(url);
    else target = posix.normalize(posix.join(posix.dirname(fromFile), url.split('?')[0].split('#')[0]));
    if (!target || !exists(target)) {
      missing.add(url);
      return m;
    }
    const ext = target.split('.').pop().toLowerCase();
    if (MIME[ext]) {
      const b64 = fs.readFileSync(path.join(PREVIEW, target)).toString('base64');
      return `url("data:${MIME[ext]};base64,${b64}")`;
    }
    referenced.add(target);
    return `url("${rel(fromFile, target)}")`;
  });
}
for (const f of cssFiles) {
  const p = path.join(PREVIEW, f);
  fs.writeFileSync(p, processCss(fs.readFileSync(p, 'utf8'), f));
  referenced.add(f);
}

// ───────────────────────── 3. JS: helper de precarga de Vite con base absoluta ─────────────────────────
for (const f of jsFiles) {
  const p = path.join(PREVIEW, f);
  let js = fs.readFileSync(p, 'utf8');
  const before = js;
  // Vite: function(e){return"/"+e}  →  relativa al propio módulo
  js = js.replace(/return\s*"\/"\s*\+\s*([A-Za-z_$][\w$]*)/g, (m, v) => `return new URL("${'../'.repeat(f.split('/').length - 1)}"+${v},import.meta.url).href`);
  if (/["'`]\/_astro\//.test(js)) warn(`${f}: contiene rutas "/_astro/" literales que pueden no resolverse en el preview`);
  if (js !== before) fs.writeFileSync(p, js);
}

// ───────────────────────── 4. HTML ─────────────────────────
const SHIM_HEAD = (lang) => `
<style data-preview>@media (min-width:1024px) and (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}
.preview-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:min(92vw,520px);padding:10px 14px;background:#121110;color:#ecebe6;border:1px solid #d0261d;font:500 13px/1.45 'IBM Plex Mono',ui-monospace,monospace;box-shadow:0 8px 24px rgba(0,0,0,.35)}</style>
<script data-preview>
/* Preview: navegación normal entre archivos (sin router). Transición hoja → serie con View Transitions entre documentos. */
(function(){
  var KEY='preview-vt';
  addEventListener('pagereveal',function(e){
    var id=null;try{id=sessionStorage.getItem(KEY);sessionStorage.removeItem(KEY);}catch(_){}
    if(!id||!e.viewTransition){return;}
    var t=document.querySelector('[data-vt-id="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');
    var img=t&&t.querySelector('img');
    if(!img){return;}
    img.style.viewTransitionName='photo';
    t.classList.add('is-revealed','no-anim');
    e.viewTransition.finished.catch(function(){}).then(function(){img.style.viewTransitionName='';});
  });
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a');
    if(!a){return;}
    if(a.hasAttribute('data-preview-download')){
      e.preventDefault();
      var old=document.querySelector('.preview-toast');if(old){old.remove();}
      var d=document.createElement('p');d.className='preview-toast';d.setAttribute('role','status');
      d.textContent=${JSON.stringify(lang === 'en' ? 'Prototype: this download will work on the published site.' : 'Prototipo: esta descarga funcionará en la web publicada.')};
      document.body.appendChild(d);setTimeout(function(){d.remove();},4000);
      return;
    }
    if(a.hasAttribute('data-frame')){
      try{sessionStorage.setItem(KEY,a.getAttribute('data-vt-id')||'');}catch(_){}
      var img=a.querySelector('img');if(img){img.style.viewTransitionName='photo';}
    }
  },true);
})();
</script>`;
// Los scripts de capa 1 escuchan astro:page-load, que sin router no se dispara: lo emitimos nosotros.
const SHIM_BODY = `<script type="module" data-preview>document.dispatchEvent(new Event('astro:page-load'));</script>`;

let usedRouter = false;
for (const f of htmlFiles) {
  const p = path.join(PREVIEW, f);
  let html = fs.readFileSync(p, 'utf8');
  const lang = (/<html[^>]*\slang="([a-z]{2})/i.exec(html) || [])[1] || 'es';
  const hadRouter = /astro-view-transitions-enabled/.test(html);
  usedRouter ||= hadRouter;

  // enlaces que no aportan nada en el visor
  html = html.replace(/<link[^>]+rel="sitemap"[^>]*>/g, '');
  html = html.replace(/<link[^>]+rel="preload"[^>]+as="font"[^>]*>/g, ''); // la fuente va incrustada en el CSS

  if (!KEEP_ROUTER && hadRouter) {
    html = html.replace(/<meta name="astro-view-transitions-(enabled|fallback)"[^>]*>/g, '');
    html = html.replace(/<script type="module" src="[^"]*ClientRouter[^"]*"><\/script>/g, '');
    html = html.replace(/<script type="module" src="[^"]*\/page\.[^"]*"><\/script>/g, ''); // prefetch
  }

  // <picture>: fuera AVIF/JPG; el <img> se queda con 2 candidatos WebP
  html = html.replace(/<picture([^>]*)>([\s\S]*?)<\/picture>/g, (m, attrs, inner) => {
    const webp = /<source[^>]*srcset="([^"]+)"[^>]*type="image\/webp"[^>]*>|<source[^>]*type="image\/webp"[^>]*srcset="([^"]+)"[^>]*>/.exec(inner);
    let img = /<img\b[^>]*>/.exec(inner)?.[0];
    if (!img) return m;
    if (webp) {
      const cands = pickTwo(parseSrcset(webp[1] || webp[2]));
      img = img.replace(/\ssrcset="[^"]*"/, '').replace(/\ssrc="[^"]*"/, ` src="${cands[cands.length - 1].url}" srcset="${fmtSrcset(cands)}"`);
    }
    return `<picture${attrs}>${img}</picture>`;
  });
  // resto de srcset (img sueltas, source fuera de picture): 2 candidatos
  html = html.replace(/\ssrcset="([^"]+)"/g, (m, v) => ` srcset="${fmtSrcset(pickTwo(parseSrcset(v)))}"`);
  // el src de una <img> con srcset: que sea uno de los candidatos que quedan (no otra variante más)
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const ss = /\ssrcset="([^"]+)"/.exec(tag);
    if (!ss) return tag;
    const c = parseSrcset(ss[1]);
    if (!c.length) return tag;
    const src = /\ssrc="([^"]+)"/.exec(tag)?.[1];
    if (src && c.some((x) => x.url === src)) return tag;
    return tag.replace(/\ssrc="[^"]*"/, ` src="${c[c.length - 1].url}"`);
  });

  // descargas (PDF): aviso en el preview
  html = html.replace(/<a\b([^>]*?)\shref="([^"]+\.pdf)"([^>]*)>/gi, (m, a, href, b) => {
    const rest = `${a}${b}`.replace(/\sdownload(="[^"]*")?/g, '');
    return `<a${rest} href="#descarga" data-preview-download data-href="${href}">`;
  });

  // srcset → relativas
  html = html.replace(/\ssrcset="([^"]+)"/g, (m, v) => ` srcset="${fmtSrcset(parseSrcset(v).map((c) => ({ ...c, url: rewriteUrl(c.url, f) })))}"`);
  // cualquier atributo con una ruta absoluta interna (href, src, data-loupe, data-home, content…)
  html = html.replace(/(\s[\w:.-]+)=("|')(\/(?!\/)[^"']*)\2/g, (m, attr, q, url) => {
    if (/^\s(srcset|data-href)$/.test(attr)) return m;
    return `${attr}=${q}${rewriteUrl(url, f)}${q}`;
  });
  // <style> en línea
  html = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (m, a, css) => `<style${a}>${processCss(css, f)}</style>`);
  // CSS en atributo style="…url(/…)…"
  html = html.replace(/\sstyle="([^"]*url\([^"]*)"/g, (m, css) => ` style="${processCss(css, f)}"`);

  // shims del preview
  if (!KEEP_ROUTER && hadRouter) {
    html = html.replace('</head>', `${SHIM_HEAD(lang)}</head>`);
    html = html.replace(/<\/body>/, `${SHIM_BODY}</body>`);
  } else if (/data-preview-download/.test(html)) {
    html = html.replace('</head>', `${SHIM_HEAD(lang).replace('@media (min-width:1024px) and (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}', '')}</head>`);
  }

  // referencias de módulos y estilos desde el HTML
  for (const m of html.matchAll(/\s(?:src|href)="([^"#?]+)"/g)) {
    if (/^[a-z]+:/i.test(m[1])) continue;
    const t = posix.normalize(posix.join(posix.dirname(f), m[1]));
    if (exists(t)) referenced.add(t);
  }
  fs.writeFileSync(p, html);
  referenced.add(f);
}

// imports entre módulos JS
const seen = new Set();
const queue = jsFiles.filter((f) => referenced.has(f));
while (queue.length) {
  const f = queue.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  const js = fs.readFileSync(path.join(PREVIEW, f), 'utf8');
  for (const m of js.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
    const t = posix.normalize(posix.join(posix.dirname(f), m[1]));
    if (exists(t)) {
      referenced.add(t);
      queue.push(t);
    }
  }
  // chunks nombrados en mapas de dependencias de Vite ("_astro/x.js")
  for (const m of js.matchAll(/["'`](_astro\/[^"'`]+\.(?:js|css))["'`]/g)) {
    if (exists(m[1])) {
      referenced.add(m[1]);
      queue.push(m[1]);
    }
  }
}
// fuentes: ya van incrustadas → no hacen falta como archivo
// favicon y similares en la raíz se mantienen si están referenciados

// ───────────────────────── 5. borrar lo no referenciado ─────────────────────────
let removed = 0;
for (const f of walk(PREVIEW)) {
  if (!referenced.has(f)) {
    fs.rmSync(path.join(PREVIEW, f));
    removed++;
  }
}
// limpiar directorios vacíos
(function prune(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const p = path.join(dir, e.name);
      prune(p);
      if (!fs.readdirSync(p).length) fs.rmdirSync(p);
    }
  }
})(PREVIEW);

// ───────────────────────── 6. comprobar límites del visor ─────────────────────────
const finalFiles = walk(PREVIEW);
let total = 0;
for (const f of finalFiles) {
  const s = fs.statSync(path.join(PREVIEW, f)).size;
  total += s;
  if (s > LIMIT_FILE_BYTES) warn(`${f} pesa ${(s / 1048576).toFixed(1)} MiB (límite 20 MiB por archivo)`);
  if (f.split('/').some((seg) => seg.startsWith('.'))) warn(`${f}: los archivos que empiezan por punto no se publican`);
}
if (finalFiles.length > LIMIT_FILES) warn(`${finalFiles.length} archivos: pasa del límite de ${LIMIT_FILES} por publicación`);
if (total > LIMIT_TOTAL_BYTES) warn(`${(total / 1048576).toFixed(1)} MiB en total: pasa del límite de 64 MiB`);
for (const m of missing) warn(`ruta interna sin archivo en el preview: ${m}`);

// lista de archivos para publish_files
const manifest = finalFiles.map((f) => ({ as: f, path: path.join(PREVIEW, f) }));
fs.writeFileSync(path.join(OUT, 'preview-files.json'), JSON.stringify(manifest, null, 2));

// ───────────────────────── 7. zips para Cloudflare y GitHub ─────────────────────────
const zipDist = path.join(OUT, `${NAME}-cloudflare-subida-directa.zip`);
execFileSync('zip', ['-qr', '-X', zipDist, '.', '-x', '.*'], { cwd: DIST });
const zipRepo = path.join(OUT, `${NAME}-repositorio.zip`);
execFileSync(
  'zip',
  [
    '-qr', '-X', zipRepo, '.',
    '-x', 'node_modules/*', 'dist/*', 'dist-*/*', '.astro/*', '.lighthouseci/*', '.git/*', '*.DS_Store', '.env', '.env.*',
  ],
  { cwd: SITE },
);

// ───────────────────────── informe ─────────────────────────
const mb = (b) => `${(b / 1048576).toFixed(1)} MiB`;
const zipSize = (z) => mb(fs.statSync(z).size);
console.log(`\n${NAME}`);
console.log(`  preview/        ${finalFiles.length} archivos, ${mb(total)} (quitados ${removed} no referenciados)${usedRouter && !KEEP_ROUTER ? ' — sin router, con View Transitions entre documentos' : ''}`);
console.log(`  subida directa  ${zipSize(zipDist)}  ${zipDist}`);
console.log(`  repositorio     ${zipSize(zipRepo)}  ${zipRepo}`);
console.log(`  publish_files   ${path.join(OUT, 'preview-files.json')}`);
if (warnings.length) {
  console.log('\nAvisos:');
  for (const w of warnings) console.log(`  - ${w}`);
} else console.log('\nSin avisos.');
