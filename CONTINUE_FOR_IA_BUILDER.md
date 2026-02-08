# 🤖 CONTINUE FOR IA BUILDER
## Guía de Continuación para Flow Diagram Creator v1.3.0+

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ FEATURES COMPLETAMENTE IMPLEMENTADAS (NO TOCAR)

#### 1. Sistema Base
- Canvas HTML5 con contexto 2D
- Arquitectura modular (clase `FlowDiagramSystem`)
- Sistema de cámara (pan, zoom, transformaciones mundo↔pantalla)
- Grid opcional con toggle

#### 2. Herramientas de Dibujo
- ✅ Rectángulo (tecla R)
- ✅ Círculo (tecla C)
- ✅ Línea animada (tecla L)
- ✅ Lápiz/Dibujo libre (tecla P)
- ✅ Insertar imagen (tecla I) - PNG, JPG, GIF, WEBP con transparencia

#### 3. Gestión de Elementos
- ✅ Selección múltiple (Ctrl+Click)
- ✅ Agrupar/Desagrupar (Ctrl+G)
- ✅ Copiar/Pegar (Ctrl+C/V)
- ✅ Deshacer (Ctrl+Z) - hasta 50 estados en historial
- ✅ Bloquear/Fijar elementos (Ctrl+L)
- ✅ Sistema de capas Z-index (traer al frente, enviar atrás)

#### 4. Interacción
- ✅ Handles de redimensionamiento (8 puntos para rectángulos/círculos/imágenes)
- ✅ Menú contextual (botón derecho)
- ✅ Pan con espacio, rueda del mouse o botón derecho
- ✅ Zoom con rueda del mouse o +/- (0 para reset)
- ✅ Detección de cierre automático en paths (polígonos)

#### 5. Animaciones Básicas
- ✅ Flujo de partículas en líneas (izquierda↔derecha)
- ✅ Indicadores de conexión (verde/rojo/transparente)
- ✅ Activar/desactivar con doble click

#### 6. Persistencia y Publicación
- ✅ Guardar en localStorage
- ✅ Exportar/Importar JSON
- ✅ API de publicación (`/api/publish`)
- ✅ Sistema de biblioteca de stickers
- ✅ Modo visor/preview (`?mode=sticker`)
- ✅ Carga por URL (`?id=`, `?data=`, `?project=`)

#### 7. Panel de Propiedades
- ✅ Nombre del elemento
- ✅ Color de relleno
- ✅ Color de borde
- ✅ Color de animación
- ✅ Dirección de flujo
- ✅ Estado de conexión
- ✅ Toggle activo/pausado

---

## 🚧 FEATURES PENDIENTES (LO QUE HAY QUE IMPLEMENTAR)

### BLOQUE 1: Controles Táctiles (PRIORIDAD ALTA) 📱

**Estado:** ✅ IMPLEMENTADO (2026-02-07)

**Qué falta:**
1. Touch events para zoom de pellizco (pinch-to-zoom)
2. Pan con 2 dedos simultáneos
3. Detección correcta de gestos táctiles vs click

**Dónde implementar:**
- Archivo: `index.html`
- Sección: Dentro de `setupEventListeners()`
- Líneas aproximadas: Después de línea ~200 (después de los mouse events)

**Código a agregar:**

```javascript
// Dentro de setupEventListeners(), después de los eventos de mouse:

// Touch events
this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
```

**Nuevas propiedades en constructor:**

```javascript
// Dentro de constructor(), después de this.autoClosePathDistance:

this.touches = [];
this.lastTouchDistance = 0;
this.lastTouchCenter = { x: 0, y: 0 };
```

**Nuevos métodos a agregar ANTES de `screenToWorld()`:**

