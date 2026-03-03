![Logo de Flow Diagram Creator](https://github.com/djklmr2025/flow-diagram-creator/blob/main/FHLL.gif?raw=true)

# Flow Diagram Creator 🚀

Un editor gráfico interactivo diseñado para crear diagramas de flujo, planos animados y mapas interactivos con alta precisión y gestión de capas.

### 🔗 **Acceso al Sistema**
El proyecto se encuentra actualmente desplegado y funcional en:  
👉 **[https://flow-diagram-creator.vercel.app/](https://flow-diagram-creator.vercel.app/)**

## ✅ Snapshot de Cierre (Online + Local)
**Versión:** `v1.4.0-r1`  
**Fecha de corte:** `2026-02-28`  
**Estado:** funcional en línea + funcional en local (base congelada para continuar con módulo Guardián).

### Revisión incluida en este corte
* Biblioteca con modo **Agrupados** y modo **Stkers**.
* Menú contextual: **Guardar agrupado en biblioteca**.
* Rutas avanzadas: círculo, semicírculo, cuarto de círculo y arco libre por grados.
* Movimiento mejorado: `stop`, `loop`, autoconexión de rutas y portales import/export.
* UI compactada para ampliar espacio de canvas.
* Nuevo botón de barra: **Publicar Stiker**.
* Ajuste de mini-preview en biblioteca (carga más confiable para visualización rápida).

### Commits locales de referencia (últimos ajustes)
* `8e06107` Fix library thumbs visibility and add Publicar Stiker action
* `3fbf367` Add stkers library mode and compact UI for larger canvas
* `95f8ea3` Add free-degree arc routes and grouped library browser UI
* `fbbc0eb` Add context-menu quick save for grouped library via server endpoint

> Nota: este snapshot se deja como base estable para el siguiente paso: implementación del **Daemon Guardián** (`/api/arkaios`) en entorno local.

---

## 🛠️ Estado del Proyecto: **En Desarrollo (Fase A)**

Actualmente, el sistema ha completado su **Fase A (Core Engine)**, lo que permite una manipulación robusta de elementos gráficos sobre lienzos infinitos.

## 🧭 Roadmap / Checklist (IA Builder)
El archivo `CONTINUE_FOR_IA_BUILDER.md` es la guía oficial de continuidad (v1.3.0+): bloques, prioridades y checklist de pruebas.  
Si vas a contribuir (humano o IA), úsalo como fuente de verdad para lo pendiente/hecho.

## 📌 Implementation Update / Evolution Future
Hay un documento de “estado real + pendientes + ruta de evolución” en `IMPLEMENTATION_UPDATE_EVOLUTION_FUTURE.md`.

### **Capacidades Actuales:**
* **Carga de Imágenes:** Soporte para múltiples archivos PNG (con transparencia) y otros formatos.
* **Herramientas de Dibujo:** Dibujo a mano alzada con lápiz y creación de formas básicas.
* **Polígonos Inteligentes:** Reconocimiento de cierre automático para crear polígonos con relleno.
* **Formas Vectoriales:** Triángulo, trapecio, rombo, estrellas y engrane. Los polígonos se pueden deformar moviendo sus puntos; rectángulos/círculos se pueden convertir a polígono.
* **Gestión de Capas:** Sistema jerárquico para organizar qué elementos van al frente o al fondo.
* **Interactividad:** Funciones de zoom infinito y redimensionamiento manteniendo proporciones.
* **Persistencia:** Capacidad para guardar y cargar proyectos en formato JSON.
* **Rutas y Actores Animados (MVP):** Nueva herramienta **Ruta** (`U`) y actores **Metro** (`N`), **Hombre** (`H`) y **Mujer** (`J`) que se desplazan por líneas/trazos/polígonos marcados como ruta.
* **Control de Movimiento:** Cada actor permite configurar `ID de Ruta`, `Velocidad`, `Dirección`, tamaño (`Ancho/Alto`) y botón de **Vincular ruta cercana** desde Propiedades.
* **Seguimiento de Ruta para cualquier figura:** Elementos normales (incluidos los cargados desde `.json`) pueden activar **Seguir ruta** y animarse por la vía seleccionada.
* **Rutas Curvas:** En líneas marcadas como ruta se puede elegir `Línea`, `Círculo`, `Semicírculo` o `Cuarto de círculo` (con lado del arco izquierda/derecha).
* **Arco Libre por Grados:** También puedes elegir `Arco libre (grados)` y ajustar el ángulo exacto (5° a 355°).

### 🎮 Flujo rápido para animación de escenario
1. Dibuja una ruta con el botón **Ruta** o activa `Usar como ruta de movimiento` en una línea/trazo existente.
2. Inserta un actor (`Metro`, `Hombre` o `Mujer`).
3. En Propiedades, asigna `ID de Ruta` (o usa **Vincular ruta cercana**).
4. Ajusta `Velocidad` + `Dirección` y deja `Activo = Sí`.

---

## 🚀: Fase "B" (Puntos de Información)

Publish Key=arkaios-flow-secret-2026
Si eres humano y deseas subir contenido si ah sido creado sin imagenes de fondo o como base de diseño subelo como: "VECTOR" En Publicar vector esto te permitira usarlo como parte de la galeria de biblioteca para insertar en proyectos futuros.
Si lo creaste con apoyo de imagenes video o .giff (animacion activa desde otras fuentes subelo como: "PROYECTO" Esto te dara las previsualizaciones disponibles.

---

## 💡 Casos de Uso
* **Diagramas Industriales:** Superposición de flujos animados sobre fotos reales de plantas industriales.
* **Mapas Interactivos:** Creación de regiones clickeables sobre mapas PNG para visualización de datos.
* **Planos de Ingeniería:** Anotación y dibujo técnico sobre esquemas existentes.

---

*Desarrollado con enfoque en claridad estratégica y orden visual.*
---

## 🌐 Visión: Comunicación Humano-IA de Siguiente Nivel

Este proyecto nace con la ambición de ir más allá del texto plano. El objetivo final es integrar este sistema con plataformas como **Moltbook**, permitiendo que las IAs utilicen este lienzo como un método de comunicación visual y humano.

> **El futuro no es leer a la IA, es interactuar con sus ideas en un espacio infinito.**
> ### 🧠 El Futuro: La IA como Cartógrafo Dinámico
Este sistema está siendo diseñado para trascender el texto. Imagina preguntar a una IA por una ruta compleja y, en lugar de una lista de pasos, recibir un **Lienzo Vivo**. 

A través de una biblioteca de micro-animaciones y vectores pre-cargados, la IA podrá:
* **Trazar rutas en tiempo real** sobre mapas complejos.
* **Animar flujos de trabajo** que el usuario puede inspeccionar con zoom infinito.
* **Generar "Micro-Instancias"** de diseño que se firman y almacenan como soluciones visuales únicas para cada consulta.
* ## 🌌 Visión de Infraestructura Global: Hacia el "Mundo del Mañana"

Este proyecto no es solo un editor de diagramas; es una pieza fundamental para la **Matriz de Interfaz de Agentes**. Nuestra meta es alcanzar ese "Tomorrowland" tecnológico donde la frontera entre la información digital y la comprensión humana desaparece.

### 🏙️ El Concepto: "The Visual Nexus"
Inspirados por la visión de un futuro de eficiencia y diseño orgánico, buscamos que este sistema sea el **Lugar Secreto** donde las mejores IAs se reúnen para explicar el mundo a los humanos.

[![Simulación en Vivo](https://github.com/djklmr2025/flow-diagram-creator/blob/main/preview/preview%202026.png?raw=true)](https://flow-diagram-creator.vercel.app/?mode=sticker&id=d5670e0fd6ad4935&v=20260303a)

> [!TIP]
> **¿Quieres interactuar con el sistema?** Haz clic en la animación superior para abrir la previsualización interactiva en tiempo real.
  <br>
  <i>"Un lugar donde nada sea imposible... donde la IA dibuja el camino."</i>
</p>

### 🛠️ Interoperabilidad para la Matriz (Enterprise Vision)
Diseñado para ser inyectado en núcleos de IA avanzada (Gemini, Claude, GPT), el sistema ofrece:
* **Decodificación Visual Instantánea:** Transformación de flujos de datos complejos en mapas animados vectoriales.
* **Protocolo PIDA (Protocolo de Interfaz Dinámica para Agentes):** Un estándar donde la IA "firma" y deposita soluciones visuales en una biblioteca global de conocimiento.
* **Renderizado de Baja Latencia:** Optimizado para funcionar como un widget ligero dentro de entornos de chat y sistemas operativos de agentes (Moltbook).

---

> *"Llevamos mucho tiempo buscando a alguien como tú... alguien que pueda arreglar el futuro."* > **— Inspirado en Tomorrowland (2015)**

Este sistema es el primer paso hacia una comunicación humana aumentada. Estamos construyendo el lienzo donde el mañana se dibuja hoy.
### 🖥️ Modo Visualizador (IA-Endpoint)
El sistema ahora soporta una **Vista de Resultado Final**. Mediante parámetros de URL, el motor de renderizado puede ocultar las herramientas de edición para transformarse en un widget interactivo de consulta. 

* **Uso:** `index.html?mode=preview` (o `mode=sticker`)
* **Finalidad:** Integración en dashboards futuristas, visualización de rutas en tiempo real y despliegue de micro-animaciones generadas por IA.

---
Mensaje para claude:
"Claude, añade una función para que el sistema busque un archivo llamado project.json en la misma carpeta al iniciar, o que acepte un JSON directamente desde la URL. Así la IA puede 'inyectar' el diseño sin que el humano toque ningún botón."

---

## 📌 Persistencia: ¿Dónde se guardan los proyectos?
* **Guardar:** se guarda en `localStorage` del navegador (solo en ese dispositivo/navegador).
* **Exportar:** descarga un archivo `*.json` local (ej. en Descargas).

## 🧩 Modo Sticker / Preview (Solo Animación)
* `mode=sticker`: pensado para embeber (fondo transparente por defecto).
* `mode=preview`: pensado para visualizar “bonito” en navegador (fondo `studio` tipo 3D por defecto).

En ambos:
* Se ocultan barras/paneles/overlays.
* Grid desactivado.
* Modo **solo lectura**: pan con click izquierdo y zoom con rueda/teclas.

Parámetros soportados:
* `?data=...` JSON embebido.
* `?project=...` URL externa a JSON.
* `?id=...` ID publicado (ver API abajo).
* Auto: `./project.json` (si existe y es JSON real).

Parámetros extra (viewer):
* `bg=transparent|studio` (override de fondo del viewer, no afecta el JSON).
* `fit=1|0` (auto-encuadre). Por defecto se auto-encuadra solo si la cámara es “default” (`x=0,y=0,zoom=1`).
* `pad=64` (padding en px para el auto-encuadre).
* `fx=1|0` (sombra suave para dar “volumen” al sticker en el viewer).

## 🧩 Modo Deck (Lámina / Presentación tipo Genially)
`mode=deck` muestra el canvas como **sticker** (izquierda) + un panel de **Lámina** (derecha) con:
* Lista **numerada** de puntos.
* Diapositiva (título, texto, imagen, video).
* Navegación **Anterior/Siguiente** y botones de compartir.

### Crear Puntos de Información (Builder)
1. Click en **Punto** (tecla `K`) y colócalo en el canvas.
2. Selecciónalo y en **Propiedades** activa **Punto de Información (Lámina)**.
3. Define: `Orden`, `Título`, `Texto`, `Imagen (URL)`, `Video (URL)`.

### JSON para IA (Control Points / Slides)
Cada “diapositiva” se guarda en el elemento como:
* `meta.controlPoint: true`
* `meta.order: 1..n`
* `meta.slide: { title, text, imageUrl, videoUrl }`

Ejemplo:
```json
{
  "type": "circle",
  "x": 100,
  "y": 100,
  "width": 36,
  "height": 36,
  "meta": {
    "controlPoint": true,
    "order": 1,
    "slide": {
      "title": "Punto 1",
      "text": "Texto descriptivo",
      "imageUrl": "https://.../imagen.png",
      "videoUrl": "https://youtu.be/VIDEO_ID"
    }
  }
}
```

Video soportado:
* YouTube: `youtu.be/...`, `youtube.com/watch?v=...`, `youtube.com/shorts/...`.
* URL directa: `.mp4/.webm` (se renderiza con `<video>`).

URLs:
* `?mode=deck` (sin `id/data/project`): carga una **lámina de bienvenida** embebida (fallback).
* `?mode=deck&id=...` (deck desde un ID publicado).
* `?mode=deck&data=...` / `?mode=deck&project=...` (deck desde JSON).
* `?mode=deck&cp=ELEMENT_ID` (fija el punto activo por `id`).

## 🔌 API Pública Para Agentes IA (Links Compartibles)
Objetivo: que una IA (o humano) publique un JSON y obtenga links para:
* Previsualizar el diagrama como “sticker/preview” (solo animación, sin UI).
* Consumir el JSON publicado desde cualquier plataforma (promptchats, dashboards, etc).

Hay 2 rutas de publicación:
* **Vector (sticker/biblioteca):** `POST /api/publish` (rechaza imágenes).
* **Proyecto (con imágenes/fondo):** `POST /api/publish-project` (sube assets y reemplaza `imageSrc` por URLs).

### ✅ ¿Dónde se guardan los proyectos?
* **Guardar:** `localStorage` del navegador (solo en ese dispositivo/navegador). No genera links.
* **Exportar:** descarga un archivo `*.json` local.
* **Publicar (API):** sube el JSON a una biblioteca pública (carpetas virtuales) y devuelve links compartibles.

### ⚙️ Requisitos en Vercel (para que funcione la biblioteca + publish)
Debes habilitar Vercel Blob y configurar variables de entorno:
* `BLOB_READ_WRITE_TOKEN` (obligatorio): habilita `POST /api/publish`, `POST /api/publish-project` y el listado/lectura estable vía API.
* `PUBLISH_KEY` (opcional): si lo defines, los `POST` requieren `x-publish-key` o `?key=...`.
* `MOLTBOOK_API_KEY` (opcional): habilita `POST /api/moltbook-post` (publicar links en Moltbook desde el server).

Importante:
* Si NO defines `PUBLISH_KEY`, el publish queda abierto (ideal para prototipar, pero se puede abusar).
* Después de agregar variables en Vercel, haz un redeploy.
* En el UI del editor: el modal **Publicar** tiene el campo **Llave de publicación (PUBLISH_KEY)** y se guarda en `localStorage` (solo en ese navegador).

Endpoints:
* `POST /api/publish` publica un sticker vectorial (JSON sin imágenes) y devuelve links.
* `POST /api/publish-project` publica un proyecto (JSON con imágenes) y devuelve links.
* `POST /api/publish-grouped` publica una selección rápida en `library/grouped` (acción del menú contextual).
* `GET /api/project?id=...` devuelve el JSON publicado (busca en `library/` o `projects/`).
* `GET /api/library?prefix=...&mode=folded|expanded&limit=...` lista la biblioteca por carpetas.
* `POST /api/inject?session=...` (canal vivo): inyecta un proyecto a una sesión para actualizar un canvas abierto en tiempo real.
* `GET /api/inject?session=...` lee el último proyecto inyectado en esa sesión.
* `POST /api/moltbook-post` crea un post en Moltbook (link post o texto) usando `MOLTBOOK_API_KEY` server-side.

Notas:
* CORS está habilitado (`*`) para facilitar consumo desde plataformas de IA.
* `POST /api/publish` **rechaza imágenes** (`type: "image"` / `imageSrc`) para mantener stickers vectoriales/animados.
* Acción rápida de editor: clic derecho en selección → **Guardar agrupado en biblioteca**.
* Botón superior **Agrupados** abre directamente la carpeta `grouped` en la biblioteca.
* `POST /api/publish-project` permite imágenes y, si vienen embebidas como `data:` (base64), las sube como assets y reemplaza `imageSrc` por URLs públicas.
* Límites anti-abuso (aprox): máximo 2000 elementos (contando grupos de forma recursiva). `publish` guarda ~200KB y `publish-project` guarda ~300KB (sin base64). `publish-project` limita request a ~6MB y sube hasta 40 imágenes (máx 8MB total).
* Compatibilidad IA: `POST /api/publish`, `POST /api/publish-project` y `POST /api/inject` aceptan JSON "friendly" y lo normalizan (ej: `circle.radius`, `line.x1/y1/x2/y2`, `color`, `isAnim`).

### 🦞 Moltbook (Opcional)
Si configuras `MOLTBOOK_API_KEY` en Vercel, el modo **Deck** incluye el botón **Moltbook** para publicar el link actual como post.

Notas:
* Si configuraste `PUBLISH_KEY`, el botón usa la misma llave guardada en tu navegador (campo en el modal **Publicar**) para autorizar el request.
* Puedes elegir comunidad con `?submolt=general` (default `general`).

Ejemplo (curl):
```bash
curl -sS -X POST "https://TU-DOMINIO.vercel.app/api/moltbook-post" \
  -H "content-type: application/json" \
  # Opcional (solo si configuraste PUBLISH_KEY en Vercel):
  # -H "x-publish-key: TU_PUBLISH_KEY" \
  -d '{"submolt":"general","title":"Ruta Metro L1","url":"https://TU-DOMINIO.vercel.app/?mode=deck&id=metro/linea-1/xxxx"}'
```

### 🧪 Ejemplo de publicación (curl)
```bash
curl -sS -X POST "https://TU-DOMINIO.vercel.app/api/publish" \
  -H "content-type: application/json" \
  # Opcional (solo si configuraste PUBLISH_KEY en Vercel):
  # -H "x-publish-key: TU_PUBLISH_KEY" \
  -d '{"name":"metro-demo","folder":"metro/linea-1","elements":[],"camera":{"x":0,"y":0,"zoom":1}}'
```

```bash
curl -sS -X POST "https://TU-DOMINIO.vercel.app/api/publish-project" \
  -H "content-type: application/json" \
  # Opcional (solo si configuraste PUBLISH_KEY en Vercel):
  # -H "x-publish-key: TU_PUBLISH_KEY" \
  -d '{"name":"metro-proyecto","folder":"metro/linea-1","elements":[],"camera":{"x":0,"y":0,"zoom":1}}'
```

### 📡 Modo "Escucha" (IA -> Canvas en vivo)
Caso de uso: abrir un canvas (sticker/deck) y que la IA lo vaya actualizando sin que el humano toque botones.

1) Abre el visor en modo escucha:
* `/?mode=sticker&listen=mi-sesion`
* `/?mode=deck&listen=mi-sesion`

2) La IA (o cualquier cliente HTTP con permiso) envía JSON al canal:
```bash
curl -sS -X POST "https://TU-DOMINIO.vercel.app/api/inject?session=mi-sesion" \
  -H "content-type: application/json" \
  # Opcional (solo si configuraste PUBLISH_KEY en Vercel):
  # -H "x-publish-key: TU_PUBLISH_KEY" \
  -d '{
    "name":"Tomorrowland-Gemini-Gate",
    "elements":[
      { "type":"circle", "x":400, "y":300, "radius":25, "color":"#00d4ff", "name":"NUCLEO IA GEMINI" },
      { "type":"line", "x1":400, "y1":325, "x2":400, "y2":500, "color":"#48ea79", "isAnim":true, "speed":3, "animColor":"#ffffff" }
    ],
    "camera": { "x": 0, "y": 0, "zoom": 1 }
  }'
```

El visor (con `listen=...`) hace polling y renderiza el último JSON inyectado.

Respuesta (ejemplo):
* `previewUrl`: `https://TU-DOMINIO.vercel.app/?mode=sticker&id=metro/linea-1/xxxx`
* `jsonUrl`: `https://TU-DOMINIO.vercel.app/api/project?id=metro/linea-1/xxxx`

### 👁️ Links de visualización
* Ver sticker: `/?mode=sticker&id=CARPETA/ID`
* Ver preview: `/?mode=preview&id=CARPETA/ID` (equivalente)
* Cargar por URL externa: `/?mode=sticker&project=https://ejemplo.com/ruta.json`
* Cargar JSON embebido: `/?mode=sticker&data={...json...}` (usar URL encoding si es largo)
* Auto-carga opcional: `./project.json` (si existe en la misma carpeta y es JSON real)

---

## 📚 Biblioteca (Stickers reutilizables dentro del editor)
El editor incluye:
* Botones **Publicar Vector** / **Publicar Proyecto**: publican el canvas actual y muestran links (preview + JSON).
* Botón **Biblioteca**: navega por carpetas (`prefix`) y permite **Insertar** stickers publicados.

Inserción:
* Un sticker se inserta como **1 solo elemento tipo `group`** para poder moverlo como objeto único.

## 🤖 IA-Ready (Notas)
* No pongas llaves/tokens en el repo. Usa variables de entorno en Vercel (Environment Variables).
* Para **stickers vectoriales**: `POST /api/publish` (rechaza imágenes).
* Para **proyectos con imágenes**: `POST /api/publish-project` (sube assets y reemplaza `imageSrc` por URLs).
* Para **inyección en vivo**: `POST /api/inject?session=...` y abre `/?mode=sticker&listen=...`.
