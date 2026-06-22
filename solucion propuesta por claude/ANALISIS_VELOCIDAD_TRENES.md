# 🔍 ANÁLISIS: ¿Por Qué Los Trenes Vuelan en Previewer 2.0?

## 🎯 PROBLEMA

Los trenes se mueven **3-5x más rápido** en `previewer-2.0` que en `flow-diagram-creator`.

---

## 📋 COMPARACIÓN DE CÓDIGO

### ✅ EDITOR (flow-diagram-creator) - CORRECTO

**Archivo:** `index.html`

#### 1. Inicialización (LÍNEA 9178-9189):
```javascript
startAnimationLoop() {
    this._lastAnimationTs = performance.now();
    const animate = (ts) => {
        const elapsed = ts - this._lastAnimationTs;
        this._lastAnimationTs = ts;
        const dt = Math.max(0.001, Math.min(0.05, elapsed / 1000));
        this._currentDt = dt;
        this.render();
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
}
```

#### 2. Función de Cálculo de Velocidad (LÍNEA 8233-8342):
```javascript
resolveElementRouteState(elem, dt) {
    // ... validaciones ...
    
    const speed = Number.isFinite(rawSpeed) ? Math.max(1, Math.min(300, rawSpeed)) : 40;
    
    let remainingDist = dir * 2.5 * speed * dt;  // ← LA LÍNEA CLAVE (8276)
    
    // ... resto de lógica de portales y conexiones ...
}
```

**Nota:** Usa `this._currentDt` que se actualiza cada frame.

---

### ❌ VIEWER (previewer-2.0) - PROBLEMA

**Archivo:** `app.js`

#### 1. Inicialización (LÍNEA 1443):
```javascript
const tick = (ts) => {
    const last = state.animation.lastTs || ts;
    const dt = Math.max(0.001, Math.min(0.05, (ts - last) / 1000));
    state.animation.lastTs = ts;
    
    // ... resto ...
    
    const statePos = resolveElementRouteState(m.elem, dt, currentFlat, currentById);
};
```

#### 2. Función de Cálculo (LÍNEA 1291-1323):
```javascript
function resolveElementRouteState(elem, dt, flatElements, byId) {
    // ... validaciones ...
    
    const speed = Number.isFinite(rawSpeed) ? Math.max(1, Math.min(300, rawSpeed)) : 40;
    
    let remainingDist = dir * 2.5 * speed * dt;  // ← MISMA LÍNEA (1323)
    
    // ... resto de lógica ...
}
```

---

## 🤔 ¿ENTONCES POR QUÉ VUELA?

**Las fórmulas son IDÉNTICAS:**
```javascript
remainingDist = dir * 2.5 * speed * dt;
```

Entonces el problema está en **UNO DE ESTOS:**

1. **`dt` se calcula diferente** ❓
2. **`speed` tiene valores diferentes en el JSON** ❓
3. **Hay un multiplicador extra que no vemos** ❓
4. **El `speed` se multiplica en otro lado** ❓

---

## 🔎 INVESTIGACIÓN: ¿Cuál es la diferencia?

### Opción A: El `dt` es diferente

**EDITOR:**
```javascript
const elapsed = ts - this._lastAnimationTs;
const dt = Math.max(0.001, Math.min(0.05, elapsed / 1000));
```

**VIEWER:**
```javascript
const last = state.animation.lastTs || ts;
const dt = Math.max(0.001, Math.min(0.05, (ts - last) / 1000));
```

**Análisis:** Ambos usan la MISMA fórmula. Son equivalentes. ✓

---

### Opción B: El `speed` es diferente

Necesitamos verificar:

1. **¿Tiene el viewer un multiplicador de velocidad global?**
   ```javascript
   // En el tick, antes de llamar resolveElementRouteState
   // ¿hay algo como:
   const dt = basedt * 2;  // ← Esto lo multiplicaría
   ```

2. **¿El JSON tiene `speed` diferente?**
   ```javascript
   // Si el speed en el JSON del viewer es 200 en lugar de 50
   // then: 200/50 = 4x más rápido ✓
   ```

3. **¿Hay un loop que actualiza múltiples veces?**

---

## 🎯 SOLUCIÓN: PASOS PARA VERIFICAR

### PASO 1: Verificar el Multiplicador Oculto

En `previewer-2.0/app.js`, en la función `tick`, busca:

```javascript
const tick = (ts) => {
    const last = state.animation.lastTs || ts;
    const dt = Math.max(0.001, Math.min(0.05, (ts - last) / 1000));
    
    // ❓ ¿HAY ALGO AQUÍ QUE MULTIPLIQUE dt?
    // const dt = dt * 2;  // ← Si está esto, AHÍ está el problema
    // const dtAdjusted = dt * 5;  // ← O cualquier multiplicador
    
    state.animation.lastTs = ts;
```

