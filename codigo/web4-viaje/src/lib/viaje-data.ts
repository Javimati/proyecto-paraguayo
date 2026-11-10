import { getCollection, type CollectionEntry } from 'astro:content';
import { foto } from './fotos';
import { T, wireCaption, type Lang } from '../i18n/strings';

export type Chapter = CollectionEntry<'fotos'>;
export type RawPhoto = Chapter['data']['photos'][number];

/** Forma exacta del JSON del contrato (CONTRACT.md) */
export type ViajeData = {
  lang: Lang;
  labels: Record<string, string>;
  chapters: {
    id: string;
    n: number;
    kicker: string;
    title: string;
    text: string;
    photos: {
      id: string;
      src: string;
      srcSmall: string;
      /** todas las versiones nativas (ancho real → URL), la última es el original */
      srcset: string;
      variants: [number, string][];
      original: string;
      w: number;
      h: number;
      alt: string;
      caption: string;
      dominant: string;
    }[];
  }[];
};

export type PhotoView = ViajeData['chapters'][number]['photos'][number] & {
  srcMid: string;
  raw: RawPhoto;
  chapterId: string;
  index: number;
  featured: boolean;
};

export type ChapterView = Omit<ViajeData['chapters'][number], 'photos'> & {
  photos: PhotoView[];
  provisional: boolean;
};

export async function getChapters(): Promise<Chapter[]> {
  const all = await getCollection('fotos');
  return all.sort((a, b) => a.data.n - b.data.n);
}

/** Id estable de capítulo: «la-calle» a partir de «02-la-calle» */
export const chapterSlug = (c: Chapter) => c.id.replace(/^\d+-/, '');

const cache = new Map<string, ChapterView[]>();

/** Capítulos listos para pintar (2D) y para el JSON (3D), con las mismas variantes de imagen. */
export async function getChapterViews(lang: Lang): Promise<ChapterView[]> {
  if (cache.has(lang)) return cache.get(lang)!;
  const chapters = await getChapters();
  const views = await Promise.all(
    chapters.map(async (c) => {
      const id = chapterSlug(c);
      const photos = await Promise.all(
        c.data.photos.map(async (p, i): Promise<PhotoView> => {
          const f = foto(c.id, p.file);
          return {
            id: `${id}-${String(i + 1).padStart(2, '0')}`,
            src: f.src,
            srcMid: f.src,
            srcSmall: f.small,
            srcset: f.srcset,
            variants: f.variants,
            original: f.original,
            w: p.file.width,
            h: p.file.height,
            alt: lang === 'es' ? p.alt : p.alt_en,
            caption: wireCaption(p.place, p.date, lang === 'es' ? p.caption : p.caption_en, lang),
            dominant: p.dominant,
            raw: p,
            chapterId: id,
            index: i,
            featured: p.featured,
          };
        }),
      );
      return {
        id,
        n: c.data.n,
        kicker: lang === 'es' ? c.data.kicker : c.data.kicker_en,
        title: lang === 'es' ? c.data.title : c.data.title_en,
        text: lang === 'es' ? c.data.text : c.data.text_en,
        provisional: c.data.provisional,
        photos,
      };
    }),
  );
  cache.set(lang, views);
  return views;
}

/** JSON del contrato para #viaje-data */
export async function getViajeData(lang: Lang): Promise<ViajeData> {
  const views = await getChapterViews(lang);
  return {
    lang,
    labels: { ...T[lang].labels },
    chapters: views.map((c) => ({
      id: c.id,
      n: c.n,
      kicker: c.kicker,
      title: c.title,
      text: c.text,
      photos: c.photos.map(({ id, src, srcSmall, srcset, variants, original, w, h, alt, caption, dominant }) => ({
        id,
        src,
        srcSmall,
        srcset,
        variants,
        original,
        w,
        h,
        alt,
        caption,
        dominant,
      })),
    })),
  };
}
