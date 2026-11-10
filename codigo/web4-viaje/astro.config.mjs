// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO(dominio): cambiar por el dominio definitivo cuando Álvaro lo compre.
const SITE = process.env.SITE_URL ?? 'https://alvaro-rodriguez-viaje.pages.dev';

export default defineConfig({
  site: SITE,
  output: 'static',
  build: { inlineStylesheets: 'always' },
  trailingSlash: 'always',
  image: { responsiveStyles: false },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en-GB' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
