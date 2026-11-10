export type Lang = 'es' | 'en';
export type Section = 'actualidad' | 'calle' | 'reportaje' | 'directo' | 'eventos' | 'bodas';

export const PERSON = {
  name: 'Álvaro Rodríguez Valverde',
  shortName: 'Álvaro Rodríguez',
  credit: 'Álvaro Rodríguez',
  email: 'alvadar2@gmail.com',
  phone: '660 458 606',
  phoneIntl: '+34660458606',
  // PDF: vacíos ('') mientras no existan; los botones de descarga se ocultan solos.
  // Para añadirlos: copia el archivo a public/docs/ y pon aquí su ruta, p. ej. '/docs/portfolio-alvaro-rodriguez.pdf'.
  portfolioPdf: '',
  cvPdf: '',
};

export const SECTION_ORDER: Section[] = ['actualidad', 'calle', 'reportaje', 'directo', 'eventos', 'bodas'];
export const PRESS: Section[] = ['actualidad', 'calle', 'reportaje'];

export const SECTION_NAMES: Record<Lang, Record<Section, string>> = {
  es: { actualidad: 'Actualidad', calle: 'Calle', reportaje: 'Reportaje', directo: 'Directo', eventos: 'Eventos', bodas: 'Bodas' },
  en: { actualidad: 'News', calle: 'Street', reportaje: 'Documentary', directo: 'Live music', eventos: 'Events', bodas: 'Weddings' },
};
/** slug de URL por idioma */
export const SECTION_SLUG: Record<Lang, Record<Section, string>> = {
  es: { actualidad: 'actualidad', calle: 'calle', reportaje: 'reportaje', directo: 'directo', eventos: 'eventos', bodas: 'bodas' },
  en: { actualidad: 'news', calle: 'street', reportaje: 'documentary', directo: 'live', eventos: 'events', bodas: 'weddings' },
};
export const SECTION_BLURB: Record<Lang, Record<Section, string>> = {
  es: {
    actualidad: 'Noticias del día: manifestaciones, actos públicos, sucesos.',
    calle: 'Fotografía de calle: gente, luz y ciudad sin preparar.',
    reportaje: 'Historias contadas en varias imágenes, con tiempo.',
    directo: 'Conciertos y música en directo.',
    eventos: 'Fiestas, actos y eventos privados o de empresa.',
    bodas: 'Bodas, con mirada de reportaje.',
  },
  en: {
    actualidad: 'Daily news: demonstrations, public events, breaking stories.',
    calle: 'Street photography: people, light and the city, unposed.',
    reportaje: 'Stories told over several pictures, with time.',
    directo: 'Concerts and live music.',
    eventos: 'Parties, functions, private and corporate events.',
    bodas: 'Weddings, shot as documentary.',
  },
};

export const ROUTES = {
  home: { es: '/', en: '/en/' },
  // Todas con barra final: coinciden con el canonical, el sitemap y lo que sirve Cloudflare (sin 308).
  editors: { es: '/editores/', en: '/en/editors/' },
  commissions: { es: '/encargos/', en: '/en/commissions/' },
  about: { es: '/sobre/', en: '/en/about/' },
  contact: { es: '/contacto/', en: '/en/contact/' },
  section: {
    es: (s: Section) => `/trabajo/${SECTION_SLUG.es[s]}/`,
    en: (s: Section) => `/en/work/${SECTION_SLUG.en[s]}/`,
  },
  series: { es: (slug: string) => `/series/${slug}/`, en: (slug: string) => `/en/series/${slug}/` },
} as const;

export const T = {
  es: {
    tagline: 'Fotoperiodista en Madrid',
    archive: 'Archivo',
    nav: { table: 'Mesa de luz', editors: 'Para editores', commissions: 'Encargos', about: 'Sobre mí', contact: 'Contacto' },
    otherLang: 'English',
    skip: 'Saltar al contenido',
    all: 'Todo',
    filterLabel: 'Filtrar la mesa por apartado',
    tableHelp: 'Arrastra o usa la rueda para recorrer la mesa. Con teclado: flechas para moverte, Enter para abrir.',
    tableIntro:
      'Archivo de fotografía de Álvaro Rodríguez Valverde. Actualidad, calle y reportaje primero; después directo, eventos y bodas.',
    showing: (n: number, what: string) => `Mostrando ${n} fotos: ${what}`,
    frame: 'Diapositiva',
    featured: 'Selección de prensa',
    backToTable: 'Volver a la mesa de luz',
    nextSeries: 'Siguiente serie',
    seriesIn: (n: number) => (n === 1 ? '1 serie' : `${n} series`),
    photos: (n: number) => `${n} fotos`,
    credit: 'FOTO',
    provisional: 'Provisional: imágenes de muestra generadas hasta tener las fotos de Álvaro.',
    copyEmail: 'Copiar email',
    copied: 'Email copiado',
    downloadPdf: 'Descargar portfolio PDF',
    downloadCv: 'Descargar CV (PDF)',
    sections: 'Apartados',
    notFoundTitle: 'Esta diapositiva no está en el archivo',
    notFoundText: 'La página no existe o ha cambiado de dirección.',
  },
  en: {
    tagline: 'Photojournalist in Madrid',
    archive: 'Archive',
    nav: { table: 'Light table', editors: 'For editors', commissions: 'Commissions', about: 'About', contact: 'Contact' },
    otherLang: 'Español',
    skip: 'Skip to content',
    all: 'All',
    filterLabel: 'Filter the table by section',
    tableHelp: 'Drag or scroll to move around the table. Keyboard: arrow keys to move, Enter to open.',
    tableIntro:
      'Photography archive of Álvaro Rodríguez Valverde. News, street and documentary first; then live music, events and weddings.',
    showing: (n: number, what: string) => `Showing ${n} photos: ${what}`,
    frame: 'Slide',
    featured: 'Press select',
    backToTable: 'Back to the light table',
    nextSeries: 'Next story',
    seriesIn: (n: number) => (n === 1 ? '1 story' : `${n} stories`),
    photos: (n: number) => `${n} photos`,
    credit: 'PHOTO',
    provisional: 'Provisional: generated sample images until Álvaro’s photos are in.',
    copyEmail: 'Copy email',
    copied: 'Email copied',
    downloadPdf: 'Download portfolio PDF',
    downloadCv: 'Download CV (PDF)',
    sections: 'Sections',
    notFoundTitle: 'This slide is not in the archive',
    notFoundText: 'The page does not exist or has moved.',
  },
} as const;

export function wireDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
export function monthYear(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
/** Pie de agencia: «MADRID, 14/03/2026 — Texto. (FOTO: Álvaro Rodríguez)» */
export function wireCaption(place: string, date: Date, text: string, lang: Lang): string {
  return `${place.toUpperCase()}, ${wireDate(date)} — ${text} (${T[lang].credit}: ${PERSON.credit})`;
}
