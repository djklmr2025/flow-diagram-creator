![Logo de Flow Diagram Creator](https://github.com/djklmr2025/flow-diagram-creator/blob/main/FHLL.gif?raw=true)

# Flow Diagram Creator 🚀

Un editor gráfico interactivo diseñado para crear diagramas de flujo, planos animados y mapas interactivos con alta precisión y gestión de capas.

### 🔗 **Acceso al Sistema**
El proyecto se encuentra actualmente desplegado y funcional en:  
👉 **[https://flow-diagram-creator.vercel.app/](https://flow-diagram-creator.vercel.app/)**

---

## 🛠️ Estado del Proyecto: **En Desarrollo (Fase A)**

Actualmente, el sistema ha completado su **Fase A (Core Engine)**, lo que permite una manipulación robusta de elementos gráficos sobre lienzos infinitos.

### **Capacidades Actuales:**
* **Carga de Imágenes:** Soporte para múltiples archivos PNG (con transparencia) y otros formatos.
* **Herramientas de Dibujo:** Dibujo a mano alzada con lápiz y creación de formas básicas.
* **Polígonos Inteligentes:** Reconocimiento de cierre automático para crear polígonos con relleno.
* **Gestión de Capas:** Sistema jerárquico para organizar qué elementos van al frente o al fondo.
* **Interactividad:** Funciones de zoom infinito y redimensionamiento manteniendo proporciones.
* **Persistencia:** Capacidad para guardar y cargar proyectos en formato JSON.

---

## 🚀 Próximamente: Fase "B" (Puntos de Información)

La siguiente etapa de desarrollo se centrará en transformar los diagramas estáticos en **experiencias interactivas ricas**.

**¿Qué incluiremos en la Fase B?**
1.  **Ventanas Modales:** Al hacer clic en cualquier objeto o polígono, se abrirá un panel de información detallada.
2.  **Contenido Multimedia:** Capacidad de insertar textos descriptivos e imágenes dentro de las ventanas modales.
3.  **Integración de Video:** Soporte para embeber videos de YouTube o cargar archivos locales directamente en los puntos de interés.
4.  **Enriquecimiento de Datos:** Conversión de formas simples en "objetos inteligentes" con metadatos asociados.

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

<p align="center">
  <img src="https://github.com/djklmr2025/flow-diagram-creator/blob/main/FHLL.gif?raw=true" width="600" style="border-radius: 15px; box-shadow: 0 0 20px #00d4ff;">
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

## 🧩 Modo Sticker (Solo Animación)
En `mode=preview` / `mode=sticker`:
* Se ocultan barras/paneles/overlays.
* Fondo transparente y grid desactivado.
* Modo **solo lectura**: pan con click izquierdo y zoom con rueda/teclas.

Parámetros soportados:
* `?data=...` JSON embebido.
* `?project=...` URL externa a JSON.
* `?id=...` ID publicado (ver API abajo).
* Auto: `./project.json` (si existe y es JSON real).

## 🔌 API Pública Para Agentes IA (Links Compartibles)
Objetivo: que una IA (o humano) publique un JSON (sin imágenes) y obtenga links para:
* Previsualizar el diagrama como “sticker” (solo animación, sin UI).
* Consumir el JSON publicado desde cualquier plataforma (promptchats, dashboards, etc).

### ✅ ¿Dónde se guardan los proyectos?
* **Guardar:** `localStorage` del navegador (solo en ese dispositivo/navegador). No genera links.
* **Exportar:** descarga un archivo `*.json` local.
* **Publicar (API):** sube el JSON a una biblioteca pública (carpetas virtuales) y devuelve links compartibles.

### ⚙️ Requisitos en Vercel (para que funcione la biblioteca + publish)
Debes habilitar Vercel Blob y configurar variables de entorno:
* `BLOB_READ_WRITE_TOKEN` (obligatorio): habilita `POST /api/publish` y el listado/lectura estable vía API.
* `PUBLISH_KEY` (opcional): si lo defines, `POST /api/publish` requiere `x-publish-key` o `?key=...`.

Importante:
* Si NO defines `PUBLISH_KEY`, el publish queda abierto (ideal para prototipar, pero se puede abusar).
* Después de agregar variables en Vercel, haz un redeploy.
* En el UI del editor: el modal **Publicar** tiene el campo **Llave de publicación (PUBLISH_KEY)** y se guarda en `localStorage` (solo en ese navegador).

Endpoints:
* `POST /api/publish` publica un proyecto (JSON) en Vercel Blob y devuelve `previewUrl` y `jsonUrl`.
* `GET /api/project?id=...` devuelve el JSON publicado.
* `GET /api/library?prefix=...&mode=folded|expanded&limit=...` lista la biblioteca por carpetas.

Notas:
* CORS está habilitado (`*`) para facilitar consumo desde plataformas de IA.
* El publish **rechaza imágenes** (`type: "image"` / `imageSrc`) para mantener stickers vectoriales/animados.
* Límites anti-abuso: máximo ~200KB por proyecto y máximo 2000 elementos (contando grupos de forma recursiva).

### 🧪 Ejemplo de publicación (curl)
```bash
curl -sS -X POST "https://TU-DOMINIO.vercel.app/api/publish" \
  -H "x-publish-key: TU_PUBLISH_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"metro-demo","folder":"metro/linea-1","elements":[],"camera":{"x":0,"y":0,"zoom":1}}'
```

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
* Botón **Publicar**: publica el proyecto actual y muestra links (preview + JSON).
* Botón **Biblioteca**: navega por carpetas (`prefix`) y permite **Insertar** stickers publicados.

Inserción:
* Un sticker se inserta como **1 solo elemento tipo `group`** para poder moverlo como objeto único.



