export type Lang = 'es' | 'en';

export const PERSON = {
  name: 'Álvaro Rodríguez Valverde',
  shortName: 'Álvaro Rodríguez',
  credit: 'Álvaro Rodríguez',
  email: 'alvadar2@gmail.com',
  phone: '660 458 606',
  phoneIntl: '+34660458606',
  // PDF: vacíos ('') mientras no existan; los botones de descarga se ocultan solos.
  // Para añadirlos: copia el archivo a public/docs/ y pon aquí su ruta, p. ej. '/docs/portfolio-directo-alvaro-rodriguez.pdf'.
  portfolioPdf: '',
  cvPdf: '',
};

export const ROUTES = {
  home: { es: '/', en: '/en/' },
  promoters: { es: '/para-promotores/', en: '/en/for-promoters/' },
  about: { es: '/sobre/', en: '/en/about/' },
  event: { es: (slug: string) => `/eventos/${slug}/`, en: (slug: string) => `/en/events/${slug}/` },
} as const;

const KIND = {
  es: { concierto: 'Concierto', festival: 'Festival', fiesta: 'Fiesta', evento: 'Evento', boda: 'Boda' },
  en: { concierto: 'Gig', festival: 'Festival', fiesta: 'Party', evento: 'Event', boda: 'Wedding' },
} as const;
export type Kind = keyof (typeof KIND)['es'];
export const kindLabel = (k: Kind, lang: Lang) => KIND[lang][k];

export const T = {
  es: {
    masthead: 'Álvaro Rodríguez, fotografía de directo',
    nav: { setlist: 'Setlist', promoters: 'Para promotores', about: 'Sobre mí' },
    navShort: { promoters: 'Promotores', about: 'Sobre mí' },
    mastShort: 'Á. Rodríguez — Directo',
    otherLang: 'English',
    skip: 'Saltar al contenido',
    setlistLabel: 'Setlist',
    setlistSub: 'Fotografía de conciertos, festivales, salas y fiestas. Madrid.',
    filmLabel: 'Fotos del show: desliza o usa las flechas',
    encore: 'Info',
    photos: (n: number) => `${n} fotos`,
    placePending: 'Lugar: pendiente',
    datePending: 'Fecha: pendiente',
    mixedPlace: 'Varios lugares',
    mixedDate: 'Varias fechas',
    track: 'Tema',
    backToSetlist: 'Volver al setlist',
    next: 'Siguiente show',
    credit: 'FOTO',
    provisional: 'Provisional: imágenes de muestra generadas hasta tener las fotos de Álvaro.',
    copyEmail: 'Copiar email',
    copied: 'Email copiado',
    downloadPdf: 'Descargar portfolio PDF',
    downloadCv: 'Descargar CV en PDF',
    notFoundTitle: 'Se fue la luz',
    notFoundText: 'Aquí no hay ningún show. La página no existe o ha cambiado de dirección.',
    notFoundBack: 'Volver al setlist',
  },
  en: {
    masthead: 'Álvaro Rodríguez, live photography',
    nav: { setlist: 'Setlist', promoters: 'For promoters', about: 'About' },
    navShort: { promoters: 'Promoters', about: 'About' },
    mastShort: 'Á. Rodríguez — Live',
    otherLang: 'Español',
    skip: 'Skip to content',
    setlistLabel: 'Setlist',
    setlistSub: 'Concert, festival, club and party photography. Madrid.',
    filmLabel: 'Photos of the show: swipe or use the arrow keys',
    encore: 'Info',
    photos: (n: number) => `${n} photos`,
    placePending: 'Venue: pending',
    datePending: 'Date: pending',
    mixedPlace: 'Various venues',
    mixedDate: 'Various dates',
    track: 'Track',
    backToSetlist: 'Back to the setlist',
    next: 'Next show',
    credit: 'PHOTO',
    provisional: 'Provisional: generated sample images until Álvaro’s photos are in.',
    copyEmail: 'Copy email',
    copied: 'Email copied',
    downloadPdf: 'Download portfolio PDF',
    downloadCv: 'Download CV (PDF)',
    notFoundTitle: 'The lights went out',
    notFoundText: 'There is no show here. The page does not exist or has moved.',
    notFoundBack: 'Back to the setlist',
  },
} as const;

/** 14/03/2026 */
export function numDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
/** 14.03.26 — como en una entrada */
export function ticketDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${String(d.getUTCFullYear()).slice(2)}`;
}

/** Pie dentro de la página del evento cuando la foto es del mismo sitio y fecha: sin repetir la cabecera. */
export function creditCaption(text: string, lang: Lang): string {
  return `${text} (${T[lang].credit}: ${PERSON.credit})`;
}

/** Pie de crónica: «SALA DE PRUEBA, MADRID, 14/03/2026 — Texto. (FOTO: Álvaro Rodríguez)» */
export function chronicleCaption(
  venue: string | undefined,
  city: string | undefined,
  date: Date | undefined,
  text: string,
  lang: Lang,
): string {
  // Sin fechas visibles (decisión de Álvaro, 10/11/2026)
  void date;
  const head = [venue?.toUpperCase(), city?.toUpperCase()].filter(Boolean).join(', ');
  return head ? `${head} — ${text} (${T[lang].credit}: ${PERSON.credit})` : creditCaption(text, lang);
}
/** Ficha corta de un evento («Sala, Ciudad · 14.03.26») con «pendiente» donde falte el dato. */
export function fichaParts(d: { venue?: string; city?: string; date?: Date; mixed?: boolean }, lang: Lang) {
  const t = T[lang];
  const place = d.mixed ? t.mixedPlace : [d.venue, d.city].filter(Boolean).join(', ') || t.placePending;
  const date = ''; // sin fechas visibles (decisión de Álvaro)
  return { place, date };
}
