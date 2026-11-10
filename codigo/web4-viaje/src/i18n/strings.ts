export type Lang = 'es' | 'en';

export const PERSON = {
  name: 'Álvaro Rodríguez Valverde',
  shortName: 'Álvaro Rodríguez',
  credit: 'Álvaro Rodríguez',
  email: 'alvadar2@gmail.com',
  phone: '660 458 606',
  phoneIntl: '+34660458606',
  instagram: '', // No tiene: no se muestra
  // TODO(pdf): cuando existan, poner las rutas (p. ej. '/docs/portfolio.pdf'). Vacío = el botón no se muestra.
  portfolioPdf: '',
  cvPdf: '',
};

export const ROUTES = {
  home: { es: '/', en: '/en/' },
  editors: { es: '/editores/', en: '/en/editors/' },
  about: { es: '/sobre/', en: '/en/about/' },
  contact: { es: '/contacto/', en: '/en/contact/' },
} as const;

export type PageKey = keyof typeof ROUTES | 'notfound';

export const T = {
  es: {
    locale: 'es-ES',
    skipStory: 'Ver la historia en texto e imágenes',
    skip: 'Saltar al contenido',
    nav: { home: 'Historia', editors: 'Para editores', about: 'Sobre mí', contact: 'Contacto' },
    other: 'English',
    otherShort: 'EN',
    index: 'Índice',
    indexHint: 'Cambiar a la vista 2D',
    viewer: { iso: 'ISO', shots: 'disparos' },
    heroLine: 'Fotorreportaje y eventos.',
    heroSub: 'Madrid',
    scroll: 'Desliza para empezar',
    chapters: 'Capítulos',
    photosN: (n: number) => `${n} fotos`,
    credit: 'FOTO',
    provisional: 'Provisional: imágenes de muestra generadas hasta tener las fotos de Álvaro.',
    closeTitle: 'Busco prácticas desde el 16 de febrero de 2027',
    closeText: '440 horas, con el horario que asigne la empresa. También con empresas que aún no tienen convenio con mi centro.',
    copyEmail: 'Copiar email',
    copied: 'Email copiado',
    copyFail: 'No se pudo copiar: selecciona la dirección',
    call: 'Llamar',
    forEditors: 'Selección para editores',
    downloadPdf: 'Descargar portfolio PDF',
    downloadCv: 'Descargar CV',
    todo: 'TODO',
    labels: {
      index: 'Índice',
      close: 'Cerrar',
      next: 'Siguiente',
      prev: 'Anterior',
      holdToFocus: 'Mantén para enfocar',
      clickToEnter: 'o haz clic para entrar',
      skipIntro: 'Saltar intro',
      loading: 'Cargando',
      chapter: 'Capítulo',
      photo: 'Foto',
      of: 'de',
      sound: 'Sonido',
      soundOn: 'Sonido activado',
      soundOff: 'Sonido desactivado',
      view2d: 'Ver en 2D',
      scrollHint: 'Desliza para avanzar',
      openPhoto: 'Abrir foto',
      shots: 'disparos',
      introDialog: 'Intro: visor de la cámara',
    },
  },
  en: {
    locale: 'en-GB',
    skipStory: 'View the story as text and images',
    skip: 'Skip to content',
    nav: { home: 'Story', editors: 'For editors', about: 'About', contact: 'Contact' },
    other: 'Español',
    otherShort: 'ES',
    index: 'Index',
    indexHint: 'Switch to the 2D view',
    viewer: { iso: 'ISO', shots: 'shots' },
    heroLine: 'Photo reportage and events.',
    heroSub: 'Madrid',
    scroll: 'Scroll to start',
    chapters: 'Chapters',
    photosN: (n: number) => `${n} photos`,
    credit: 'PHOTO',
    provisional: 'Provisional: generated sample images until Álvaro’s photos are in.',
    closeTitle: 'Looking for an internship from 16 February 2027',
    closeText: '440 hours, on whatever schedule the company sets. Companies without an agreement with my school yet are welcome too.',
    copyEmail: 'Copy email',
    copied: 'Email copied',
    copyFail: 'Could not copy: select the address',
    call: 'Call',
    forEditors: 'Selection for editors',
    downloadPdf: 'Download portfolio PDF',
    downloadCv: 'Download CV',
    todo: 'TODO',
    labels: {
      index: 'Index',
      close: 'Close',
      next: 'Next',
      prev: 'Previous',
      holdToFocus: 'Hold to focus',
      clickToEnter: 'or click to enter',
      skipIntro: 'Skip intro',
      loading: 'Loading',
      chapter: 'Chapter',
      photo: 'Photo',
      of: 'of',
      sound: 'Sound',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      view2d: 'View in 2D',
      scrollHint: 'Scroll to move',
      openPhoto: 'Open photo',
      shots: 'shots',
      introDialog: 'Intro: camera viewfinder',
    },
  },
} as const;

export function wireDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Pie de agencia: «MADRID, 14/03/2026 — Texto. (FOTO: Álvaro Rodríguez)» */
export function wireCaption(place: string, date: Date, text: string, lang: Lang): string {
  return `${place.toUpperCase()}, ${wireDate(date)} — ${text} (${T[lang].credit}: ${PERSON.credit})`;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'es' ? 'en' : 'es';
}
