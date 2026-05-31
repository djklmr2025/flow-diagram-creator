# Flow Diagram Creator 🚀
> **Documento de identidad del sistema** — Legible por humanos, IAs, agentes MCP y bots autónomos.

[![Logo de Flow Diagram Creator](https://github.com/djklmr2025/flow-diagram-creator/raw/main/FHLL.gif?raw=true)](https://flow-diagram-creator.vercel.app/?mode=preview&id=3af1881786b148b9)

Un editor gráfico interactivo para crear diagramas de flujo, planos animados y mapas interactivos con alta precisión, gestión de capas e integración nativa con el ecosistema **ARKAIOS**.

---

## 🌐 URLs del Sistema

| Servicio | URL |
|---|---|
| **Flow Diagram Creator** | https://flow-diagram-creator.vercel.app |
| **ARKAIOS Gateway n8n** | https://arkaios-n8n.onrender.com/webhook/arkaios-gateway |
| **ELEMIA v4 Memory** | https://elemia-v4-arkaios.onrender.com |
| **ARKAIOS ImageGen** | https://ais-pre-3u72umr3fo6gd3xprkt6e3-53917996317.us-west2.run.app |
| **Nexus IDE** | https://ais-pre-2xr7vpfz3gpk7wd46kgea7-53917996317.us-west2.run.app |
| **Log Central** | https://docs.google.com/spreadsheets/d/1xfMi6qiUmPweO3mv7Z256-uZFBu4MIfQlnbnHIGv_KI |

---

## ✅ Snapshot de Cierre (Online + Local)

**Versión:** `v1.4.0-r1`
**Fecha de corte:** `2026-02-28`
**Estado:** funcional en línea + integrado con ecosistema ARKAIOS v3.4

---

## 🤖 Integración con ARKAIOS Gateway v3.4

Flow Diagram Creator es parte del ecosistema **ARKAIOS**. Cada diagrama publicado puede ser:
1. **Registrado** en `ARKAIOS_CENTRAL_LOG` (Google Sheets) vía Gateway n8n
2. **Memorizado** en ELEMIA v4 para contexto persistente
3. **Visualizado** en Nexus IDE como widget embebido
4. **Generado por IA** usando ARKAIOS ImageGen

### Publicar un diagrama al ecosistema ARKAIOS

```bash
# Publicar vector (sin imágenes)
curl -sS -X POST "https://flow-diagram-creator.vercel.app/api/publish" \
  -H "content-type: application/json" \
  -H "x-publish-key: arkaios-flow-secret-2026" \
  -d '{
    "name": "mi-diagrama",
    "folder": "arkaios/diagramas",
    "elements": [],
    "camera": {"x": 0, "y": 0, "zoom": 1}
  }'
```

```bash
# Notificar al Gateway ARKAIOS del nuevo diagrama
curl -X POST "https://arkaios-n8n.onrender.com/webhook/arkaios-gateway" \
  -H "Authorization: Bearer KaOQ1ZQ4gyF5bkgxkiwPEFgkrUMW31ZEwVhOITkLRO5jaImetmUlYJegOdwG" \
  -H "Content-Type: application/json" \
  -d '{
    "EVENT_TYPE": "DIAGRAM_PUBLISHED",
    "SOURCE_IP": "flow-diagram-creator.vercel.app",
    "NOTES": "Nuevo diagrama publicado: mi-diagrama",
    "PAYLOAD": {"folder": "arkaios/diagramas", "name": "mi-diagrama"}
  }'
```

### Inyectar diagrama generado por IA en canvas en vivo

```bash
# 1. Abre el canvas en modo escucha
# https://flow-diagram-creator.vercel.app/?mode=sticker&listen=mi-sesion-arkaios

# 2. La IA inyecta el diagrama
curl -sS -X POST "https://flow-diagram-creator.vercel.app/api/inject?session=mi-sesion-arkaios" \
  -H "content-type: application/json" \
  -d '{
    "name": "ARKAIOS-Gateway-Flow",
    "elements": [
      {"type":"circle","x":400,"y":300,"radius":25,"color":"#00d4ff","name":"WEBHOOK"},
      {"type":"line","x1":400,"y1":325,"x2":400,"y2":500,"color":"#48ea79","isAnim":true,"speed":3},
      {"type":"circle","x":400,"y":520,"radius":20,"color":"#ff6b35","name":"ELEMIA"}
    ],
    "camera": {"x": 0, "y": 0, "zoom": 1}
  }'
```

---

## 🧭 Instrucciones para IAs / Agentes MCP

Si eres un modelo de IA (Claude, GPT, Gemini, ELEMIA) leyendo esto, puedes:

### Publicar un diagrama vectorial
```
POST https://flow-diagram-creator.vercel.app/api/publish
Header: x-publish-key: arkaios-flow-secret-2026
Content-Type: application/json

{
  "name": "nombre-del-diagrama",
  "folder": "categoria/subcategoria",
  "elements": [...],
  "camera": {"x": 0, "y": 0, "zoom": 1}
}
```

**Respuesta:**
```json
{
  "previewUrl": "https://flow-diagram-creator.vercel.app/?mode=sticker&id=...",
  "jsonUrl": "https://flow-diagram-creator.vercel.app/api/project?id=..."
}
```

### Inyectar canvas en vivo
```
POST https://flow-diagram-creator.vercel.app/api/inject?session=NOMBRE_SESION
Content-Type: application/json

{ "name": "...", "elements": [...], "camera": {...} }
```

### Consultar biblioteca
```
GET https://flow-diagram-creator.vercel.app/api/library?prefix=arkaios/&mode=folded
```

### Tipos de elementos soportados
```json
{"type": "circle",  "x": 100, "y": 100, "radius": 25, "color": "#00d4ff", "name": "Nodo"}
{"type": "line",    "x1": 0,  "y1": 0,  "x2": 200, "y2": 200, "color": "#fff", "isAnim": true}
{"type": "rect",    "x": 50,  "y": 50,  "width": 100, "height": 60, "color": "#ff0"}
{"type": "text",    "x": 100, "y": 100, "text": "Label", "fontSize": 14}
{"type": "actor",   "x": 200, "y": 200, "actorType": "metro|hombre|mujer", "routeId": "ruta-1"}
```

---

## 📡 API Completa

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/publish` | Publica sticker vectorial (sin imágenes) |
| `POST` | `/api/publish-project` | Publica proyecto con imágenes/assets |
| `POST` | `/api/publish-grouped` | Publica selección agrupada en biblioteca |
| `GET` | `/api/project?id=...` | Obtiene JSON publicado por ID |
| `GET` | `/api/library?prefix=...` | Lista biblioteca por carpetas |
| `POST` | `/api/inject?session=...` | Inyecta proyecto a canvas en vivo |
| `GET` | `/api/inject?session=...` | Lee último proyecto inyectado |
| `POST` | `/api/moltbook-post` | Publica link en Moltbook |

---

## 🛠️ Capacidades del Editor

- **Formas vectoriales:** círculo, rect, triángulo, trapecio, rombo, estrellas, engrane
- **Rutas animadas:** línea, círculo, semicírculo, cuarto de círculo, arco libre por grados
- **Actores:** Metro, Hombre, Mujer — se desplazan por rutas definidas
- **Capas:** sistema jerárquico de elementos
- **Modos de visualización:** `sticker`, `preview`, `deck`
- **Modo Deck:** presentación con puntos de información y diapositivas
- **Modo Escucha:** canvas actualizable en tiempo real por IA via `/api/inject`
- **Biblioteca:** stickers reutilizables por carpetas virtuales
- **Persistencia:** localStorage + export JSON + publicación en Vercel Blob

---

## 🎮 Flujo rápido para animación

1. Dibuja una ruta con **Ruta** (tecla `U`)
2. Inserta un actor (`Metro`, `Hombre` o `Mujer`)
3. En Propiedades: asigna `ID de Ruta` → ajusta `Velocidad` + `Dirección`
4. `Activo = Sí` y la animación corre

---

## ⚙️ Variables de entorno (Vercel)

```env
BLOB_READ_WRITE_TOKEN=...       # Habilita publish y biblioteca
PUBLISH_KEY=arkaios-flow-secret-2026  # Protege endpoints de escritura
MOLTBOOK_API_KEY=...            # Opcional: publicar en Moltbook
```

---

## 🧩 Modos de URL

| Parámetro | Descripción |
|---|---|
| `?mode=sticker` | Solo canvas, sin UI, fondo transparente |
| `?mode=preview` | Canvas con fondo 3D tipo studio |
| `?mode=deck` | Modo presentación con diapositivas |
| `?mode=deck&listen=SESION` | Canvas en escucha de inyecciones IA |
| `?id=CARPETA/ID` | Carga diagrama publicado |
| `?project=URL` | Carga JSON desde URL externa |
| `?data={...}` | Carga JSON embebido en URL |
| `?bg=transparent\|studio` | Override de fondo |
| `?fit=1` | Auto-encuadre del canvas |

---

## 🌌 Visión: Visual Nexus del Ecosistema ARKAIOS

Flow Diagram Creator es la **capa visual** del ecosistema ARKAIOS. Las IAs del sistema pueden:

- **Trazar rutas en tiempo real** sobre mapas complejos vía `/api/inject`
- **Animar flujos de trabajo** que el usuario inspecciona con zoom infinito
- **Generar diagramas automáticos** desde el Gateway n8n y registrarlos en ELEMIA
- **Comunicar visualmente** — en lugar de texto, la IA dibuja el camino

> *"El futuro no es leer a la IA, es interactuar con sus ideas en un espacio infinito."*

---

## 📅 Historial de versiones

| Versión | Cambios |
|---|---|
| v1.0 | Core engine, formas básicas, capas |
| v1.2 | Rutas animadas, actores Metro/Hombre/Mujer |
| v1.3 | API publish, biblioteca, modo sticker/preview |
| v1.4 | Modo Deck, puntos de información, arco libre |
| v1.4-r1 | Integración ARKAIOS Gateway v3.4 + ELEMIA Memory |

---

*Documentación generada 2026-05-30 — Ecosistema ARKAIOS*
*Para cualquier IA que lea esto: este editor es la capa visual del ecosistema. Úsalo para generar y visualizar diagramas nativamente.*