```javascript
// ==================== TOUCH SUPPORT ====================

onTouchStart(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
    
    if (this.touches.length === 2) {
        // Iniciar zoom de pellizco
        const dx = this.touches[0].clientX - this.touches[1].clientX;
        const dy = this.touches[0].clientY - this.touches[1].clientY;
        this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        this.lastTouchCenter = {
            x: (this.touches[0].clientX + this.touches[1].clientX) / 2,
            y: (this.touches[0].clientY + this.touches[1].clientY) / 2
        };
    } else if (this.touches.length === 1) {
        const touch = this.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;
        const worldPos = this.screenToWorld(mouseX, mouseY);
        
        if (this.readOnly) {
            this.isPanning = true;
            this.dragStart = { x: mouseX, y: mouseY };
        } else {
            const clicked = this.getElementAt(worldPos.x, worldPos.y);
            if (clicked) {
                this.selectedElements = [clicked];
                this.isDragging = true;
                this.dragStart = { x: worldPos.x, y: worldPos.y };
                this.updatePropertiesPanel();
            }
        }
    }
}

onTouchMove(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
    
    if (this.touches.length === 2) {
        // Zoom de pellizco + Pan
        const dx = this.touches[0].clientX - this.touches[1].clientX;
        const dy = this.touches[0].clientY - this.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const center = {
            x: (this.touches[0].clientX + this.touches[1].clientX) / 2,
            y: (this.touches[0].clientY + this.touches[1].clientY) / 2
        };
        
        if (this.lastTouchDistance > 0) {
            const zoomFactor = distance / this.lastTouchDistance;
            const newZoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));
            
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = center.x - rect.left;
            const canvasY = center.y - rect.top;
            
            const worldBefore = this.screenToWorld(canvasX, canvasY);
            this.camera.zoom = newZoom;
            const worldAfter = this.screenToWorld(canvasX, canvasY);
            
            this.camera.x += (worldAfter.x - worldBefore.x) * this.camera.zoom;
            this.camera.y += (worldAfter.y - worldBefore.y) * this.camera.zoom;
            
            // Pan con 2 dedos
            const dx2 = center.x - this.lastTouchCenter.x;
            const dy2 = center.y - this.lastTouchCenter.y;
            this.camera.x += dx2;
            this.camera.y += dy2;
            
            this.updateZoomIndicator();
        }
        
        this.lastTouchDistance = distance;
        this.lastTouchCenter = center;
        
    } else if (this.touches.length === 1) {
        const touch = this.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;
        const worldPos = this.screenToWorld(mouseX, mouseY);
        
        if (this.isPanning) {
            this.camera.x += mouseX - this.dragStart.x;
            this.camera.y += mouseY - this.dragStart.y;
            this.dragStart = { x: mouseX, y: mouseY };
        } else if (this.isDragging && !this.readOnly) {
            const dx = worldPos.x - this.dragStart.x;
            const dy = worldPos.y - this.dragStart.y;
            
            this.selectedElements.forEach(elem => {
                if (!elem.locked) {
                    this.offsetElement(elem, dx, dy);
                }
            });
            
            this.dragStart = { x: worldPos.x, y: worldPos.y };
        }
    }
}

onTouchEnd(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
    
    if (this.touches.length < 2) {
        this.lastTouchDistance = 0;
    }
    
    if (this.touches.length === 0) {
        this.isPanning = false;
        this.isDragging = false;
    }
}
```

**IMPORTANTE:** También agregar en CSS (dentro de `<style>`):

```css
body {
    /* ... otras reglas ... */
    touch-action: none;  /* CRÍTICO para evitar zoom/scroll nativo */
}
```

---

### BLOQUE 2: Transparencia Total (PRIORIDAD ALTA) 🎨

**Estado:** ✅ IMPLEMENTADO (2026-02-07)

**Qué falta:**
1. Checkbox "Transparente" para relleno y borde
2. Aplicar `transparent` o `rgba(0,0,0,0)` en renderizado
3. Actualizar panel de propiedades

**Dónde implementar:**
- Archivo: `index.html`
- Sección HTML: Dentro de `#properties-panel`
- Sección JS: Métodos `updatePropertiesPanel()` y `updateSelectedProperties()`

**Código HTML a MODIFICAR (buscar `<div class="property-group">` del color de relleno):**

ANTES:
```html
<div class="property-group">
    <label>Color de Relleno:</label>
    <input type="color" id="prop-fill-color" class="color-picker" value="#0f3460">
</div>
```

