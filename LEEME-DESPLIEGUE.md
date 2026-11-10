# Cómo publicar las webs en Cloudflare Pages (gratis)

Cada web tiene su carpeta en `entregables/<web>/` con tres cosas:

| Archivo | Para qué sirve |
|---|---|
| `preview/` | El prototipo para verlo dentro de Claude (no se sube a Cloudflare). |
| `<web>-cloudflare-subida-directa.zip` | La web ya construida, lista para arrastrar a Cloudflare. **Opción A.** |
| `<web>-repositorio.zip` | El código fuente, para subirlo a GitHub y que Cloudflare construya la web sola en cada cambio. **Opción B.** |

Las webs son estáticas: no hace falta servidor ni base de datos. Cloudflare Pages es gratis para esto.

---

## Opción A — Subida directa (la más rápida, 5 minutos)

Ideal para ver la web publicada ya. Cada vez que cambie algo hay que volver a subir el zip nuevo.

1. Crea una cuenta gratis en <https://dash.cloudflare.com/sign-up> (o entra si ya la tienes).
2. En el menú de la izquierda, entra en **Workers & Pages**.
3. Pulsa **Create application** → **Get started** en la parte de Pages → **Drag and drop your files**.
4. Escribe un nombre de proyecto (por ejemplo `alvaro-rodriguez`). Será la dirección: `alvaro-rodriguez.pages.dev`.
5. Arrastra el archivo `<web>-cloudflare-subida-directa.zip` a la zona de subida (acepta el zip tal cual, o la carpeta descomprimida).
6. Pulsa **Deploy site**. En un minuto te da la dirección `https://<nombre>.pages.dev`.

Para actualizarla: en el proyecto, **Create deployment** y arrastra el zip nuevo.

Límites de esta opción: 1.000 archivos y 25 MiB por archivo. Las webs actuales están por debajo. Un proyecto creado por subida directa **no se puede pasar luego a GitHub**: si después quieres la opción B, crea otro proyecto.

---

## Opción B — GitHub + Cloudflare (la buena para el día a día)

Cada vez que se cambia algo y se sube a GitHub (`git push`), Cloudflare reconstruye y publica la web solo. También crea previsualizaciones de cada rama.

1. Crea una cuenta en <https://github.com> si no la tienes.
2. Crea un repositorio nuevo, **privado** si quieres (botón **New**). No marques "Add README".
3. Descomprime `<web>-repositorio.zip` en una carpeta de tu ordenador y súbela al repositorio:
   - Sin programar: en la página del repositorio vacío, **uploading an existing file** y arrastra todo el contenido de la carpeta (no la carpeta en sí). Pulsa **Commit changes**.
   - Con terminal: dentro de la carpeta, `git init`, `git add .`, `git commit -m "Primera versión"`, y los dos comandos que te enseña GitHub (`git remote add origin …` y `git push -u origin main`).
4. En Cloudflare: **Workers & Pages** → **Create application** → pestaña **Pages** → **Connect to Git** → autoriza GitHub y elige el repositorio.
5. Configuración del build:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION` = `22` y `SITE_URL` = `https://<nombre>.pages.dev` (o tu dominio cuando lo tengas).
6. **Save and Deploy**. El primer build tarda varios minutos porque genera todas las versiones de las fotos (AVIF/WebP); los siguientes son más rápidos.

---

## Dominio propio (opcional, unos 10–15 € al año)

1. Compra el dominio (por ejemplo en el propio Cloudflare: **Domain Registration** → **Register Domains**, o en otro registrador).
2. En el proyecto de Pages: **Custom domains** → **Set up a custom domain** → escribe el dominio y sigue los pasos. Si el dominio está en Cloudflare, se configura solo; si está en otro sitio, te dice qué registro DNS añadir. El HTTPS es automático.

### Qué cambiar cuando haya dominio

- **Opción B:** en Cloudflare → proyecto → **Settings** → **Environment variables**, cambia `SITE_URL` al dominio nuevo (`https://tudominio.es`) y vuelve a desplegar. Con eso se actualizan el sitemap, las etiquetas para compartir en redes y los datos para Google.
- **`public/robots.txt`:** cambia la línea `Sitemap:` por `https://tudominio.es/sitemap-index.xml`, y sube el cambio.
- **Opción A:** hay que reconstruir la web con el dominio nuevo (`SITE_URL=https://tudominio.es npm run build`) y volver a subir el zip; pídeselo a quien te la mantenga o a Claude.

---

## Para quien mantenga las webs: regenerar los entregables

Después de construir una web (`npm run build` dentro de su carpeta):

```bash
node /home/claude/tools/package-site.mjs /home/claude/alvaro-web     web1-fotoperiodismo
node /home/claude/tools/package-site.mjs /home/claude/alvaro-directo web2-directo
node /home/claude/tools/package-site.mjs /home/claude/alvaro-archivo web3-portfolio
```

Opciones: `--dist <carpeta>` para usar otra salida de build, `--out <carpeta>` para otro destino, `--keep-router` para dejar el router de Astro en el prototipo (por defecto se quita y la navegación es normal entre páginas, con transición de imagen en navegadores compatibles).

El prototipo (`preview/`) se publica en Claude con la lista de `preview-files.json`. En el prototipo: las fuentes van incrustadas, las rutas son relativas, cada foto tiene solo 2 tamaños WebP y los botones de descarga de PDF muestran un aviso (las descargas funcionan en la web publicada).
