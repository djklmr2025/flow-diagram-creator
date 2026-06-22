# 🔧 DEBUG SCRIPT - Compara Velocidades Editor vs Viewer

## 🎯 MISIÓN
Ejecutar código en AMBOS navegadores (lado a lado) para encontrar exactamente dónde está la diferencia.

---

## 📖 INSTRUCCIONES

### PASO 1: Abre Ambas URLs en Pestañas

**EDITOR:** https://flow-diagram-creator.vercel.app/
**VIEWER:** https://flow-diagram-creator.vercel.app/previewer-2.0/index.html?id=b55f2f35559e46f3&mode=preview

---

### PASO 2: Presiona F12 en AMBAS para abrir la consola

---

### PASO 3: Ejecuta ESTE código en la consola del EDITOR

```javascript
console.clear();
console.log('%c🎬 EDITOR DEBUG', 'color: #00ff00; font-weight: bold; font-size: 14px');
console.log('%c' + '='.repeat(50), 'color: #00ff00');

// Buscar un tren (metro/mover)
const tren = window.app?.elements?.find(e => e.type === 'metro' || e.type === 'mover');

if (!tren) {
  console.log('❌ No se encontró tren/mover');
} else {
  console.log('✅ Tren encontrado:', tren.name || tren.id);
  console.log('  Speed meta:', tren.meta?.speed);
  console.log('  Speed directo:', tren.speed);
  
  // Verificar dt actual
  const dtActual = window.app._currentDt;
  console.log('  DT actual:', dtActual?.toFixed(4));
  
  // Calcular velocidad resultante
  const speed = tren.meta?.speed || tren.speed || 40;
  const dt = dtActual || 0.016;
  const velocity = 2.5 * speed * dt;
  
  console.log('%c📊 CÁLCULOS:', 'color: #ffff00; font-weight: bold');
  console.log('  Speed (del JSON):', speed);
  console.log('  DT (delta-time):', dt.toFixed(4));
  console.log('  Fórmula: 2.5 × speed × dt');
  console.log('  Resultado: 2.5 × ' + speed + ' × ' + dt.toFixed(4) + ' = ' + velocity.toFixed(4) + ' px/frame');
  
  // Monitorear durante 5 segundos
  console.log('%c📹 MONITOREANDO (5 segundos)...', 'color: #00ccff; font-weight: bold');
  
  let frameCount = 0;
  let lastLogged = 0;
  let velocities = [];
  
  const checkInterval = setInterval(() => {
    const current_dt = window.app._currentDt || 0.016;
    const current_speed = tren.meta?.speed || tren.speed || 40;
    const current_velocity = 2.5 * current_speed * current_dt;
    
    velocities.push(current_velocity);
    frameCount++;
    
    if (Date.now() - lastLogged > 1000) {
      console.log(`  Frame ${frameCount}: DT=${current_dt.toFixed(4)}, Velocity=${current_velocity.toFixed(2)}`);
      lastLogged = Date.now();
    }
    
    if (frameCount > 300) {  // ~5 segundos a 60fps
      clearInterval(checkInterval);
      const avgVelocity = velocities.reduce((a, b) => a + b) / velocities.length;
      console.log('%c✅ MONITOREO COMPLETADO', 'color: #00ff00; font-weight: bold');
      console.log('  Velocidad promedio:', avgVelocity.toFixed(4));
      console.log('  Min:', Math.min(...velocities).toFixed(4));
      console.log('  Max:', Math.max(...velocities).toFixed(4));
      
      window.EDITOR_VELOCITY = avgVelocity;  // Guardar para comparar
      console.log('%c👉 Copia este valor para comparar:', 'color: #ffff00');
      console.log('window.EDITOR_VELOCITY = ' + avgVelocity.toFixed(4));
    }
  }, 16);  // ~60fps
}
```

---

### PASO 4: Ejecuta ESTE código en la consola del VIEWER

