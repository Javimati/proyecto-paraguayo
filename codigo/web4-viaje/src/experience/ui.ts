import type { ViajeData } from './types';
import type { Slot } from './layout';

/** Capa DOM de la experiencia: HUD de visor, recuadro AF, capítulos, texto del capítulo, cierre, lista accesible y lightbox. */

const DEFAULTS = {
  es: {
    chapters: 'Capítulos',
    chapter: 'Capítulo',
    photo: 'Foto',
    of: 'de',
    open: 'Enter para abrir',
    scroll: 'Desplázate para viajar',
    close: 'Cerrar',
    next: 'Siguiente',
    prev: 'Anterior',
    dialog: 'Foto ampliada',
    photos: 'Fotos del capítulo',
    focus: 'Foco',
    sound: 'Sonido',
    on: 'sí',
    off: 'no',
    endTitle: 'Fin del carrete',
    endLead: 'Busco prácticas desde el 16/02/2027 (440 h). Me adapto al horario que me asignéis.',
    copy: 'Copiar',
    copied: 'Copiado',
    about: 'Sobre mí',
    aboutHref: '/sobre/',
    index: 'Ver sin animación',
    phoneLabel: 'Teléfono',
    emailLabel: 'Email',
    endRegion: 'Contacto',
  },
  en: {
    chapters: 'Chapters',
    chapter: 'Chapter',
    photo: 'Photo',
    of: 'of',
    open: 'Enter to open',
    scroll: 'Scroll to travel',
    close: 'Close',
    next: 'Next',
    prev: 'Previous',
    dialog: 'Enlarged photo',
    photos: 'Chapter photos',
    focus: 'Focus',
    sound: 'Sound',
    on: 'on',
    off: 'off',
    endTitle: 'End of the roll',
    endLead: 'Looking for an internship from 16/02/2027 (440 h). Any schedule you assign works for me.',
    copy: 'Copy',
    copied: 'Copied',
    about: 'About',
    aboutHref: '/en/about/',
    index: 'View without animation',
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    endRegion: 'Contact',
  },
};

const EMAIL = 'alvadar2@gmail.com';
const PHONE = '660 458 606';
const PHONE_HREF = 'tel:+34660458606';

