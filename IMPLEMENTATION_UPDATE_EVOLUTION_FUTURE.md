# Implementation Update - Evolution Future
Fecha: 2026-02-09

Este documento resume el estado real de implementación del repo (lo que ya existe y funciona), lo que quedó pendiente y la ruta sugerida de evolución. No reemplaza `CONTINUE_FOR_IA_BUILDER.md`; lo complementa.

## Estado de Salud (Build/Arranque)

- Producción (Vercel) ya está funcional. En el UI debe verse el tag de build en la barra inferior: `build: 2026-02-09-boot3`.
- Se agregó un “boot screen” (modal **Cargando motor...**) que solo debe verse 2-3s. Si se queda pegado: es casi seguro un error de JavaScript (abrir F12 → Console).
- Se agregó un overlay de error en pantalla (abajo) con botones:
  - `Copiar` (stacktrace).
  - `Limpiar storage` (borra `flow-diagrams` y settings locales si localStorage se corrompe/bloquea).
- Hardening: accesos a `localStorage` están protegidos y `JSON.parse` ya no debería matar el arranque si hay datos corruptos.

## Estado Actual (Implementado)

UI/Builder (Editor)
- `index.html` contiene todo el motor (clase `FlowDiagramSystem`) y la UI (toolbar, panel propiedades, modales).
- Herramientas: seleccionar, rectángulo, círculo, línea animada, lápiz, formas (triángulo/trapecio/rombo/estrellas/engrane), punto de información (K).
- Imágenes: insertar PNG/JPG/GIF/WEBP (`I`). Los GIF se animan (se redibuja el canvas en loop).
- Video en canvas: botón **Video** (`M`) crea un elemento `type:"video"` que se dibuja en el canvas usando `HTMLVideoElement` (mejor con URLs directas `.mp4/.webm`).
- Edición: selección múltiple, marco de selección (marquee), agrupar/desagrupar, copiar/pegar, capas (Z), fijar/bloquear, panel **Objetos** (lista izquierda) para forzar selección/ir/borrar/desbloquear.
- Teclado: flechas (mover selección si hay selección, o pan si no hay), `Ctrl+Z` deshacer, `Ctrl+C/V/S/G/L`.

Persistencia y export
- Guardar: proyectos en `localStorage` (solo en ese navegador).
- Exportar: descarga `*.json`.
- Importar/Cargar: se carga desde archivo `*.json`.
- Fix crítico: el historial/undo ya no rompe imágenes (se eliminan campos runtime como `imageData` antes de serializar).

Viewer (Modo visor / para IA)
- Modos por URL: `mode=sticker`, `mode=preview`, `mode=deck`.
- Carga por URL: `?id=...` (publicado), `?data=...` (JSON embebido), `?project=...` (JSON remoto).
- Opciones viewer: `bg=transparent|studio`, `fit=1|0`, `pad=...`, `fx=1|0`.

Deck (Lámina tipo Genially)
- `mode=deck` divide canvas (izquierda) y panel Lámina (derecha).
- Puntos de control: se guardan en `meta.controlPoint`, `meta.order`, `meta.slide{title,text,imageUrl,videoUrl}`.
- Diapositiva soporta: texto, imagen por URL, video por URL (YouTube iframe o mp4/webm).

API (Vercel Functions)
- Carpeta `api/`: endpoints para listar biblioteca, publicar y consumir JSON, inyección (según README).
- Publicación para links compartibles:
  - `POST /api/publish` (vector/sticker) rechaza imágenes (y ahora también videos de canvas).
  - `POST /api/publish-project` (proyecto) permite imágenes y genera URLs públicas para assets.

## Cambios Recientes Importantes

Arranque/Errores (boot crash)
- Se corrigieron 2 errores de sintaxis que mataban todo el JS (por eso “ningún botón servía”):
  - `walkElements(...)` con llaves mal cerradas.
  - Regex de YouTube mal escapada en `toYouTubeEmbedUrl(...)` (literal regex no usa doble escape `\\`).
- Resultado: el motor vuelve a iniciar, se renderiza el grid/canvas y los botones responden.

Undo / Ctrl+Z con imágenes
- Se corrigió el bug donde `Ctrl+Z` “borraba” imágenes: era causado por serializar `imageData` a `{}` en el historial.
- Ahora se eliminan `imageData`/`videoData` al serializar (historial, copiar/pegar, duplicar, exportar, guardar).
- `undo()` re-normaliza el proyecto restaurado para limpiar “basura” de estados.

