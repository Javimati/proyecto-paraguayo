import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Cada carpeta de src/content/fotos es un capítulo de la historia.
// Un pie de foto o un alt que falte rompe el build: es intencionado.
const fotos = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/fotos' }),
  schema: ({ image }) =>
    z.object({
      n: z.number().int().min(1),
      kicker: z.string().min(1),
      kicker_en: z.string().min(1),
      title: z.string().min(1),
      title_en: z.string().min(1),
      text: z.string().min(1),
      text_en: z.string().min(1),
      provisional: z.boolean().default(false),
      photos: z
        .array(
          z.object({
            file: image(),
            alt: z.string().min(10, 'Falta el alt (ES): describe lo que se ve'),
            alt_en: z.string().min(10, 'Falta el alt (EN)'),
            caption: z.string().min(10, 'Falta el pie de foto (ES)'),
            caption_en: z.string().min(10, 'Falta el pie de foto (EN)'),
            place: z.string().min(1),
            date: z.coerce.date(),
            /** Entra en la selección de /editores (~15 en total) */
            featured: z.boolean().default(false),
            /** Color dominante (#rrggbb), lo rellena `npm run photos:check` */
            dominant: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#808080'),
          }),
        )
        .min(1),
    }),
});

export const collections = { fotos };
