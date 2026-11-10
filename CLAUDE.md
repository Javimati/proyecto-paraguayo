# CLAUDE.md — Proyecto portfolio de Álvaro Rodríguez Valverde

Antes de hacer nada, lee `ESTADO-ALVARO.md` (fuente de verdad) e `INSTRUCCIONES-PROYECTO.md` (reglas de trabajo).
- Código de cada web en `codigo/webN-*/` (Astro 7, cada una con su propio README). Trabaja en UNA web por tarea.
- No inventes datos de Álvaro. Lo pendiente va como TODO visible.
- Al terminar una tarea, actualiza `ESTADO-ALVARO.md` (qué cambió, versión publicada, pendientes) y haz commit + push a `main` en el mismo commit que el código.
- Fotos reales: en el PC de Marlon (ESTADO §2). **Web 2: calidad nativa** (decisión de Álvaro, 10/11/2026): los originales van al repo tal cual (`npm run photos:import`) y `scripts/build-photos.mjs` genera las versiones web. Resto de webs: solo versiones reducidas.
- Las versiones compiladas para Cloudflare no se guardan aquí: se generan con `npm run build` (salida en `dist/`). En Cloudflare Pages, el directorio raíz es `codigo/webN-…`.
