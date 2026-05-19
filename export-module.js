/**
 * ═══════════════════════════════════════════════════════════════════════
 *  EXPORT MODULE v2 — flow-diagram-creator  (Arkaios Edition)
 *  Fix: PNG/SVG ya no capturan el fondo/grid del editor
 *  Exporta SOLO los elementos, con fondo transparente y crop exacto
 * ═══════════════════════════════════════════════════════════════════════
 */
(function (global) {
  "use strict";

  const CFG = {
    padding: 20,          // px de margen alrededor del contenido
    pngScale: 2,          // resolución 2× para PNG
    gif: { fps: 15, durationSec: 3, quality: 8,
      lib: "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js",
      worker: "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js" },
    webp: { size: 512, fps: 15, durationSec: 3 }
  };

  /* ── ACCESO AL SISTEMA ────────────────────────────────────────────── */
  const sys = () => global.system || null;

  function getElements(selOnly = false) {
    const s = sys();
    if (!s) return [];
    if (selOnly && s.selectedElements && s.selectedElements.length > 0)
      return s.selectedElements;
    return s.elements || [];
  }

  function getProjectName() {
    const s = sys();
    return ((s && s.currentProjectName) || "creacion")
      .replace(/\s+/g, "-").toLowerCase();
  }

  /* ── RENDER LIMPIO A OFFSCREEN ────────────────────────────────────── */
  /**
   * Renderiza SOLO los elementos (sin fondo, sin grid) en un canvas offscreen
   * cuyo tamaño es exactamente el bounding-box de los elementos + padding.
   *
   * Estrategia: intercambia temporalmente system.canvas / system.ctx /
   * backgroundColor / showGrid / camera para un render limpio, luego restaura.
   *
   * @param {Array}   elements  - qué elementos renderizar
   * @param {number}  scale     - multiplicador de resolución (1 = zoom actual, 2 = 2×)
   * @returns {HTMLCanvasElement|null}
   */
  function renderClean(elements, scale = 1) {
    const s = sys();
    if (!s) return null;

    const elems = elements && elements.length ? elements : (s.elements || []);
    if (!elems.length) return null;

    // Bounding box en coordenadas mundo
    const bounds = s.getElementsBounds(elems);
    if (!bounds) return null;

    const pad   = CFG.padding;
    const z     = (s.camera.zoom || 1) * scale;
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxY - bounds.minY;

    if (worldW <= 0 || worldH <= 0) return null;

    const offW = Math.ceil(worldW * z + pad * 2 * scale);
    const offH = Math.ceil(worldH * z + pad * 2 * scale);

    const off = document.createElement("canvas");
    off.width  = offW;
    off.height = offH;

    // ── Guardar estado del sistema ──
    const origCanvas   = s.canvas;
    const origCtx      = s.ctx;
    const origBg       = s.backgroundColor;
    const origGrid     = s.showGrid;
    const origSelElems = s.selectedElements;
    const origCamX     = s.camera.x;
    const origCamY     = s.camera.y;
    const origCamZ     = s.camera.zoom;

    // ── Configurar modo exportación ──
    s.canvas           = off;
    s.ctx              = off.getContext("2d");
    s.backgroundColor  = null;   // fondo transparente
    s.showGrid         = false;
    s.selectedElements = [];     // oculta handles de selección
    s.camera.x         = (-bounds.minX * z) + pad * scale;
    s.camera.y         = (-bounds.minY * z) + pad * scale;
    s.camera.zoom      = z;

    // ── Renderizar ──
    try { s.render(); } catch (e) { console.error("[ExportModule] render error:", e); }

    // ── Restaurar estado ──
    s.canvas           = origCanvas;
    s.ctx              = origCtx;
    s.backgroundColor  = origBg;
    s.showGrid         = origGrid;
    s.selectedElements = origSelElems;
    s.camera.x         = origCamX;
    s.camera.y         = origCamY;
    s.camera.zoom      = origCamZ;

    // ── Forzar un re-render del canvas original para que no quede en negro ──
    requestAnimationFrame(() => { try { s.render(); } catch(_){} });

    return off;
  }

  /* ── HELPERS ──────────────────────────────────────────────────────── */
  function download(blobOrUrl, filename) {
    const url = (blobOrUrl instanceof Blob) ? URL.createObjectURL(blobOrUrl) : blobOrUrl;
    Object.assign(document.createElement("a"),
      { href: url, download: filename }).click();
    if (blobOrUrl instanceof Blob)
      setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function toast(msg, type = "info") {
    const c = { info:"#2196f3", success:"#00c975", warn:"#ff9800", error:"#f44336" };
    if (!document.getElementById("_emCSS")) {
      const s = document.createElement("style");
      s.id = "_emCSS";
      s.textContent = "@keyframes _emUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}";
      document.head.appendChild(s);
    }
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:999999;
      background:${c[type]};color:#fff;padding:11px 18px;border-radius:9px;
      font-size:13px;font-family:'Segoe UI',system-ui,sans-serif;
      box-shadow:0 6px 24px rgba(0,0,0,.4);animation:_emUp .2s ease both;
      pointer-events:none;max-width:340px;line-height:1.4;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  function hasAnim(elems) {
    return (elems || []).some(el => el && (
      el.isAnim || el.animColor ||
      el.active === "yes" || el.activo === "si" ||
      ["mover-metro","mover-male","mover-female"].includes(el.type)
    ));
  }

  /* ── 1. PNG ────────────────────────────────────────────────────────── */
  function exportPNG(name, selOnly = false) {
    const off = renderClean(getElements(selOnly), CFG.pngScale);
    if (!off) return toast("Sin elementos para exportar", "warn");
    download(off.toDataURL("image/png"), `${name}.png`);
    toast(`✅ PNG exportado — ${off.width}×${off.height}px`, "success");
  }

  /* ── 2. SVG vectorial ──────────────────────────────────────────────── */
  function exportSVG(name, selOnly = false) {
    const s = sys();
    const elems = getElements(selOnly);
    if (!s || !elems.length) return toast("Sin elementos para exportar como SVG", "warn");

    const bounds = s.getElementsBounds(elems);
    if (!bounds) return toast("No se pudo calcular el área de exportación", "error");

    const pad = CFG.padding;
    const vx  = bounds.minX - pad;
    const vy  = bounds.minY - pad;
    const vw  = (bounds.maxX - bounds.minX) + pad * 2;
    const vh  = (bounds.maxY - bounds.minY) + pad * 2;

    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg"`,
      `     width="${vw}" height="${vh}"`,
      `     viewBox="${vx} ${vy} ${vw} ${vh}">`
    ];

    const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    function elToSVG(el) {
      if (!el || el.visible === false) return;
      const fill   = el.fillColor || el.color || "none";
      const stroke = el.strokeColor || el.borderColor || "#000";
      const sw     = el.strokeWidth || el.lineWidth || 1;
      const op     = el.opacity !== undefined ? el.opacity : 1;
      const base   = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"`;

      switch (el.type) {
        case "rect": case "rectangle":
          lines.push(`  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.borderRadius||0}" ${base}/>`);
          break;
        case "circle": {
          const r = el.radius || el.width/2 || 20;
          lines.push(`  <circle cx="${el.x + r}" cy="${el.y + r}" r="${r}" ${base}/>`);
          break;
        }
        case "ellipse":
          lines.push(`  <ellipse cx="${el.x+(el.width||0)/2}" cy="${el.y+(el.height||0)/2}" rx="${(el.width||40)/2}" ry="${(el.height||40)/2}" ${base}/>`);
          break;
        case "line":
          lines.push(`  <line x1="${el.x}" y1="${el.y}" x2="${el.endX??el.x+(el.width||0)}" y2="${el.endY??el.y+(el.height||0)}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="round"/>`);
          break;
        case "path": case "polygon": case "pencil": case "freehand": case "route":
          if (Array.isArray(el.points) && el.points.length > 1) {
            const d = el.points.map((p,i) => `${i?"L":"M"}${p.x},${p.y}`).join(" ");
            const closePath = el.type === "polygon" ? " Z" : "";
            lines.push(`  <path d="${d}${closePath}" fill="${el.type==="polygon"?fill:"none"}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`);
          }
          break;
        case "text":
          lines.push(`  <text x="${el.x}" y="${el.y + (el.fontSize||14)}" font-size="${el.fontSize||14}" font-family="'Segoe UI',sans-serif" fill="${fill}" opacity="${op}">${esc(el.text||el.content||"")}</text>`);
          break;
        case "group":
          if (Array.isArray(el.elements)) {
            lines.push(`  <g id="${esc(el.id||"group")}">`);
            el.elements.forEach(elToSVG);
            lines.push(`  </g>`);
          }
          break;
        case "image":
          if (el.imageSrc) {
            lines.push(`  <image href="${el.imageSrc}" x="${el.x}" y="${el.y}" width="${el.width||100}" height="${el.height||100}" opacity="${op}"/>`);
          }
          break;
        default:
          lines.push(`  <!-- tipo "${esc(el.type||"?")}" no exportable como SVG -->`);
      }
    }

    elems.forEach(elToSVG);
    lines.push("</svg>");

    download(new Blob([lines.join("\n")], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
    toast("✅ SVG vectorial exportado (importable en Figma / Inkscape)", "success");
  }

  /* ── 3. .vector (JSON nativo) ──────────────────────────────────────── */
  function exportVector(name, selOnly = false) {
    const s = sys();
    const elems = getElements(selOnly);
    if (!elems.length) return toast("Sin elementos para exportar", "warn");
    const payload = {
      _format: "arkaios-vector-v1",
      _exported: new Date().toISOString(),
      name,
      camera: s ? s.camera : {},
      elements: elems
    };
    download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${name}.vector`);
    toast("✅ Archivo .vector exportado", "success");
  }

  /* ── 4. GIF animado ────────────────────────────────────────────────── */
  let _gifLoaded = false;
  function loadGifJs(cb) {
    if (_gifLoaded || global.GIF) { _gifLoaded = true; cb(); return; }
    const s = document.createElement("script");
    s.src = CFG.gif.lib;
    s.onload = () => { _gifLoaded = true; cb(); };
    s.onerror = () => toast("No se pudo cargar gif.js", "error");
    document.head.appendChild(s);
  }

  function exportGIF(name, selOnly = false) {
    const elems = getElements(selOnly);
    if (!elems.length) return toast("Sin elementos para exportar", "warn");

    toast("⏳ Capturando frames para GIF...", "info");
    loadGifJs(() => {
      // Captura el primer frame para conocer dimensiones
      const first = renderClean(elems, 1);
      if (!first) return toast("Error al renderizar frames", "error");

      const total = CFG.gif.fps * CFG.gif.durationSec;
      const delay = Math.round(1000 / CFG.gif.fps);

      const gif = new global.GIF({
        workers: 2, quality: CFG.gif.quality,
        workerScript: CFG.gif.worker,
        width: first.width, height: first.height,
        transparent: 0x00000000
      });

      let f = 0;
      const next = () => {
        if (f >= total) { toast("🔄 Procesando GIF...", "info"); gif.render(); return; }
        requestAnimationFrame(() => {
          const frame = renderClean(elems, 1);
          if (frame) gif.addFrame(frame, { copy: true, delay });
          f++; next();
        });
      };
      gif.on("finished", blob => {
        download(blob, `${name}.gif`);
        toast("✅ GIF animado listo", "success");
      });
      gif.on("error", e => toast("Error GIF: " + e, "error"));
      next();
    });
  }

  /* ── 5. WebP estático (WhatsApp Sticker 512×512) ───────────────────── */
  function exportWebPStatic(name, selOnly = false) {
    const elems = getElements(selOnly);
    if (!elems.length) return toast("Sin elementos para exportar", "warn");

    const src = renderClean(elems, 1);
    if (!src) return toast("Error al renderizar", "error");

    const sz = CFG.webp.size;
    const off = document.createElement("canvas");
    off.width = off.height = sz;
    const ctx = off.getContext("2d");

    const ratio = Math.min(sz / src.width, sz / src.height);
    const dw = src.width * ratio, dh = src.height * ratio;
    ctx.clearRect(0, 0, sz, sz);
    ctx.drawImage(src, (sz-dw)/2, (sz-dh)/2, dw, dh);

    download(off.toDataURL("image/webp", 0.9), `${name}.webp`);
    toast("✅ Sticker WhatsApp estático (512×512 WebP)", "success");
  }

  /* ── 6. WebP animado (WhatsApp Animated Sticker) ───────────────────── */
  function exportWebPAnimated(name, selOnly = false) {
    const elems = getElements(selOnly);
    if (!elems.length) return toast("Sin elementos para exportar", "warn");
    if (!HTMLCanvasElement.prototype.captureStream)
      return toast("captureStream no disponible — usa Chrome/Edge", "warn");

    const sz = CFG.webp.size;
    const live = document.createElement("canvas");
    live.width = live.height = sz;
    const ctx = live.getContext("2d");

    let running = true;
    const loop = () => {
      if (!running) return;
      const frame = renderClean(elems, 1);
      if (frame) {
        const ratio = Math.min(sz/frame.width, sz/frame.height);
        const dw = frame.width*ratio, dh = frame.height*ratio;
        ctx.clearRect(0,0,sz,sz);
        ctx.drawImage(frame,(sz-dw)/2,(sz-dh)/2,dw,dh);
      }
      requestAnimationFrame(loop);
    };
    loop();

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(live.captureStream(CFG.webp.fps), { mimeType: mime });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      running = false;
      const blob = new Blob(chunks, { type: mime });
      download(blob, `${name}.webp`);
      const kb = Math.round(blob.size/1024);
      toast(`✅ Sticker animado: ${kb}KB ${kb>500?"⚠️ >500KB":"✓"}`, kb>500?"warn":"success");
    };

    rec.start();
    toast(`⏳ Grabando ${CFG.webp.durationSec}s...`, "info");
    setTimeout(() => rec.stop(), CFG.webp.durationSec * 1000);
  }

  /* ── MODAL ─────────────────────────────────────────────────────────── */
  function openModal() {
    let modal = document.getElementById("_arkModal");
    if (modal) { modal.style.display = "flex"; return; }

    const s = sys();
    const hasSel = s && s.selectedElements && s.selectedElements.length > 0;
    const allElems = getElements(false);
    const selElems = getElements(true);
    const anim = hasAnim(allElems);
    const name = getProjectName;

    modal = document.createElement("div");
    modal.id = "_arkModal";
    modal.style.cssText = `position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,.82);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      font-family:'Segoe UI',system-ui,sans-serif;`;

    modal.innerHTML = `
      <div style="background:#12121e;border:1px solid #2a2a3e;border-radius:14px;
        padding:26px 28px;width:400px;box-shadow:0 28px 72px rgba(0,0,0,.7);">

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="color:#e0e0ff;margin:0;font-size:15px;font-weight:600">📤 Exportar creación</h2>
          <button id="_arkClose" style="background:none;border:none;color:#555;font-size:20px;cursor:pointer">✕</button>
        </div>

        ${hasSel ? `
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="_arkScope active" data-scope="all"
            style="flex:1;padding:6px;border-radius:6px;border:1px solid #333;background:#1e3060;color:#aac4ff;font-size:12px;cursor:pointer">
            📄 Todo el proyecto
          </button>
          <button class="_arkScope" data-scope="sel"
            style="flex:1;padding:6px;border-radius:6px;border:1px solid #333;background:#1a1a2e;color:#666;font-size:12px;cursor:pointer">
            ✂️ Solo selección (${selElems.length})
          </button>
        </div>` : ""}

        ${anim ? `<div style="background:#0d2b1a;border:1px solid #1d6e3e;border-radius:6px;
          padding:7px 11px;margin-bottom:12px;font-size:11px;color:#2ecc71">
          ⚡ Animación detectada — GIF y Sticker Animado disponibles
        </div>` : ""}

        <div style="display:flex;flex-direction:column;gap:8px" id="_arkBtns">
          <button class="_ark-btn" data-f="png" style="background:#1565c0">🖼️ PNG  <em>alta resolución · fondo transparente</em></button>
          <button class="_ark-btn" data-f="svg" style="background:#6a1b9a">✏️ SVG vectorial  <em>Figma · Inkscape · Illustrator</em></button>
          <button class="_ark-btn" data-f="vector" style="background:#e65100">📦 .vector  <em>nativo · re-importable</em></button>
          <hr style="border-color:#222;margin:2px 0"/>
          <button class="_ark-btn" data-f="gif" style="background:${anim?"#00695c":"#222"};${anim?"":"opacity:.45"}">
            🎞️ GIF animado  <em>${anim?"15fps · 3 seg":"sin animación detectada"}</em>
          </button>
          <button class="_ark-btn" data-f="webp-s" style="background:#b71c1c">📱 Sticker WA estático  <em>512×512 WebP</em></button>
          <button class="_ark-btn" data-f="webp-a" style="background:${anim?"#b71c1c":"#222"};${anim?"":"opacity:.45"}">
            📱 Sticker WA animado  <em>${anim?"512×512 · máx 500KB":"sin animación"}</em>
          </button>
        </div>

        <p style="margin:14px 0 0;font-size:10px;color:#444;text-align:center">
          💡 PNG y SVG exportan <strong style="color:#666">solo el diseño</strong>, sin fondo ni grid del editor
        </p>
      </div>
      <style>
        ._ark-btn{color:#fff;border:none;padding:10px 14px;border-radius:7px;cursor:pointer;
          font-size:12.5px;text-align:left;width:100%;font-family:inherit;
          display:flex;align-items:center;gap:6px;transition:filter .15s;}
        ._ark-btn em{opacity:.6;font-style:normal;font-size:10.5px;margin-left:auto;}
        ._ark-btn:not([style*="opacity:.45"]):hover{filter:brightness(1.18);}
        ._arkScope.active{background:#1e3060!important;color:#aac4ff!important;border-color:#2a4080!important;}
      </style>
    `;

    document.body.appendChild(modal);

    let selOnly = false;

    modal.querySelectorAll("._arkScope").forEach(btn => {
      btn.onclick = () => {
        selOnly = btn.dataset.scope === "sel";
        modal.querySelectorAll("._arkScope").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    document.getElementById("_arkClose").onclick = () => { modal.style.display="none"; };
    modal.onclick = e => { if (e.target===modal) modal.style.display="none"; };

    modal.querySelectorAll("._ark-btn").forEach(btn => {
      if (btn.style.cssText.includes("opacity:.45")) return;
      btn.onclick = () => {
        modal.style.display = "none";
        const n = getProjectName();
        const map = { png: exportPNG, svg: exportSVG, vector: exportVector,
                      gif: exportGIF, "webp-s": exportWebPStatic, "webp-a": exportWebPAnimated };
        (map[btn.dataset.f] || (() => {}))(n, selOnly);
      };
    });
  }

  /* ── HOOK al botón ─────────────────────────────────────────────────── */
  function hookButton() {
    const wait = setInterval(() => {
      const btn = document.getElementById("btn-export");
      if (!btn) return;
      clearInterval(wait);
      const nb = btn.cloneNode(true);
      btn.parentNode.replaceChild(nb, btn);
      nb.addEventListener("click", openModal);
      console.info("[ExportModule v2] ✅ Conectado a #btn-export");
    }, 300);
  }

  /* ── LISTENERS DEL MENÚ CONTEXTUAL ───────────────────────────────── */
  function hookContextMenu() {
    const wait = setInterval(() => {
      if (!document.getElementById("ctx-export-png")) return;
      clearInterval(wait);

      const n = () => getProjectName();
      const sel = () => !!(sys() && sys().selectedElements && sys().selectedElements.length > 0);

      document.getElementById("ctx-export-png")
        ?.addEventListener("click", () => exportPNG(n(), sel()));
      document.getElementById("ctx-export-svg")
        ?.addEventListener("click", () => exportSVG(n(), sel()));
      document.getElementById("ctx-export-vector")
        ?.addEventListener("click", () => exportVector(n(), sel()));
      document.getElementById("ctx-export-webp")
        ?.addEventListener("click", () => exportWebPStatic(n(), sel()));
      document.getElementById("ctx-export-webp-anim")
        ?.addEventListener("click", () => exportWebPAnimated(n(), sel()));
      document.getElementById("ctx-export-gif")
        ?.addEventListener("click", () => exportGIF(n(), sel()));

      console.info("[ExportModule v2] ✅ Hooks del menú contextual activos");
    }, 500);
  }

  /* ── API PÚBLICA ────────────────────────────────────────────────────── */
  global.ExportModule = {
    modal: openModal,
    png:   (n, s) => exportPNG(n || getProjectName(), s),
    svg:   (n, s) => exportSVG(n || getProjectName(), s),
    vector:(n, s) => exportVector(n || getProjectName(), s),
    gif:   (n, s) => exportGIF(n || getProjectName(), s),
    webpStatic:   (n, s) => exportWebPStatic(n || getProjectName(), s),
    webpAnimated: (n, s) => exportWebPAnimated(n || getProjectName(), s),
    renderClean   // expuesta para debug
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { hookButton(); hookContextMenu(); });
  } else {
    hookButton();
    hookContextMenu();
  }

  console.info("[ExportModule v2] 🚀 PNG/SVG exportan solo el diseño — sin fondo ni grid");

})(window);