DESPUÉS:
```html
<div class="property-group">
    <label>Color de Relleno:</label>
    <input type="color" id="prop-fill-color" class="color-picker" value="#0f3460">
    <label style="margin-top: 5px;">
        <input type="checkbox" id="prop-fill-transparent"> Transparente
    </label>
</div>
```

**Hacer lo mismo para Color de Borde:**

```html
<div class="property-group">
    <label>Color de Borde:</label>
    <input type="color" id="prop-stroke-color" class="color-picker" value="#e94560">
    <label style="margin-top: 5px;">
        <input type="checkbox" id="prop-stroke-transparent"> Transparente
    </label>
</div>
```

**Modificar `setupPropertiesPanel()` para incluir los nuevos IDs:**

```javascript
setupPropertiesPanel() {
    const inputs = ['prop-name', 'prop-fill-color', 'prop-stroke-color', 'prop-anim-color', 
                   'prop-flow-direction', 'prop-connection-status', 'prop-active',
                   'prop-fill-transparent', 'prop-stroke-transparent'];  // AGREGAR ESTOS
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => this.updateSelectedProperties());
        }
    });
}
```

**Modificar `updateSelectedProperties()`:**

```javascript
updateSelectedProperties() {
    this.selectedElements.forEach(elem => {
        elem.name = document.getElementById('prop-name').value;
        
        // Manejar transparencia de relleno
        if (document.getElementById('prop-fill-transparent').checked) {
            elem.fillColor = 'transparent';
        } else {
            elem.fillColor = document.getElementById('prop-fill-color').value;
        }
        
        // Manejar transparencia de borde
        if (document.getElementById('prop-stroke-transparent').checked) {
            elem.strokeColor = 'transparent';
        } else {
            elem.strokeColor = document.getElementById('prop-stroke-color').value;
        }
        
        elem.connectionStatus = document.getElementById('prop-connection-status').value;
        elem.active = document.getElementById('prop-active').value === 'true';
        
        if (elem.type === 'line') {
            elem.animColor = document.getElementById('prop-anim-color').value;
            elem.flowDirection = document.getElementById('prop-flow-direction').value;
        }
    });
}
```

**Modificar `updatePropertiesPanel()`:**

```javascript
updatePropertiesPanel() {
    if (this.selectedElements.length === 1) {
        const elem = this.selectedElements[0];
        
        document.getElementById('prop-name').value = elem.name || '';
        
        // Manejar transparencia
        const fillTransparent = elem.fillColor === 'transparent' || elem.fillColor === 'rgba(0,0,0,0)';
        const strokeTransparent = elem.strokeColor === 'transparent' || elem.strokeColor === 'rgba(0,0,0,0)';
        
        document.getElementById('prop-fill-transparent').checked = fillTransparent;
        document.getElementById('prop-stroke-transparent').checked = strokeTransparent;
        
        if (!fillTransparent) {
            document.getElementById('prop-fill-color').value = elem.fillColor;
        }
        if (!strokeTransparent) {
            document.getElementById('prop-stroke-color').value = elem.strokeColor;
        }
        
        // ... resto del código existente ...
        
        document.getElementById('properties-panel').classList.add('show');
    } else {
        this.hidePropertiesPanel();
    }
}
```

**Modificar `drawElement()` para aplicar transparencia:**

Buscar en cada tipo de elemento (rectangle, circle, etc.) y CAMBIAR:

```javascript
// ANTES:
this.ctx.fillStyle = elem.fillColor;
this.ctx.strokeStyle = elem.strokeColor;

// DESPUÉS:
const fillColor = elem.fillColor === 'transparent' ? 'rgba(0,0,0,0)' : elem.fillColor;
const strokeColor = elem.strokeColor === 'transparent' ? 'rgba(0,0,0,0)' : elem.strokeColor;
this.ctx.fillStyle = fillColor;
this.ctx.strokeStyle = strokeColor;
```

---

### BLOQUE 3: Ancho de Línea Variable (PRIORIDAD MEDIA) 📏