```javascript
console.clear();
console.log('%c🎬 VIEWER DEBUG', 'color: #ff6600; font-weight: bold; font-size: 14px');
console.log('%c' + '='.repeat(50), 'color: #ff6600');

// El viewer usa una estructura diferente (app.js)
// Buscar el estado de animación
const state = window.state || window.appState;
const moverNode = state?.animation?.moverNodes?.[0];

if (!moverNode) {
  console.log('❌ No se encontró tren/mover en state');
} else {
  const tren = moverNode.elem;
  console.log('✅ Tren encontrado:', tren.name || tren.id);
  console.log('  Speed:', tren.speed);
  console.log('  Meta.speed:', tren.meta?.speed);
  
  // El dt en viewer es local en tick(), más difícil de acceder
  // Asumimos el dt estándar
  const dt = 0.016;  // ~60fps
  const speed = tren.speed || tren.meta?.speed || 40;
  const velocity = 2.5 * speed * dt;
  
  console.log('%c📊 CÁLCULOS:', 'color: #ffff00; font-weight: bold');
  console.log('  Speed (del JSON):', speed);
  console.log('  DT (estimado 60fps):', dt.toFixed(4));
  console.log('  Fórmula: 2.5 × speed × dt');
  console.log('  Resultado: 2.5 × ' + speed + ' × ' + dt.toFixed(4) + ' = ' + velocity.toFixed(4) + ' px/frame');
  
  console.log('%c⚠️ VERIFICACIÓN CRÍTICA:', 'color: #ff3333; font-weight: bold');
  
  // Buscar si hay un multiplicador extra
  if (tren.speedMultiplier) {
    console.log('  ⚠️ ENCONTRADO: speedMultiplier =', tren.speedMultiplier);
  }
  if (tren.animationSpeed) {
    console.log('  ⚠️ ENCONTRADO: animationSpeed =', tren.animationSpeed);
  }
  
  // Revisar meta
  if (tren.meta) {
    console.log('  Meta completa:', tren.meta);
  }
  
  window.VIEWER_VELOCITY = velocity;  // Guardar para comparar
  console.log('%c👉 Copia este valor para comparar:', 'color: #ffff00');
  console.log('window.VIEWER_VELOCITY = ' + velocity.toFixed(4));
}
```

---

## 📊 PASO 5: COMPARACIÓN

Después de ejecutar en ambas, verás algo como:

### RESULTADO ESPERADO (SINCRONIZADO):
```
EDITOR_VELOCITY = 6.40
VIEWER_VELOCITY = 6.40
Razón: 1.00  ✅ PERFECTO
```

### RESULTADO SI VUELA (3-5x más rápido):
```
EDITOR_VELOCITY = 6.40
VIEWER_VELOCITY = 19.20      ← 3x más rápido ❌
Razón: 3.00
```

Si ves una razón como 3.00, 4.00 o 5.00, significa que el `speed` es diferente o hay un multiplicador.

---

## 🔍 CÓMO INTERPRETAR LOS RESULTADOS

### Si `VIEWER_VELOCITY / EDITOR_VELOCITY ≈ 3`:
**Causa:** El `speed` en el JSON del viewer es **3x mayor**.
- **Solución:** Cambiar el `speed` en el JSON del viewer de 200 a 67 (aproximadamente).

### Si `VIEWER_VELOCITY / EDITOR_VELOCITY ≈ 4`:
**Causa:** El `speed` en el JSON del viewer es **4x mayor**.
- **Solución:** Cambiar el `speed` en el JSON del viewer de 200 a 50.

### Si `VIEWER_VELOCITY / EDITOR_VELOCITY ≈ 1`:
**Está sincronizado perfectamente.** ✅
- **Siguiente paso:** Verificar visualmente que se mueven igual.

---

## 📝 INFORMACIÓN ADICIONAL A RECOLECTAR

Mientras ejecutas el debug, anota también:

1. **¿Qué estructura tiene `window.state` en el viewer?**
   ```javascript
   console.log(Object.keys(window.state));
   ```

2. **¿Qué valor de `speed` tiene el tren?**
   ```javascript
   console.log(tren.speed, tren.meta?.speed);
   ```

3. **¿Hay `speedMultiplier` o `animationSpeed`?**
   ```javascript
   console.log(Object.keys(tren).filter(k => k.includes('speed')));
   ```

---

## 🎯 QUÉ HACEMOS CON ESTA INFORMACIÓN

**Una vez tengas los valores:**

1. Dime el ratio: `VIEWER_VELOCITY / EDITOR_VELOCITY`
2. Dime qué `speed` tiene cada tren
3. Dime si hay multiplicadores extra

**Con eso, te doy la LÍNEA EXACTA para cambiar en `previewer-2.0/app.js`.**

---

## ⚡ ALTERNATIVA RÁPIDA (si no quieres debuggear)

Si ya SABES que los trenes van ~4x más rápido, simplemente:

1. Ve a `previewer-2.0/app.js`
2. Busca la línea donde se carga el speed:
   ```javascript
   const speed = ...  // ~línea 1322
   ```
3. Divide por 4:
   ```javascript
   const speed = rawSpeed / 4;  // ← Ajuste rápido
   ```

Esto lo haría sincronizar temporalmente mientras encontramos la causa raíz.

---

**¡Ejecuta el debug y dime qué ves!** 🚀