const CSS = /* css */ `
.vx-ui{position:fixed;inset:0;z-index:20;pointer-events:none;color:var(--vx-fg);
  --vx-fg:var(--texto,#ebe8e0);--vx-meta:var(--tenue,#9ea2ab);
  --vx-accent:var(--peaking,#ffe14d);
  --vx-mono:var(--f-mono,'Martian',ui-monospace,monospace);
  --vx-display:var(--f-display,'Bricolage',ui-sans-serif,sans-serif);
  --vx-m:clamp(12px,2.2vw,28px);
  font-family:var(--vx-mono);font-size:11px;letter-spacing:.06em;-webkit-font-smoothing:antialiased}
.vx-ui *{box-sizing:border-box}
.vx-ui button{font:inherit;color:inherit;letter-spacing:inherit;background:none;border:0;padding:0;cursor:pointer}
.vx-ui a{color:inherit}
.vx-ui :focus-visible{outline:2px solid var(--vx-accent);outline-offset:3px}
.vx-sr{position:absolute!important;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;padding:0}
.vx-frame{position:absolute;inset:var(--vx-m);pointer-events:none}
.vx-snd{display:none!important}
.vx-frame i{position:absolute;width:22px;height:22px;border-color:color-mix(in srgb,var(--vx-fg) 55%,transparent);border-style:solid;border-width:0}
.vx-frame i:nth-child(1){left:0;top:0;border-left-width:1px;border-top-width:1px}
.vx-frame i:nth-child(2){right:0;top:0;border-right-width:1px;border-top-width:1px}
.vx-frame i:nth-child(3){left:0;bottom:0;border-left-width:1px;border-bottom-width:1px}
.vx-frame i:nth-child(4){right:0;bottom:0;border-right-width:1px;border-bottom-width:1px}
.vx-hud{position:absolute;display:flex;gap:18px;align-items:center;color:var(--vx-meta);text-transform:uppercase;white-space:nowrap}
.vx-hud b{color:var(--vx-fg);font-weight:500}
.vx-hud--bl{left:calc(var(--vx-m) + 34px);bottom:var(--vx-m)}
.vx-hud--br{right:calc(var(--vx-m) + 34px);bottom:var(--vx-m)}
.vx-hud--tr{right:calc(var(--vx-m) + 34px);top:calc(var(--vx-m) + 52px)}
.vx-meta{transition:opacity .3s}
.vx-snd{pointer-events:auto;min-height:24px;padding:2px 0!important;color:var(--vx-meta)!important;text-transform:uppercase}
.vx-snd[aria-pressed="true"]{color:var(--vx-accent)!important}
.vx-progress{position:absolute;left:var(--vx-m);right:var(--vx-m);bottom:calc(var(--vx-m) - 8px);height:1px;background:color-mix(in srgb,var(--vx-fg) 14%,transparent)}
.vx-progress span{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--vx-accent)}
/* capítulos: número siempre visible; etiqueta del activo siempre visible */
.vx-nav{position:absolute;right:clamp(14px,2.4vw,32px);top:50%;transform:translateY(-50%);pointer-events:auto}
.vx-nav ol{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.vx-nav button{display:flex;align-items:center;gap:10px;justify-content:flex-end;min-height:26px;padding:2px 0;color:var(--vx-meta);opacity:.62;transition:opacity .25s,color .25s;text-shadow:0 1px 6px rgba(0,0,0,.9)}
.vx-nav button:hover,.vx-nav button:focus-visible{opacity:1}
.vx-nav .vx-nav-l{text-transform:uppercase}
.vx-nav .vx-nav-n{min-width:2ch;text-align:right}
.vx-nav button::after{content:'';width:14px;height:1px;background:currentColor;transition:width .3s,background .3s}
.vx-nav button[aria-current="step"]{color:var(--vx-fg);opacity:1}
.vx-nav button[aria-current="step"]::after{width:30px;background:var(--vx-accent)}
/* texto del capítulo (el título grande vive en 3D, detrás de la foto héroe) */
.vx-chap{position:absolute;left:clamp(20px,5vw,80px);bottom:clamp(58px,10vh,110px);max-width:min(40ch,36vw);pointer-events:none;opacity:0;transition:opacity .45s ease}
.vx-chap.is-on{opacity:1}
.vx-chap-k{display:block;color:var(--vx-accent);text-transform:uppercase;margin-bottom:10px}
.vx-chap-h{font-family:var(--vx-display);font-weight:700;font-size:clamp(22px,2.2vw,30px);line-height:1.05;letter-spacing:-.02em;margin:0 0 10px;color:var(--vx-fg)}
.vx-chap-t{font-family:var(--vx-display);font-size:17px;line-height:1.5;letter-spacing:0;margin:0;color:color-mix(in srgb,var(--vx-fg) 78%,transparent);text-wrap:pretty}
.vx-chap-bg{position:absolute;left:-60px;right:-80px;top:-50px;bottom:-40px;background:radial-gradient(closest-side,rgba(6,7,10,.72),rgba(6,7,10,0));z-index:-1}
/* recuadro de enfoque AF */
.vx-af{position:absolute;left:0;top:0;width:60px;height:60px;pointer-events:none;will-change:transform,width,height;opacity:0;transition:opacity .25s}
.vx-af.is-on{opacity:1}
.vx-af i{position:absolute;width:12px;height:12px;border:0 solid var(--vx-fg);transition:border-color .2s,width .25s,height .25s}
.vx-af i:nth-child(1){left:0;top:0;border-left-width:1.5px;border-top-width:1.5px}
.vx-af i:nth-child(2){right:0;top:0;border-right-width:1.5px;border-top-width:1.5px}
.vx-af i:nth-child(3){left:0;bottom:0;border-left-width:1.5px;border-bottom-width:1.5px}
.vx-af i:nth-child(4){right:0;bottom:0;border-right-width:1.5px;border-bottom-width:1.5px}
.vx-af b{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:var(--vx-fg);transition:opacity .2s}
.vx-af.is-lock i{border-color:var(--vx-accent);width:18px;height:18px}
.vx-af.is-lock b{opacity:0}
.vx-af.is-confirm{animation:vx-confirm .32s steps(1,end) 1}
@keyframes vx-confirm{0%{opacity:1}35%{opacity:.25}70%{opacity:1}}
.vx-af-label{position:absolute;right:0;bottom:calc(100% + 8px);white-space:nowrap;color:var(--vx-accent);text-transform:uppercase;opacity:0;transition:opacity .2s;background:rgba(6,7,10,.6);padding:3px 6px}
.vx-af.is-lock .vx-af-label{opacity:1}
.vx-af.is-below .vx-af-label{bottom:auto;top:calc(100% + 8px)}
.vx-hint{position:absolute;left:50%;bottom:calc(var(--vx-m) + 26px);transform:translateX(-50%);padding:8px 12px;background:color-mix(in srgb,#000 70%,transparent);color:var(--vx-fg);text-transform:uppercase;opacity:0;transition:opacity .25s;white-space:nowrap}
.vx-hint.is-on{opacity:1}
.vx-scrollcue{position:absolute;left:50%;bottom:calc(var(--vx-m) + 22px);transform:translateX(-50%);color:var(--vx-meta);text-transform:uppercase;transition:opacity .6s}
.vx-scrollcue::after{content:'';display:block;width:1px;height:28px;margin:10px auto 0;background:linear-gradient(var(--vx-fg),transparent);animation:vx-cue 1.8s cubic-bezier(.65,0,.35,1) infinite}
@keyframes vx-cue{0%{transform:scaleY(0);transform-origin:0 0}45%{transform:scaleY(1);transform-origin:0 0}55%{transform:scaleY(1);transform-origin:0 100%}100%{transform:scaleY(0);transform-origin:0 100%}}
.vx-list{position:absolute;left:0;top:0;pointer-events:auto}
.vx-list button{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* cierre */
.vx-end{position:absolute;left:0;right:0;bottom:0;padding:clamp(18px,3vh,36px) clamp(20px,5vw,80px) calc(var(--vx-m) + 22px);display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px 48px;align-items:end;background:linear-gradient(to top,rgba(6,7,10,.94) 55%,rgba(6,7,10,0));opacity:0;visibility:hidden;transform:translateY(16px);transition:opacity .5s,transform .6s cubic-bezier(.16,1,.3,1),visibility 0s .6s}
.vx-end.is-on{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition:opacity .5s,transform .6s cubic-bezier(.16,1,.3,1),visibility 0s}
.vx-end h2{font-family:var(--vx-display);font-weight:700;font-size:clamp(30px,4vw,60px);line-height:.95;letter-spacing:-.03em;margin:0 0 12px;color:var(--vx-fg)}
.vx-end p{font-family:var(--vx-display);font-size:17px;line-height:1.5;letter-spacing:0;margin:0;color:color-mix(in srgb,var(--vx-fg) 82%,transparent);max-width:46ch}
.vx-end dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:8px 16px;align-items:center;font-size:12px}
.vx-end dt{color:var(--vx-meta);text-transform:uppercase}
.vx-end dd{margin:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--vx-fg);font-size:14px;letter-spacing:.02em}
.vx-end .vx-btn{min-height:44px;padding:0 16px;border:1px solid color-mix(in srgb,var(--vx-fg) 32%,transparent);text-transform:uppercase;display:inline-flex;align-items:center;text-decoration:none;font-size:11px}
.vx-end .vx-btn:hover{border-color:var(--vx-accent);color:var(--vx-accent)}
.vx-end .vx-btn--main{background:var(--vx-accent);color:#0a0b10;border-color:var(--vx-accent)}
.vx-end .vx-btn--main:hover{color:#0a0b10;filter:brightness(1.08)}
.vx-end .vx-copy{min-height:32px;padding:0 10px!important;border:1px solid color-mix(in srgb,var(--vx-fg) 30%,transparent)!important;font-size:10px!important;text-transform:uppercase}
.vx-end-ctas{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
/* cortinilla de obturador para saltos largos */
.vx-curtain{position:absolute;inset:0;pointer-events:none}
.vx-curtain i{position:absolute;left:0;right:0;height:50.5%;background:#050608;transform:scaleY(0)}
.vx-curtain i:first-child{top:0;transform-origin:50% 0}
.vx-curtain i:last-child{bottom:0;transform-origin:50% 100%}
/* lightbox */
.vx-dialog{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s}
.vx-dialog.is-open{opacity:1;pointer-events:auto}
.vx-dialog-bar{position:absolute;left:clamp(16px,4vw,56px);right:clamp(16px,4vw,56px);bottom:clamp(16px,3vh,32px);display:grid;grid-template-columns:1fr auto;align-items:end;gap:12px 32px}
.vx-cap{font-family:var(--vx-mono);font-size:12px;line-height:1.65;letter-spacing:.02em;max-width:78ch;color:var(--vx-fg)}
.vx-ctrls{display:flex;gap:6px}
.vx-ctrls button{min-width:44px;min-height:44px;padding:0 14px;border:1px solid color-mix(in srgb,var(--vx-fg) 30%,transparent);text-transform:uppercase;background:color-mix(in srgb,#000 55%,transparent)}
.vx-ctrls button:hover{border-color:var(--vx-accent);color:var(--vx-accent)}
.vx-count{position:absolute;right:clamp(16px,4vw,56px);top:calc(var(--header-h,56px) + 14px);color:var(--vx-meta);text-transform:uppercase}
.vx-dialog-hit{position:absolute;inset:0;cursor:zoom-out}
.vx-ui.is-lb .vx-hud,.vx-ui.is-lb .vx-nav,.vx-ui.is-lb .vx-af,.vx-ui.is-lb .vx-progress,.vx-ui.is-lb .vx-chap,.vx-ui.is-lb .vx-scrollcue,.vx-ui.is-lb .vx-hint,.vx-ui.is-lb .vx-end{opacity:0!important;visibility:hidden;transition:opacity .25s,visibility 0s .25s}
.vx-ui.is-end .vx-chap,.vx-ui.is-end .vx-scrollcue{opacity:0;transition:opacity .3s}
.vx-hud--br span:first-child{min-width:10ch}
@media (max-width:760px){
  .vx-hud--br span:first-child{display:none}.vx-hud{font-size:10px}
  .vx-hud--bl{left:calc(var(--vx-m) + 4px);bottom:calc(var(--vx-m) + 26px)}
  .vx-hud--br{right:calc(var(--vx-m) + 4px);bottom:calc(var(--vx-m) + 26px)}
  .vx-scrollcue{bottom:calc(var(--vx-m) + 56px)}
  .vx-hud--tr .vx-meta,.vx-nav,.vx-scrollcue{display:none}
  .vx-hud--tr{top:calc(var(--vx-m) + 44px)}
  .vx-dialog-bar{grid-template-columns:1fr}
  .vx-chap{left:20px;right:20px;max-width:none;bottom:calc(var(--vx-m) + 52px)}
  .vx-chap-t{font-size:15px}
  .vx-end{grid-template-columns:1fr;padding-bottom:calc(var(--vx-m) + 40px)}
  .vx-end p{font-size:15px}
}
@media (hover:none){.vx-af{display:none}}
`;

