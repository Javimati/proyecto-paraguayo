import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Un pie de foto o un alt que falte rompe el build: es intencionado.
const series = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/series' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      title_en: z.string().min(1),
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
            /** Marca roja en la hoja de contactos: las 1–2 elegidas de cada rollo */
            selected: z.boolean().default(false),
            /** Sale en /editores (≈15 en total) */
            featured: z.boolean().default(false),
            /** Marca decorativa en un descarte (cruz de lápiz blanco) */
            mark: z.enum(['cross']).optional(),
            alt: z.string().min(10, 'Falta el alt (ES): describe lo que se ve'),
            alt_en: z.string().min(10, 'Falta el alt (EN)'),
          }),
        )
        .min(1),
    }),
});

export const collections = { series };
