# Previewer 2.0 (Standalone)

Visor independiente para proyectos JSON del Flow Diagram Builder.

## Incluye

- Abrir JSON local (`vector` o `proyecto`) 
- Cargar por URL params:
  - `?id=...` (usa `/api/project`)
  - `?data=...` (JSON embebido)
  - `?project=https://.../file.json` (URL externa)
- Fondo opcional (imagen local)
- Fijar vista (bloquear paneo)
- Rotar `-15° / +15°`
- Voltear horizontal/vertical
- Zoom `10%` a `500%`
- Limpiar vista
- Panel lateral plegable de catálogo
- Listado de `library` (vectores) y `projects` (proyectos)
- Mini previsualización de cada item
- Búsqueda/filtro por nombre o id
- Subida de nuevo JSON (`vector` o `proyecto`) a Blob vía API:
  - `POST /api/publish` (vector)
  - `POST /api/publish-project` (proyecto)

## Uso local rápido

Abre `index.html` con cualquier servidor estático.

Ejemplo con `npx`:

```bash
npx serve .
```

Luego entra a `http://localhost:3000/previewer-2.0/`

## Nota

Este módulo está aislado para evolucionar como repo independiente sin romper el builder actual.

## Evolución a visualizador multimedia/3D

Para subir de visor JSON a visor universal, la ruta recomendada es:

1. 3D web estándar:
   - `glTF/.glb` (principal recomendado, eficiente en web)
   - `obj+mtl` (compatibilidad heredada)
2. Video/GIF:
   - Video: `mp4`, `webm`
   - Animación ligera: `gif`, `webp animado`
3. Render:
   - Integrar `three.js` para escena 3D y órbita/cámara
   - Mantener el pipeline actual JSON como capa 2D superpuesta
4. Interacción:
   - Modo touch con hit-test (tap/drag)
   - Eventos por objeto (`onSelect`, `onHover`, `onActivate`)