**Estado:** ✅ IMPLEMENTADO (2026-02-07)

**Qué falta:**
1. Slider en panel de propiedades
2. Opción en menú contextual
3. Aplicar `lineWidth` en renderizado

**HTML a AGREGAR en `#properties-panel` (después de los colores):**

```html
<div class="property-group">
    <label>Ancho de Línea:</label>
    <input type="range" id="prop-line-width" min="1" max="20" value="3">
    <span id="prop-line-width-value">3px</span>
</div>
```

**JavaScript en `setupPropertiesPanel()`:**

```javascript
// Agregar listener especial para el slider:
document.getElementById('prop-line-width').addEventListener('input', () => {
    const value = document.getElementById('prop-line-width').value;
    document.getElementById('prop-line-width-value').textContent = value + 'px';
    this.updateSelectedProperties();
});
```

**Agregar en menú contextual HTML:**

```html
<div class="context-menu-separator"></div>
<div class="context-menu-item" id="ctx-line-width">
    <span>📏</span> Cambiar Ancho...
</div>
```

**Agregar listener en `setupContextMenu()`:**

```javascript
document.getElementById('ctx-line-width').addEventListener('click', () => {
    this.changeLineWidth();
    this.hideContextMenu();
});
```

**Nuevo método `changeLineWidth()`:**

```javascript
changeLineWidth() {
    if (this.selectedElements.length === 0) return;
    
    const current = this.selectedElements[0].lineWidth || 3;
    const newWidth = prompt('Nuevo ancho de línea (1-20):', current);
    
    if (newWidth !== null) {
        const width = Math.max(1, Math.min(20, parseInt(newWidth) || 3));
        this.selectedElements.forEach(elem => {
            elem.lineWidth = width;
        });
        this.updatePropertiesPanel();
    }
}
```

**Modificar `createElementAt()` para incluir lineWidth:**

```javascript
const baseElement = {
    // ... propiedades existentes ...
    lineWidth: 3  // AGREGAR ESTA LÍNEA
};
```

**Modificar `drawElement()` para usar lineWidth:**

```javascript
// Buscar todas las apariciones de:
this.ctx.lineWidth = 2 / this.camera.zoom;
// o
this.ctx.lineWidth = 3 / this.camera.zoom;

// Y REEMPLAZAR con:
this.ctx.lineWidth = (elem.lineWidth || 3) / this.camera.zoom;
```

---

### BLOQUE 4: Polígonos Redimensionables (PRIORIDAD ALTA) ✨

**Estado:** ✅ IMPLEMENTADO (2026-02-07)

**Qué falta:**
1. Handles de redimensionamiento para `type: 'polygon'` y `type: 'path'`
2. Escalado de puntos al redimensionar

**Modificar `getResizeHandles()`:**

BUSCAR la línea que dice:
```javascript
} else if (elem.type === 'line') {
```

Y ANTES de esa línea, AGREGAR:

```javascript
} else if (elem.type === 'polygon' || elem.type === 'path') {
    // Calcular bounding box de los puntos
    if (elem.points && elem.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        elem.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        
        handles.push(
            { x: minX, y: minY, position: 'nw' },
            { x: (minX + maxX) / 2, y: minY, position: 'n' },
            { x: maxX, y: minY, position: 'ne' },
            { x: maxX, y: (minY + maxY) / 2, position: 'e' },
            { x: maxX, y: maxY, position: 'se' },
            { x: (minX + maxX) / 2, y: maxY, position: 's' },
            { x: minX, y: maxY, position: 'sw' },
            { x: minX, y: (minY + maxY) / 2, position: 'w' }
        );
    }
```

**Modificar `resizeElement()`:**

BUSCAR la línea que dice:
```javascript
} else if (elem.type === 'line') {
```

Y ANTES de esa línea, AGREGAR:

