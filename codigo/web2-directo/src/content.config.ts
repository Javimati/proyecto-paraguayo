import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Un pie de foto o un alt que falte rompe el build: es intencionado.
const eventos = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/eventos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      title_en: z.string().min(1),
      /** Lo que va escrito a rotulador en el setlist: artista, banda o DJ. Si no hay permiso, la sala o el festival. */
      artist: z.string().optional(),
      artist_en: z.string().optional(),
      /** concierto | festival | fiesta | evento | boda (opcional) */
      kind: z.enum(['concierto', 'festival', 'fiesta', 'evento', 'boda']).optional(),
      /** Sala, ciudad y fecha del evento: opcionales. Sin dato se muestra «pendiente»; nunca inventar. */
      venue: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      date: z.coerce.date().optional(),
      /** true en secciones misceláneas («Más trabajos»): cada foto lleva su propio lugar/fecha en el pie. */
      mixed: z.boolean().default(false),
      /** hora del set, opcional: «22:30». Solo si es el dato real. */
      time: z.string().optional(),
      summary: z.string().min(1),
      summary_en: z.string().min(1),
      cover: image(),
      order: z.number().int(),
      provisional: z.boolean().default(false),
      photos: z
        .array(
          z.object({
            file: image(),
            caption: z.string().min(4, 'Falta el pie de foto (ES)'),
            caption_en: z.string().min(4, 'Falta el pie de foto (EN)'),
            selected: z.boolean().default(false),
            alt: z.string().min(4, 'Falta el alt (ES): describe lo que se ve'),
            alt_en: z.string().min(4, 'Falta el alt (EN)'),
            // Si una foto es de otro sitio/fecha que el evento
            venue: z.string().optional(),
            city: z.string().optional(),
            date: z.coerce.date().optional(),
          }),
        )
        .min(1),
    }),
});

export const collections = { eventos };
