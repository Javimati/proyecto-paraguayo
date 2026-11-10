import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const SECTIONS = ['actualidad', 'calle', 'reportaje', 'directo', 'eventos', 'bodas'] as const;

// Un pie de foto o un alt que falte rompe el build: es intencionado.
const series = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/series' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      title_en: z.string().min(1),
      section: z.enum(SECTIONS),
      place: z.string().min(1),
      date: z.coerce.date(),
      summary: z.string().min(1),
      summary_en: z.string().min(1),
      cover: image(),
      order: z.number().int(),
      provisional: z.boolean().default(false),
      photos: z
        .array(
          z.object({
            file: image(),
            caption: z.string().min(10, 'Falta el pie de foto (ES)'),
            caption_en: z.string().min(10, 'Falta el pie de foto (EN)'),
            date: z.coerce.date(),
            place: z.string().min(1),
            /** Entra en la selección de /editores (solo apartados de prensa) */
            featured: z.boolean().default(false),
            /** Sello «Selección» en la mesa: reservado a muy pocas fotos (~6 en total) */
            pick: z.boolean().default(false),
            alt: z.string().min(10, 'Falta el alt (ES): describe lo que se ve'),
            alt_en: z.string().min(10, 'Falta el alt (EN)'),
          }),
        )
        .min(1),
    }),
});

export const collections = { series };