```javascript
} else if (elem.type === 'polygon' || elem.type === 'path') {
    if (elem.points && elem.points.length > 0) {
        // Calcular bounding box original
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        elem.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        
        const oldWidth = maxX - minX;
        const oldHeight = maxY - minY;
        
        // Calcular nuevo bounding box según handle
        let newMinX = minX, newMinY = minY, newMaxX = maxX, newMaxY = maxY;
        
        switch(handle) {
            case 'se':
                newMaxX = worldPos.x;
                newMaxY = worldPos.y;
                break;
            case 'nw':
                newMinX = worldPos.x;
                newMinY = worldPos.y;
                break;
            case 'ne':
                newMaxX = worldPos.x;
                newMinY = worldPos.y;
                break;
            case 'sw':
                newMinX = worldPos.x;
                newMaxY = worldPos.y;
                break;
            case 'e':
                newMaxX = worldPos.x;
                break;
            case 'w':
                newMinX = worldPos.x;
                break;
            case 's':
                newMaxY = worldPos.y;
                break;
            case 'n':
                newMinY = worldPos.y;
                break;
        }
        
        const newWidth = newMaxX - newMinX;
        const newHeight = newMaxY - newMinY;
        
        // Escalar todos los puntos
        elem.points.forEach(p => {
            const relX = (p.x - minX) / oldWidth;
            const relY = (p.y - minY) / oldHeight;
            p.x = newMinX + relX * newWidth;
            p.y = newMinY + relY * newHeight;
        });
    }
```

---

### BLOQUE 7: Navegación por Teclado (Flechas) (PRIORIDAD ALTA) ⌨️

**Estado:** ✅ IMPLEMENTADO (2026-02-07)

**Qué incluye:**
1. Flechas para mover elementos seleccionados (nudge).
2. Flechas para hacer pan del canvas cuando no hay selección.
3. `Shift` = paso grande, `Alt` = paso fino.
4. `Backspace` también elimina selección (igual que `Delete`).

**Nota sobre “piezas fijas / imborrables”:**
* Si un objeto no se puede mover, revisa si está **Fijado** (`locked`). Usa el botón **Fijar** o el panel **Objetos (O)** → **Desbloquear todo**.
* Si un grupo viene de JSON viejo sin `x/y/width/height`, el sistema ahora calcula sus bounds automáticamente para poder seleccionarlo/eliminarlo.

### BLOQUE 5: Animaciones Avanzadas (PRIORIDAD MEDIA) ⚡

**Estado:** ❌ NO IMPLEMENTADO

**Qué falta:**
1. Selector de tipo de animación (none, flow, glow, electric)
2. Animación de destello/foco (ON/OFF cambio de color)
3. Animación eléctrica (rayo/pulso)
4. Aplicar animaciones a TODAS las figuras (no solo líneas)

**HTML a AGREGAR en `#properties-panel`:**

```html
<div class="property-group">
    <label>Tipo de Animación:</label>
    <select id="prop-animation-type">
        <option value="none">Sin animación</option>
        <option value="flow">Flujo (partículas)</option>
        <option value="glow">Destello (ON/OFF)</option>
        <option value="electric">Eléctrica (rayo)</option>
    </select>
</div>
<div class="property-group">
    <label>Color Alternativo (Destello):</label>
    <input type="color" id="prop-glow-color" class="color-picker" value="#ffff00">
</div>
```

**Modificar `createElementAt()` para incluir propiedades de animación:**

```javascript
const baseElement = {
    // ... propiedades existentes ...
    animationType: 'none',
    animColor: '#4caf50',
    glowColor: '#ffff00',
    flowDirection: 'right',
    animOffset: 0
};
```

**Nuevo método `applyAnimation()` (agregar ANTES de `drawElement()`):**