export interface UiCallbacks {
  goChapter(i: number): void;
  focusPhoto(index: number): void;
  activatePhoto(index: number): void;
  close(): void;
  prev(): void;
  next(): void;
  toggleSound(on: boolean): void;
}

export class ExperienceUI {
  el: HTMLDivElement;
  private l: typeof DEFAULTS.es & Record<string, string>;
  private af!: HTMLDivElement;
  private afLabel!: HTMLSpanElement;
  private afPos = { x: -100, y: -100, w: 60, h: 60 };
  private afTarget = { x: -100, y: -100, w: 60, h: 60 };
  private locked = false;
  private navBtns: HTMLButtonElement[] = [];
  private photoBtns: HTMLButtonElement[] = [];
  private chap!: HTMLDivElement;
  private chapK!: HTMLSpanElement;
  private chapH!: HTMLParagraphElement;
  private chapT!: HTMLParagraphElement;
  private chapShown = -1;
  private chapAnims: Animation[] = [];
  private hudChapter!: HTMLElement;
  private hudCount!: HTMLElement;
  private hudMeta!: HTMLElement;
  private hudFocus!: HTMLElement;
  private sndBtn!: HTMLButtonElement;
  private progress!: HTMLSpanElement;
  private hint!: HTMLDivElement;
  private cue!: HTMLDivElement;
  private end!: HTMLElement;
  private endOn = false;
  private curtain!: HTMLDivElement;
  private curtainBusy = false;
  private dialog!: HTMLDivElement;
  private dialogCap!: HTMLParagraphElement;
  private dialogAlt!: HTMLParagraphElement;
  private dialogCount!: HTMLDivElement;
  private dialogClose!: HTMLButtonElement;
  private returnFocus: HTMLElement | null = null;
  private style: HTMLStyleElement | null = null;
  private off: (() => void)[] = [];

