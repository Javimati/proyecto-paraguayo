# Proyecto Álvaro: todo en una carpeta

Aquí están las 4 webs completas, lo necesario para publicarlas en Cloudflare y el contexto para que cualquier chat de Claude siga el trabajo sin perderse.

| Archivo o carpeta | Para qué sirve |
|---|---|
| `INSTRUCCIONES-PROYECTO.md` | Pegar en *Instrucciones* del proyecto de Claude |
| `ESTADO-ALVARO.md` | **Subir como archivo del proyecto.** Fuente de verdad: datos de Álvaro, webs, enlaces, prioridad y pendientes. Actualizarlo al final de cada chat |
| `PROMPT-ORIGINAL.md` | Encargo original completo (concepto, stack, requisitos) |
| `LEEME-DESPLIEGUE.md` | Publicar en Cloudflare paso a paso, para alguien que no programa |
| `retrato-alvaro.jpg` | Retrato real de Álvaro |
| `codigo/webN-…/` | Código fuente de cada web (Astro). Cada una tiene su propio `README.md` |
| `CLAUDE.md` | Lo leen Claude Code y los chats con este repo conectado |
| `herramientas/` | Scripts que convierten una web en prototipo visible dentro de Claude (ver ESTADO §5) |

## Las 4 webs
1. `web1-fotoperiodismo`: hoja de contactos y teletipo de agencia.
2. `web2-directo`: setlist de directo. **Prioridad actual.** Secciones: Fiesta Naranja, Supernoventeros y Más trabajos.
3. `web3-portfolio`: mesa de luz con todo su trabajo.
4. `web4-viaje`: «A través del visor», intro de cámara y viaje 3D.

## Cómo usarlo
- **Proyecto de Claude:** pega en sus instrucciones el texto corto que hay al principio de `INSTRUCCIONES-PROYECTO.md`, o el archivo entero. Todo lo demás se lee de este repo. Cuando un chat tenga que tocar código, dale el enlace de este repo: https://github.com/Javimati/proyecto-paraguayo
- **Ver una web en tu PC:** abre la carpeta `codigo/webN-…` en una terminal y escribe `npm install` y luego `npm run dev`. Necesitas Node 22.
- **Publicar:** sigue `LEEME-DESPLIEGUE.md`. Lo recomendado es GitHub + Cloudflare Pages, con build `npm run build`, salida `dist` y `NODE_VERSION=22`.
- **Las fotos son de muestra** (PROVISIONAL) salvo el retrato. Las reales están en `C:\Users\USUARIO\Desktop\FIESTAS Y MÚSICA\` y se importan en la web 2 con `npm run photos:import` (ver ESTADO §4).

> La versión compilada para la subida directa a Cloudflare no está en el repo (pesa demasiado). Se genera con `npm run build` en cada web, o se conecta el repo a Cloudflare Pages con el directorio raíz `codigo/webN-…`.