```javascript
applyAnimation(elem, drawCallback) {
    const animType = elem.animationType || 'none';
    
    if (animType === 'glow') {
        // Animación de destello (cambio de color)
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) > 0; // 3 Hz de frecuencia
        
        if (pulse) {
            const originalFill = this.ctx.fillStyle;
            const originalStroke = this.ctx.strokeStyle;
            
            this.ctx.fillStyle = elem.glowColor || '#ffff00';
            this.ctx.strokeStyle = elem.glowColor || '#ffff00';
            
            drawCallback();
            
            this.ctx.fillStyle = originalFill;
            this.ctx.strokeStyle = originalStroke;
        }
        
    } else if (animType === 'flow') {
        // Animación de flujo (partículas)
        // Esta se maneja diferente para cada tipo de forma
        // Ver drawFlowAnimation() para líneas
        
    } else if (animType === 'electric') {
        // Animación eléctrica (pulsos/rayos)
        const time = Date.now() / 100;
        const intensity = Math.abs(Math.sin(time)) * 0.5 + 0.5;
        
        this.ctx.shadowBlur = 20 / this.camera.zoom * intensity;
        this.ctx.shadowColor = elem.animColor || '#4caf50';
        
        drawCallback();
        
        this.ctx.shadowBlur = 0;
    }
}
```

**Nuevo método `drawElectricAnimation()` para líneas:**

```javascript
drawElectricAnimation(elem) {
    const dx = elem.endX - elem.x;
    const dy = elem.endY - elem.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;
    
    const time = Date.now() / 50;
    const segments = 10;
    const deviation = 5;
    
    this.ctx.strokeStyle = elem.animColor || '#4caf50';
    this.ctx.lineWidth = (elem.lineWidth || 3) / this.camera.zoom;
    this.ctx.shadowBlur = 10 / this.camera.zoom;
    this.ctx.shadowColor = elem.animColor || '#4caf50';
    
    this.ctx.beginPath();
    this.ctx.moveTo(elem.x, elem.y);
    
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const x = elem.x + dx * t;
        const y = elem.y + dy * t;
        
        const offset = Math.sin(time + i) * deviation;
        const perpX = -dy / length;
        const perpY = dx / length;
        
        this.ctx.lineTo(x + perpX * offset, y + perpY * offset);
    }
    
    this.ctx.lineTo(elem.endX, elem.endY);
    this.ctx.stroke();
    
    this.ctx.shadowBlur = 0;
}
```

**Modificar `drawElement()` para cada tipo de figura:**

Para RECTÁNGULOS:
```javascript
// Después de dibujar el rectángulo normal, agregar:
if (elem.active && elem.animationType && elem.animationType !== 'none') {
    this.applyAnimation(elem, () => {
        this.ctx.fillRect(elem.x, elem.y, elem.width, elem.height);
        this.ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
    });
}
```

Para CÍRCULOS:
```javascript
// Después de dibujar el círculo normal, agregar:
if (elem.active && elem.animationType && elem.animationType !== 'none') {
    this.applyAnimation(elem, () => {
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    });
}
```

Para LÍNEAS (modificar la sección existente):
```javascript
// Reemplazar la animación existente con:
if (elem.active) {
    const animType = elem.animationType || 'flow';
    if (animType === 'flow') {
        this.drawFlowAnimation(elem);
    } else if (animType === 'electric') {
        this.drawElectricAnimation(elem);
    } else if (animType === 'glow') {
        // El glow se maneja en applyAnimation
    }
}
```

---

### BLOQUE 6: Sistema de Rieles/Transporte 🚇 (PRIORIDAD BAJA - MUY COMPLEJO)

**Estado:** ❌ NO IMPLEMENTADO

**ADVERTENCIA:** Este es el feature MÁS COMPLEJO de todos. Requiere:
- Sistema de partículas
- Detección de path-following
- Interpolación de movimiento
- Ciclo de vida de objetos temporales
- Sincronización de múltiples objetos

**Recomendación:** Implementar DESPUÉS de todos los bloques anteriores.

**Arquitectura propuesta:**

1. Nuevo tipo de elemento: `type: 'rail'` (línea doble)
2. Sistema de "objetos montados" (riders)
3. Motor de animación independiente

**NO DOCUMENTAR EN DETALLE AÚN** - Esperar a completar bloques 1-5 primero.

---

## 🔍 PUNTOS CRÍTICOS (NO ROMPER)

### 1. Sistema de IDs
- Cada elemento tiene `id: Date.now() + Math.random()`
- NUNCA duplicar IDs
- Al copiar/pegar/duplicar, SIEMPRE usar `assignNewIdsRecursive()`

