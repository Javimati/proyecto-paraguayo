export type Lang = 'es' | 'en';

export const PERSON = {
  name: 'Álvaro Rodríguez Valverde',
  shortName: 'Álvaro Rodríguez',
  credit: 'Álvaro Rodríguez',
  email: 'alvadar2@gmail.com',
  phone: '660 458 606',
  phoneIntl: '+34660458606',
  // PDF: déjalos vacíos ('') mientras no existan; los botones de descarga se ocultan solos.
  // Para añadirlos: copia el archivo a public/docs/ y pon aquí su ruta, p. ej. '/docs/portfolio-alvaro-rodriguez.pdf'.
  portfolioPdf: '',
  cvPdf: '',
};

export const ROUTES = {
  home: { es: '/', en: '/en/' },
  editors: { es: '/editores', en: '/en/editors' },
  about: { es: '/sobre', en: '/en/about' },
  series: { es: (slug: string) => `/series/${slug}`, en: (slug: string) => `/en/series/${slug}` },
} as const;

export const T = {
  es: {
    masthead: 'Álvaro Rodríguez Valverde — Fotoperiodismo — Madrid',
    nav: { sheet: 'Hoja de contactos', editors: 'Para editores', about: 'Sobre mí' },
    langName: 'Español',
    otherLang: 'English',
    skip: 'Saltar al contenido',
    roll: 'Rollo',
    frame: 'Fotograma',
    selected: 'Seleccionada',
    openSeries: 'Ver la serie',
    backToSheet: 'Volver a la hoja de contactos',
    nextSeries: 'Siguiente serie',
    photosCount: (n: number) => `${n} fotos`,
    credit: 'FOTO',
    sheetIntro:
      'Hoja de contactos. Cada tira es un reportaje; las marcadas en rojo son las seleccionadas.',
    sheetHelp: 'Flechas para moverte entre fotogramas, Enter para abrir.',
    provisional: 'Provisional: imágenes de muestra generadas hasta tener las fotos de Álvaro.',
    copyEmail: 'Copiar email',
    copied: 'Email copiado',
    downloadPdf: 'Descargar portfolio PDF',
    downloadCv: 'Descargar CV en PDF',
    todo: 'Pendiente',
    notFoundTitle: 'Este negativo se veló',
    notFoundText: 'La página que buscas no existe o ha cambiado de dirección.',
    notFoundBack: 'Volver a la hoja de contactos',
  },
  en: {
    masthead: 'Álvaro Rodríguez Valverde — Photojournalism — Madrid',
    nav: { sheet: 'Contact sheet', editors: 'For editors', about: 'About' },
    langName: 'English',
    otherLang: 'Español',
    skip: 'Skip to content',
    roll: 'Roll',
    frame: 'Frame',
    selected: 'Selected',
    openSeries: 'View the story',
    backToSheet: 'Back to the contact sheet',
    nextSeries: 'Next story',
    photosCount: (n: number) => `${n} photos`,
    credit: 'PHOTO',
    sheetIntro:
      'Contact sheet. Each strip is a story; frames circled in red are the selects.',
    sheetHelp: 'Arrow keys move between frames, Enter opens.',
    provisional: 'Provisional: generated sample images until Álvaro’s photos are in.',
    copyEmail: 'Copy email',
    copied: 'Email copied',
    downloadPdf: 'Download portfolio PDF',
    downloadCv: 'Download CV (PDF)',
    todo: 'Pending',
    notFoundTitle: 'This negative got fogged',
    notFoundText: 'The page you are looking for does not exist or has moved.',
    notFoundBack: 'Back to the contact sheet',
  },
} as const;

/** Fecha de agencia: 14/03/2026 */
export function wireDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Fecha larga para cabeceras: «marzo de 2026» / «March 2026» */
export function monthYear(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Pie de agencia: «MADRID, 14/03/2026 — Texto. (FOTO: Álvaro Rodríguez)» */
export function wireCaption(place: string, date: Date, text: string, lang: Lang): string {
  return `${place.toUpperCase()}, ${wireDate(date)} — ${text} (${T[lang].credit}: ${PERSON.credit})`;
}