Video + Recorte (MVP)
- Se agregó elemento `type:"video"` dibujado en canvas.
- Menú contextual incluye `Recortar...` para `image` y `video` (crop por porcentaje). Se guarda en `elem.crop = {x,y,w,h}` normalizado 0..1.

## Lo Que NO Está Implementado (Pendiente)

Video (canvas)
- No hay panel de propiedades específico para video (loop/mute/autoplay/url) todavía.
- Videos locales (`blob:`) no son “portables”: al exportar/publicar no se pueden reconstruir en otro dispositivo.
- Publicación de video como asset en `publish-project` no está implementada (solo imágenes).
- YouTube no se puede dibujar dentro del canvas como frame (por CORS/iframe). En deck sí se puede como iframe.

Recorte (crop)
- El crop es por prompt (texto). Falta UI visual (handles) para recortar arrastrando.

Seguridad / abuso
- Si no usas `PUBLISH_KEY`, publicar queda abierto y puede abusarse.
- Falta rate limit robusto por IP/agent y/o captcha opcional.

Testing/Calidad
- No hay test suite automatizada (e2e o unit) para evitar regresiones en undo, publish y modos viewer.

UX “modo demo”
- No existe modo “screensaver/playlist” (auto-advance de diapositivas o reproducción secuencial).
- No existe gesto de 2 dedos específico para “activar deck” (touch); solo pan/zoom.

## Evolución Futura (Ruta Recomendada)

1) Media “Sticker-grade” (prioridad alta)
- Definir 2 categorías claras:
  - Vector/Sticker: sin imágenes, sin videos (solo shapes/paths/lines).
  - Proyecto: permite imágenes y (futuro) videos.
- Extender `publish-project` para subir videos a Blob y reemplazar `videoSrc` por URL pública.
- Agregar en Propiedades un bloque “Video” cuando `type:"video"` esté seleccionado:
  - URL, loop, mute, autoplay, play/pause.
- Agregar “modo click-to-play” (no autoplay) para kioskos.

2) Crop UI real (prioridad media)
- Crop interactivo con overlay:
  - Mostrar marco de recorte.
  - Arrastrar handles.
  - Guardar `elem.crop`.

3) Deck como “Presentación real” (prioridad alta para tu visión)
- Auto-advance opcional: `?demo=1&interval=8` (cambia de punto cada N segundos).
- Detener auto-advance con interacción del usuario (mouse/touch/teclado).
- Playlist de videos: si una diapositiva trae video mp4/webm, al terminar pasa a la siguiente.

4) Biblioteca como “sticker store” (prioridad media)
- Miniaturas (thumbnails) server-side o client-side.
- Tags/metadata por sticker.
- Búsqueda.
- Botón “Insertar” vs “Abrir”:
  - Insertar: agrega elementos al canvas sin reemplazar el proyecto.
  - Abrir: reemplaza el proyecto completo.

5) IA Endpoints (prioridad media)
- Formalizar un esquema JSON estable (versión):
  - `schemaVersion`, `elements`, `camera`, `meta`.
- Endpoint de “injection” seguro:
  - Requiere key o firma (para escritura).
  - Lectura pública sin auth.
- WebSocket/SSE para “live updates” (opcional, si necesitas edición colaborativa/IA en vivo).

6) “Sin fondo” y look 3D (prioridad baja/media)
- Viewer ya soporta `bg=transparent` y `fx=1` para volumen.
- Si se busca “calidad wow” estilo 3D real: considerar WebGL (postprocesado, blur, bloom).

7) Video con transparencia / chroma key (avance)
- Soporte a videos con canal alpha (WebM alpha), o chroma key con shader (WebGL).
- Esto es un salto de complejidad: ideal como fase separada.

## Seguridad (Muy Importante)

- Nunca subas tokens/PAT/keys al repo, issues, README o chats públicos.
- Si ya se pegaron en algún chat, asume “comprometido” y rota/revoca.
- En Vercel usa Environment Variables:
  - `BLOB_READ_WRITE_TOKEN` (obligatorio para publish/library).
  - `PUBLISH_KEY` (opcional, recomendado para producción).
  - `MOLTBOOK_API_KEY` (opcional).

## Referencias en el Código

- Motor/UI principal: `index.html`.
- Endpoints: `api/`.
- Checklist técnico de continuidad: `CONTINUE_FOR_IA_BUILDER.md`.