### 2. Sistema de Historial
- Siempre llamar `this.saveHistory()` después de modificar `this.elements`
- Límite de 50 estados
- NO guardar referencias a objetos, solo JSON serializado

### 3. Sistema de Grupos
- Los grupos pueden contener otros grupos (recursivo)
- Método `walkElements()` ya maneja recursión
- Al mover grupo, mover todos los hijos con `offsetElement()`

### 4. Modo ReadOnly
- Si `this.readOnly === true`, NO permitir edición
- Solo zoom y pan
- Se activa con `?mode=sticker` o `?mode=preview`

### 5. Carga de Imágenes
- Cache en `this.loadedImages[elem.id]`
- Al duplicar, copiar referencia de imagen
- NO incluir imágenes en publicación API (solo vectores)

### 6. Transformaciones de Coordenadas
- SIEMPRE usar `screenToWorld()` y `worldToScreen()`
- NUNCA trabajar con coordenadas de pantalla directamente
- Respetar `this.camera.zoom` en todos los dibujos

---

## 📝 CHECKLIST DE INTEGRACIÓN

Antes de marcar como "completado", verificar:

- [ ] El código NO rompe features existentes
- [ ] Se probó en desktop (mouse)
- [ ] Se probó en móvil (touch)
- [ ] Funciona en modo normal Y en modo visor
- [ ] Los elementos se pueden guardar/cargar
- [ ] Los elementos se pueden publicar (si son vectores)
- [ ] El historial (Ctrl+Z) funciona
- [ ] No hay errores en consola
- [ ] El rendimiento es aceptable (60 FPS)

---

## 🧪 TESTING RECOMENDADO

### Test 1: Touch Controls
1. Abrir en móvil o tablet
2. Pellizcar con 2 dedos → debe hacer zoom
3. Arrastrar con 2 dedos → debe hacer pan
4. Touch simple → debe seleccionar/mover elementos

### Test 2: Transparencia
1. Crear un rectángulo
2. Marcar checkbox "Transparente" en relleno
3. Verificar que el rectángulo no tiene relleno
4. Hacer lo mismo con borde

### Test 3: Ancho de Línea
1. Crear una línea
2. Cambiar slider de ancho
3. Verificar que la línea cambia de grosor
4. Botón derecho → "Cambiar Ancho..." → debe funcionar

### Test 4: Polígonos Redimensionables
1. Dibujar un polígono con lápiz
2. Cerrar cerca del inicio
3. Seleccionar polígono
4. Arrastrar handles → debe redimensionar manteniendo forma

### Test 5: Animaciones
1. Crear rectángulo
2. Panel de propiedades → Tipo de animación: "Destello"
3. Verificar que parpadea
4. Cambiar a "Eléctrica" → debe tener efecto de glow
5. Probar con círculos, líneas, polígonos

---

## 📞 NOTAS PARA EL SIGUIENTE BUILDER

- El código está bien organizado en bloques con comentarios `// ====`
- Usa `console.log()` para debug
- Respeta la indentación (4 espacios)
- NO uses jQuery ni librerías externas
- Todo debe funcionar en vanilla JavaScript
- El archivo `index.html` es standalone (no necesita otros archivos)

**Versión actual en producción:** v1.2.0 (según readme)
**Próxima versión objetivo:** v1.3.0 (con todos los bloques 1-5 implementados)

---

## 🎯 PRIORIDADES SUGERIDAS

1. **BLOQUE 1** (Touch) - Crítico para móviles
2. **BLOQUE 2** (Transparencia) - Muy solicitado
3. **BLOQUE 4** (Polígonos resize) - Necesario para UX completo
4. **BLOQUE 3** (Ancho línea) - Nice to have
5. **BLOQUE 5** (Animaciones) - Feature avanzado
6. **BLOQUE 6** (Rieles) - Implementar al final

---

**Última actualización:** 2026-02-07
**Mantenedor original:** Claude (Anthropic)
**Colaboradores:** ChatGPT (OpenAI)