  constructor(
    host: HTMLElement,
    private data: ViajeData,
    private slots: Slot[],
    private cb: UiCallbacks,
    soundOn: boolean,
  ) {
    this.l = { ...(DEFAULTS[data.lang] ?? DEFAULTS.es), ...data.labels } as typeof this.l;
    if (!document.getElementById('vx-style')) {
      this.style = document.createElement('style');
      this.style.id = 'vx-style';
      this.style.textContent = CSS;
      document.head.append(this.style);
    }
    this.el = document.createElement('div');
    this.el.className = 'vx-ui';
    this.el.style.pointerEvents = 'none';
    host.append(this.el);
    this.build(soundOn);
  }

  private h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent: HTMLElement = this.el, text = '') {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    parent.append(e);
    return e;
  }

  private build(soundOn: boolean) {
    const l = this.l;
    const frame = this.h('div', 'vx-frame');
    frame.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) this.h('i', '', frame);

    const bl = this.h('div', 'vx-hud vx-hud--bl');
    bl.setAttribute('aria-hidden', 'true');
    this.hudChapter = this.h('span', '', bl);
    const br = this.h('div', 'vx-hud vx-hud--br');
    br.setAttribute('aria-hidden', 'true');
    this.hudFocus = this.h('span', '', br);
    this.hudCount = this.h('span', '', br);
    const tr = this.h('div', 'vx-hud vx-hud--tr');
    this.hudMeta = this.h('span', 'vx-meta', tr);
    this.hudMeta.setAttribute('aria-hidden', 'true');
    this.sndBtn = this.h('button', 'vx-snd', tr) as HTMLButtonElement;
    this.sndBtn.type = 'button';
    this.setSound(soundOn);
    this.sndBtn.addEventListener('click', () => {
      const on = this.sndBtn.getAttribute('aria-pressed') !== 'true';
      this.setSound(on);
      this.cb.toggleSound(on);
    });

    const prog = this.h('div', 'vx-progress');
    prog.setAttribute('aria-hidden', 'true');
    this.progress = this.h('span', '', prog);

    const nav = this.h('nav', 'vx-nav');
    nav.setAttribute('aria-label', l.chapters);
    const ol = this.h('ol', '', nav);
    this.data.chapters.forEach((ch, i) => {
      const li = this.h('li', '', ol);
      const b = this.h('button', '', li) as HTMLButtonElement;
      b.type = 'button';
      b.innerHTML = `<span class="vx-nav-l">${escapeHtml(ch.title)}</span><span class="vx-nav-n">${String(ch.n).padStart(2, '0')}</span>`;
      b.setAttribute('aria-label', `${l.chapter} ${ch.n}: ${ch.title}`);
      b.addEventListener('click', () => this.cb.goChapter(i));
      this.navBtns.push(b);
    });

    const list = this.h('div', 'vx-list');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', l.photos);
    const total = this.slots.length;
    this.slots.forEach((s, i) => {
      const b = this.h('button', '', list) as HTMLButtonElement;
      b.type = 'button';
      b.textContent = `${l.photo} ${i + 1} ${l.of} ${total}. ${s.photo.alt}`;
      b.addEventListener('focus', () => this.cb.focusPhoto(i));
      b.addEventListener('click', () => this.cb.activatePhoto(i));
      this.photoBtns.push(b);
    });

    this.chap = this.h('div', 'vx-chap');
    this.chap.setAttribute('aria-hidden', 'true');
    this.h('div', 'vx-chap-bg', this.chap);
    this.chapK = this.h('span', 'vx-chap-k', this.chap);
    this.chapH = this.h('p', 'vx-chap-h', this.chap);
    this.chapT = this.h('p', 'vx-chap-t', this.chap);

    this.af = this.h('div', 'vx-af');
    this.af.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) this.h('i', '', this.af);
    this.h('b', '', this.af);
    this.afLabel = this.h('span', 'vx-af-label', this.af);

    this.hint = this.h('div', 'vx-hint');
    this.hint.setAttribute('aria-hidden', 'true');
    this.cue = this.h('div', 'vx-scrollcue', this.el, l.scroll);
    this.cue.setAttribute('aria-hidden', 'true');

    // cierre (accesible: es contenido real, no decoración)
    this.end = this.h('section', 'vx-end');
    this.end.setAttribute('aria-label', l.endRegion);
    this.end.setAttribute('inert', '');
    const endA = this.h('div', '', this.end);
    this.h('h2', '', endA, l.endTitle);
    this.h('p', '', endA, l.endLead);
    const dl = this.h('dl', '', this.end);
    this.h('dt', '', dl, l.emailLabel);
    const ddE = this.h('dd', '', dl);
    const mail = this.h('a', '', ddE, EMAIL) as HTMLAnchorElement;
    mail.href = `mailto:${EMAIL}`;
    const copy = this.h('button', 'vx-copy', ddE, l.copy) as HTMLButtonElement;
    copy.type = 'button';
    const live = this.h('span', 'vx-sr', ddE);
    live.setAttribute('aria-live', 'polite');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(EMAIL);
        copy.textContent = l.copied;
        live.textContent = l.copied;
      } catch {
        // sin portapapeles: seleccionar el texto para copiarlo a mano
        const r = document.createRange();
        r.selectNodeContents(mail);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
      setTimeout(() => (copy.textContent = l.copy), 1800);
    });
    this.h('dt', '', dl, l.phoneLabel);
    const ddP = this.h('dd', '', dl);
    const tel = this.h('a', '', ddP, PHONE) as HTMLAnchorElement;
    tel.href = PHONE_HREF;
    const ctas = this.h('div', 'vx-end-ctas', this.end);
    const ab = this.h('a', 'vx-btn vx-btn--main', ctas, l.about) as HTMLAnchorElement;
    ab.href = l.aboutHref;
    const idx = this.h('button', 'vx-btn', ctas, l.index) as HTMLButtonElement;
    idx.type = 'button';
    idx.addEventListener('click', () => {
      const b = document.getElementById('btn-indice') as HTMLButtonElement | null;
      if (b) b.click();
      else window.dispatchEvent(new CustomEvent('viaje:indice'));
    });

    this.curtain = this.h('div', 'vx-curtain');
    this.curtain.setAttribute('aria-hidden', 'true');
    this.h('i', '', this.curtain);
    this.h('i', '', this.curtain);

    this.dialog = this.h('div', 'vx-dialog');
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-label', l.dialog);
    this.dialog.hidden = true;
    const hit = this.h('div', 'vx-dialog-hit', this.dialog);
    hit.addEventListener('click', () => this.cb.close());
    this.dialogCount = this.h('div', 'vx-count', this.dialog);
    this.dialogCount.setAttribute('aria-live', 'polite');
    const bar = this.h('div', 'vx-dialog-bar', this.dialog);
    const capWrap = this.h('div', '', bar);
    this.dialogAlt = this.h('p', 'vx-sr', capWrap);
    this.dialogCap = this.h('p', 'vx-cap', capWrap);
    const ctrls = this.h('div', 'vx-ctrls', bar);
    const prev = this.h('button', '', ctrls, l.prev) as HTMLButtonElement;
    prev.type = 'button';
    prev.addEventListener('click', () => this.cb.prev());
    const next = this.h('button', '', ctrls, l.next) as HTMLButtonElement;
    next.type = 'button';
    next.addEventListener('click', () => this.cb.next());
    this.dialogClose = this.h('button', '', ctrls, l.close) as HTMLButtonElement;
    this.dialogClose.type = 'button';
    this.dialogClose.addEventListener('click', () => this.cb.close());
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || this.dialog.hidden) return;
      const items = [prev, next, this.dialogClose];
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      } else if (i === -1) {
        e.preventDefault();
        items[0].focus();
      }
    };
    this.dialog.addEventListener('keydown', trap);
    this.off.push(() => this.dialog.removeEventListener('keydown', trap));
  }

  setSound(on: boolean) {
    this.sndBtn.setAttribute('aria-pressed', String(on));
    this.sndBtn.textContent = `${this.l.sound}: ${on ? this.l.on : this.l.off}`;
  }

  /* ── HUD ── */
  setChapter(i: number) {
    const ch = this.data.chapters[i];
    if (!ch) return;
    this.hudChapter.innerHTML = `${escapeHtml(this.l.chapter)} <b>${String(ch.n).padStart(2, '0')}</b> / ${escapeHtml(ch.title)}`;
    this.navBtns.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    this.showChapterText(i);
  }
  setCounter(index: number) {
    const t = String(this.slots.length).padStart(3, '0');
    this.hudCount.innerHTML = `<b>${String(index + 1).padStart(3, '0')}</b>/${t}`;
  }
  setMeta(text: string) {
    if (this.hudMeta.textContent !== text) this.hudMeta.textContent = text;
  }
  setFocusDistance(m: number | null) {
    this.hudFocus.textContent = m == null ? `${this.l.focus} ∞` : `${this.l.focus} ${m.toFixed(1)} m`;
  }
  setProgress(f: number) {
    this.progress.style.transform = `scaleX(${Math.min(Math.max(f, 0), 1)})`;
  }
  setCue(visible: boolean) {
    this.cue.style.opacity = visible ? '1' : '0';
  }

  /* ── texto del capítulo: una sola animación (WAAPI) cancelable por cambio ── */
  private showChapterText(i: number) {
    if (i === this.chapShown) return;
    const ch = this.data.chapters[i];
    if (!ch) return;
    this.chapShown = i;
    this.chapAnims.forEach((a) => a.cancel());
    this.chapAnims = [];
    const swap = () => {
      this.chapK.textContent = ch.kicker;
      this.chapH.textContent = ch.title;
      this.chapT.textContent = ch.text;
      const ease = 'cubic-bezier(.16,1,.3,1)';
      this.chapAnims = [
        this.chapK.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, fill: 'both', easing: ease }),
        this.chapH.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 60, fill: 'both', easing: ease }),
        this.chapT.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 750, delay: 140, fill: 'both', easing: ease }),
      ];
    };
    if (this.chapK.textContent === '') {
      swap();
      return;
    }
    const outs = [this.chapK, this.chapH, this.chapT].map((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }));
    this.chapAnims = outs;
    outs[0].onfinish = () => {
      if (this.chapShown === i) swap();
    };
  }
  setChapterVisible(v: boolean) {
    this.chap.classList.toggle('is-on', v);
  }

  /* ── cierre ── */
  setEnd(on: boolean) {
    if (on === this.endOn) return;
    this.endOn = on;
    this.end.classList.toggle('is-on', on);
    this.el.classList.toggle('is-end', on);
    if (on) this.end.removeAttribute('inert');
    else this.end.setAttribute('inert', '');
  }

  /* ── cortinilla: cierra, ejecuta el salto y abre (sin destellos: es negra) ── */
  curtainJump(mid: () => void) {
    if (this.curtainBusy) {
      mid();
      return;
    }
    this.curtainBusy = true;
    const [a, b] = Array.from(this.curtain.children) as HTMLElement[];
    const close = { duration: 150, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' as FillMode };
    const kf = [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }];
    const an = a.animate(kf, close);
    b.animate(kf, close);
    an.onfinish = () => {
      mid();
      requestAnimationFrame(() => {
        const open = { duration: 170, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' as FillMode };
        const kf2 = [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }];
        const o = a.animate(kf2, open);
        b.animate(kf2, open);
        o.onfinish = () => (this.curtainBusy = false);
      });
    };
  }

  /* ── recuadro AF ── */
  setAFVisible(v: boolean) {
    this.af.classList.toggle('is-on', v);
  }
  afFree(x: number, y: number) {
    if (this.locked) {
      this.locked = false;
      this.lockId = -1;
      this.af.classList.remove('is-lock');
    }
    this.afTarget = { x: x - 30, y: y - 30, w: 60, h: 60 };
  }
  /** devuelve true si es un enganche nuevo (para el clic de AF) */
  private lockId = -1;
  afLock(rect: { x: number; y: number; w: number; h: number }, label: string, id = -1) {
    // el rect ya es el borde exterior del marco: las esquinas AF se apoyan en él, sin holgura
    const pad = 0;
    const vw = innerWidth, vh = innerHeight, m = 6;
    const x0 = Math.max(rect.x - pad, m), y0 = Math.max(rect.y - pad, m + 26);
    const x1 = Math.min(rect.x + rect.w + pad, vw - m), y1 = Math.min(rect.y + rect.h + pad, vh - m);
    this.afTarget = { x: x0, y: y0, w: Math.max(x1 - x0, 24), h: Math.max(y1 - y0, 24) };
    // si el marco toca la cabecera, la etiqueta va debajo para no quedar tapada
    this.af.classList.toggle('is-below', y0 < 96);
    let fresh = false;
    // confirma el foco al engancharse y cada vez que cambia de foto
    if (!this.locked || id !== this.lockId) {
      this.locked = true;
      this.lockId = id;
      fresh = true;
      this.af.classList.add('is-lock');
      this.af.classList.remove('is-confirm');
      void this.af.offsetWidth;
      this.af.classList.add('is-confirm');
    }
    if (this.afLabel.textContent !== label) this.afLabel.textContent = label;
    return fresh;
  }
  tickAF(dt: number) {
    // enganchado: sigue a la foto sin retraso (con suavizado quedaba desplazado mientras la cámara se asentaba)
    const k = this.locked ? 1 : 1 - Math.exp(-dt * 22);
    const p = this.afPos;
    const t = this.afTarget;
    p.x += (t.x - p.x) * k;
    p.y += (t.y - p.y) * k;
    p.w += (t.w - p.w) * k;
    p.h += (t.h - p.h) * k;
    this.af.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
    this.af.style.width = `${p.w}px`;
    this.af.style.height = `${p.h}px`;
  }
  showHint(text: string | null) {
    this.hint.textContent = text ?? '';
    this.hint.classList.toggle('is-on', !!text);
  }
  focusPhotoButton(i: number) {
    this.photoBtns[i]?.focus({ preventScroll: true });
  }
  isPhotoButton(el: Element | null) {
    return !!el && this.photoBtns.includes(el as HTMLButtonElement);
  }

  /* ── lightbox ── */
  openDialog(slot: Slot) {
    this.el.classList.add('is-lb');
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.dialog.hidden = false;
    this.updateDialog(slot);
    requestAnimationFrame(() => {
      this.dialog.classList.add('is-open');
      this.dialogClose.focus({ preventScroll: true });
    });
  }
  updateDialog(slot: Slot) {
    this.dialogAlt.textContent = slot.photo.alt;
    // sin pie visible (decisión de Marlon, 11/11/2026): la foto habla sola; el alt sigue para lectores de pantalla
    this.dialogCap.textContent = '';
    this.dialogCount.textContent = `${String(slot.index + 1).padStart(3, '0')} / ${String(this.slots.length).padStart(3, '0')} — ${this.data.chapters[slot.chapter]?.title ?? ''}`;
  }
  closeDialog(focusIndex?: number) {
    this.el.classList.remove('is-lb');
    this.dialog.classList.remove('is-open');
    setTimeout(() => {
      if (!this.dialog.classList.contains('is-open')) this.dialog.hidden = true;
    }, 360);
    const target = focusIndex != null ? this.photoBtns[focusIndex] : this.returnFocus;
    (target ?? this.returnFocus)?.focus?.({ preventScroll: true });
  }
  get dialogOpen() {
    return !this.dialog.hidden;
  }

  destroy() {
    this.off.forEach((f) => f());
    this.chapAnims.forEach((a) => a.cancel());
    this.el.remove();
    this.style?.remove();
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