**Si encuentras algo como `dt = dt * X`, AHÍ está el problema.** Quítalo.

---

### PASO 2: Verificar el `speed` en el JSON

```javascript
// En previewer-2.0, cuando carga el JSON, verifica:
const mover = elem; // un tren
console.log('Speed del tren:', mover.speed);  // ¿Cuál es el valor?
```

**Comparar:**
- Speed en el editor: ~40-50
- Speed en el viewer: ¿Cuánto?

Si el viewer tiene 200 y el editor 50, es 4x más rápido. → Igualar valores.

---

### PASO 3: Verificar el Loop de Animación

En `previewer-2.0/app.js`, ¿el `tick` se llama múltiples veces por frame?

```javascript
// ¿Algo como esto?
state.animation.moverNodes.forEach((m) => {
    resolveElementRouteState(...);
    // ¿Se llama MÚLTIPLES veces aquí?
});
```

Si `moverNodes` contiene duplicados o se actualiza mal, se ejecutaría varias veces.

---

## 🔧 SOLUCIONES PROBABLES

### Solución 1: Remover Multiplicador Extra

Si el código en `app.js` dice:
```javascript
const dt = Math.max(0.001, Math.min(0.05, (ts - last) / 1000)) * 2.5;  // ← Quitar * 2.5
```

**Cambiar a:**
```javascript
const dt = Math.max(0.001, Math.min(0.05, (ts - last) / 1000));
```

---

### Solución 2: Igualar `speed` en JSON

Si el JSON tiene valores diferentes, normalizar.

**EDITOR JSON:**
```json
{"type": "metro", "meta": {"speed": 50}}
```

**VIEWER JSON:**
```json
{"type": "metro", "meta": {"speed": 200}}  // ← CAMBIAR A 50
```

---

### Solución 3: Verificar que `resolveElementRouteState` se llama UNA SOLA VEZ

```javascript
// Contar cuántas veces se llama por frame
let callCount = 0;

function resolveElementRouteState(elem, dt, ...) {
    callCount++;
    console.log('Llamada #', callCount);  // ← Debe ser 1 por mover
    // ...
}
```

Si ves números como 2, 3, 5... hay un problema de duplicación.

---

## 🎯 PRUEBA DIAGNOSTICA RÁPIDA

Abre el navegador (F12) en ambos y ejecuta:

### En EDITOR:
```javascript
// Obtener speed de un tren
const tren = window.app.elements.find(e => e.type === 'metro');
console.log('EDITOR - Speed:', tren.meta?.speed || tren.speed);

// Obtener dt
console.log('EDITOR - DT (debe ser ~0.016):', window.app._currentDt);
```

### En VIEWER:
```javascript
// En la consola, durante la animación
const tren = state.animation.moverNodes[0]?.elem;
console.log('VIEWER - Speed:', tren.speed);

// Mostrar dt (más difícil, depende de la estructura)
console.log('VIEWER - state:', state.animation);
```

**Comparar los valores.**

---

## 📊 CHECKLIST DE VERIFICACIÓN

- [ ] ¿Tiene `previewer-2.0/app.js` un multiplicador como `* 2.5` en el dt?
- [ ] ¿El JSON del viewer tiene `speed` 4-5x mayor que el editor?
- [ ] ¿Se llama `resolveElementRouteState` múltiples veces por tren?
- [ ] ¿Hay un `setInterval` o loop adicional acelerando?
- [ ] ¿El `tick` usa `requestAnimationFrame` o algo diferente?

---

## 🎯 PRÓXIMOS PASOS

**1. Ejecutar diagnósticos arriba** ↑

**2. Si encuentras el problema, pasa los detalles aquí:**
   - Línea exacta del multiplicador
   - Valores de `speed` en ambos
   - Cuántas veces se llama `resolveElementRouteState`

**3. Te doy la LÍNEA EXACTA a cambiar** 

---

## 💡 SPOILER: Mi Apuesta

Probablemente encontrarás algo como:

```javascript
// En previewer-2.0/app.js, línea ~1440:
const dt = ... * 2.5;  // ← Multiplicador fantasma
```

O:

```javascript
// El JSON del viewer tiene:
"speed": 250  // ← Cuando debería ser 50
```

**Ambos causan exactamente el comportamiento que ves:** trenes volando. 🚀

---

**Dame los resultados de la verificación y te doy la solución definitiva.** ✅
