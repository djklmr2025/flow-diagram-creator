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


  /* ── VIDEO EXPORT (WebM via MediaRecorder) ─────────────────────────────
   *  Duración calculada automáticamente:
   *  Para cada mover animado, calcula la longitud de su ruta y la divide
   *  entre la velocidad del metro → tiempo de un recorrido ida y vuelta.
   *  Usa el máximo entre todos los movers (≥ 3 seg, ≤ 60 seg).
   * ───────────────────────────────────────────────────────────────────── */
  function calcVideoDuration() {
    const s = sys();
    if (!s || !s.elements || !s.elements.length) return 5;

    const movers = s.elements.filter(e => e && e.type === 'mover' && e.active !== false);
    if (!movers.length) return 5;

    // Build route map: id → points array
    const routes = {};
    s.elements.forEach(e => {
      if (e && e.routeRole && Array.isArray(e.points)) routes[e.id] = e.points;
    });

    // Calculate route length from point array
    function routeLen(pts) {
      let len = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i-1].x;
        const dy = pts[i].y - pts[i-1].y;
        len += Math.sqrt(dx*dx + dy*dy);
      }
      return len;
    }

    let maxSec = 3;
    movers.forEach(m => {
      const pts  = routes[m.routeId];
      const spd  = Math.max(m.speed || 40, 1);   // px/s en coords mundo
      if (!pts || pts.length < 2) return;

      // world length / (speed * zoom) × 2 for round trip
      const worldLen  = routeLen(pts);
      const zoom      = (s.camera && s.camera.zoom) || 1;
      // speed is in screen pixels per second relative to zoom=1
      const screenSpd = spd * zoom;
      const oneway    = worldLen * zoom / screenSpd;
      const roundtrip = oneway * 2;

      if (roundtrip > maxSec) maxSec = roundtrip;
    });

    // Clamp to [3, 60] seconds
    return Math.min(Math.max(Math.ceil(maxSec), 3), 60);
  }

  function exportVideo(name, selOnly = false) {
    const canvas = getCanvas();
    if (!canvas) return toast('Canvas no encontrado', 'error');
    if (!canvas.captureStream) return toast('Tu navegador no soporta captureStream. Usa Chrome/Edge.', 'warn');

    const durationSec = calcVideoDuration();
    const fps         = 30;

    // Pick best supported codec
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    const mime = mimeTypes.find(m => {
      try { return MediaRecorder.isTypeSupported(m); } catch(_){ return false; }
    }) || 'video/webm';

    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';

    toast(`⏳ Grabando ${durationSec}s de video (${Math.round(fps)}fps)...`, 'info');

    // Grab the live canvas stream directly — no renderClean needed
    // (we want the real animation, not a static snapshot)
    let stream;
    try {
      stream = canvas.captureStream(fps);
    } catch(e) {
      return toast('Error al capturar el canvas: ' + e.message, 'error');
    }

    const chunks = [];
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    } catch(e) {
      return toast('MediaRecorder no pudo iniciarse: ' + e.message, 'error');
    }

    rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      download(blob, `${name}.${ext}`);
      const mb = (blob.size / 1048576).toFixed(1);
      toast(`✅ Video listo — ${durationSec}s · ${mb} MB · ${ext.toUpperCase()}`, 'success');
    };

    rec.onerror = e => toast('Error de grabación: ' + (e.error?.message || e), 'error');

    rec.start(100); // chunk every 100ms

    // Progress toasts
    const steps = [0.25, 0.5, 0.75].map(p => ({
      t: durationSec * p * 1000,
      msg: `⏺ Grabando... ${Math.round(p * 100)}%`
    }));
    steps.forEach(s => setTimeout(() => {
      if (rec.state === 'recording') toast(s.msg, 'info');
    }, s.t));

    setTimeout(() => {
      if (rec.state === 'recording') rec.stop();
    }, durationSec * 1000);
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
                    <button class="_ark-btn" data-f="html" style="background:#00695c">🌐 HTML standalone  <em>visor interactivo offline</em></button>
          <hr style="border-color:#222;margin:2px 0"/>
          <button class="_ark-btn" data-f="webp-s" style="background:#b71c1c">📱 Sticker WA estático  <em>512×512 WebP</em></button>
          <button class="_ark-btn" data-f="video" style="background:${anim?"#1a5276":"#222"};${anim?"":"opacity:.45"}">
            🎬 Exportar Video  <em>${anim?"WebM · duración auto":"sin animación"}</em>
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
                      "webp-s": exportWebPStatic, "video": exportVideo, "html": exportHTML };
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
      document.getElementById("ctx-export-html")
        ?.addEventListener("click", () => exportHTML(n(), sel()));
      document.getElementById("ctx-export-video")
        ?.addEventListener("click", () => exportVideo(n(), sel()));

      console.info("[ExportModule v2] ✅ Hooks del menú contextual activos");
    }, 500);
  }


  /* ── 6. HTML Standalone (Viewer Autónomo) ────────────────────────── */
  async function exportHTML(name, selOnly = false) {
    const s = sys();
    const elems = getElements(selOnly);
    if (!elems.length) return toast("Sin elementos para exportar", "warn");

    toast("Generando HTML standalone...", "info");

    try {
      // 1. Fetch current index.html
      const resp = await fetch(window.location.href);
      if (!resp.ok) throw new Error("No se pudo obtener el HTML");
      let html = await resp.text();

      // 2. Build the exact state to embed
      const payload = {
        _format: "arkaios-vector-v1",
        _exported: new Date().toISOString(),
        name,
        camera: s ? s.camera : {},
        elements: elems,
        // Enforce deck mode or sticker mode if desired. We use preview/sticker setup for standalone
      };

      const jsonStr = JSON.stringify(payload);
      const b64Data = btoa(encodeURIComponent(jsonStr)); // Safe embedding

      // 3. Inject the payload and auto-loader script right before </body>
      const injection = `
      <!-- ========================================== -->
      <!-- EMBEDDED PROJECT PAYLOAD (STANDALONE MODE) -->
      <!-- ========================================== -->
      <script>
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            if (!window.system) return;
            try {
              const b64 = "${b64Data}";
              const jsonStr = decodeURIComponent(atob(b64));
              const data = JSON.parse(jsonStr);

              // Force viewer mode
              const url = new URL(window.location.href);
              if (!url.searchParams.has('mode')) {
                url.searchParams.set('mode', 'sticker');
                window.history.replaceState({}, '', url);
              }

              window.system.applyLoadedProject(data, {
                source: 'html-embed',
                isDeck: false,
                autoFit: true
              });

              const rb = document.getElementById('ribbon');
              if(rb) rb.style.display = 'none';

              console.log("✅ Proyecto embebido cargado exitosamente");
            } catch (e) {
              console.error("❌ Error al cargar proyecto embebido:", e);
            }
          }, 800); // Give it time to init
        });
      </script>
      `;

      html = html.replace('</body>', injection + '\n</body>');

      // 4. Trigger download
      const blob = new Blob([html], { type: 'text/html' });
      download(blob, `${name}.html`);
      toast("✅ HTML standalone exportado", "success");

    } catch (error) {
      console.error(error);
      toast("Error al generar HTML", "error");
    }
  }

  /* ── API PÚBLICA ────────────────────────────────────────────────────── */
  global.ExportModule = {
    modal: openModal,
    png:   (n, s) => exportPNG(n || getProjectName(), s),
    svg:   (n, s) => exportSVG(n || getProjectName(), s),
    vector:(n, s) => exportVector(n || getProjectName(), s),
    webpStatic:   (n, s) => exportWebPStatic(n || getProjectName(), s),
    video: (n, s) => exportVideo(n || getProjectName(), s),
    html:  (n, s) => exportHTML(n || getProjectName(), s),
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

/* ══════════════════════════════════════════════════════════════════
   PANEL DE ELEMENTOS POR TIPO — "pestañas"
   Muestra todos los elementos agrupados por tipo, permite
   seleccionarlos, filtrarlos y navegar por el canvas hasta ellos.
══════════════════════════════════════════════════════════════════ */
(function initElemTabs() {

  const ICONS = {
    rect:'▭', rectangle:'▭', circle:'●', ellipse:'◎',
    line:'→', route:'🛤️', path:'✏️', pencil:'✏️', freehand:'✏️',
    text:'T', image:'🖼️', video:'🎞️', group:'⊞',
    'mover-metro':'🚇', 'mover-male':'🚹', 'mover-female':'🚺',
    polygon:'⬟', shape:'⬟', triangle:'△', diamond:'◇',
    star5:'★', star6:'★', gear:'⚙️',
    poi:'📍', portal:'🌀', default:'◻'
  };

  const TYPE_LABELS = {
    rect:'Rectángulos', rectangle:'Rectángulos', circle:'Círculos',
    ellipse:'Elipses', line:'Líneas', route:'Rutas', path:'Trazos',
    pencil:'Trazos', freehand:'Trazos', text:'Textos', image:'Imágenes',
    video:'Videos', group:'Grupos', 'mover-metro':'Metros',
    'mover-male':'Personas H', 'mover-female':'Personas M',
    polygon:'Polígonos', shape:'Formas', poi:'Puntos Info',
    portal:'Portales', gear:'Engranes'
  };

  function icon(type) { return ICONS[type] || ICONS.default; }
  function label(type) { return TYPE_LABELS[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Sin tipo'); }

  function getAll() {
    const s = window.system;
    return (s && s.elements) ? s.elements : [];
  }

  function getTypes(elems) {
    const seen = new Set();
    const types = [];
    for (const el of elems) {
      const t = el.type || 'unknown';
      // Normalize similar types
      const norm = (['rect','rectangle'].includes(t)) ? 'rect'
                 : (['pencil','freehand','path'].includes(t)) ? 'path'
                 : t;
      if (!seen.has(norm)) { seen.add(norm); types.push(norm); }
    }
    return types;
  }

  function normType(t) {
    return (['rect','rectangle'].includes(t)) ? 'rect'
         : (['pencil','freehand','path'].includes(t)) ? 'path'
         : t || 'unknown';
  }

  let currentType = 'all';
  let searchQuery = '';

  function render() {
    const panel = document.getElementById('elem-tabs-panel');
    if (!panel || !panel.classList.contains('open')) return;

    const allElems = getAll();
    const types    = getTypes(allElems);

    // ── Rebuild tabs ──
    const tabsRow = document.getElementById('et-tabs-row');
    if (tabsRow) {
      tabsRow.innerHTML = '<div class="et-tab' + (currentType==='all'?' active':'') + '" data-type="all">Todo (' + allElems.length + ')</div>';
      for (const t of types) {
        const count = allElems.filter(e => normType(e.type) === t).length;
        const active = currentType === t ? ' active' : '';
        tabsRow.innerHTML += `<div class="et-tab${active}" data-type="${t}">${icon(t)} ${label(t)} (${count})</div>`;
      }
      tabsRow.querySelectorAll('.et-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          currentType = tab.dataset.type;
          render();
        });
      });
    }

    // ── Rebuild list ──
    const list = document.getElementById('et-list');
    if (!list) return;

    let filtered = currentType === 'all'
      ? allElems
      : allElems.filter(e => normType(e.type) === currentType);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.text && e.text.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q)) ||
        (e.id && String(e.id).includes(q))
      );
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="et-empty">Sin elementos' + (searchQuery ? ' que coincidan' : '') + '</div>';
      return;
    }

    const s = window.system;
    const selIds = new Set((s && s.selectedElements || []).map(e => e.id));

    list.innerHTML = '';
    filtered.forEach((el, i) => {
      const isSelected = selIds.has(el.id);
      const name = el.name || el.text || label(el.type || 'unknown') + ' #' + i;
      const div = document.createElement('div');
      div.className = 'et-item' + (isSelected ? ' selected' : '');
      div.innerHTML = `<span>${icon(el.type || 'unknown')}</span><span class="et-name" title="${name}">${name}</span><span class="et-idx">#${i}</span>`;
      div.addEventListener('click', e => {
        if (!s) return;
        if (e.shiftKey) {
          // Multi-select
          if (isSelected) s.selectedElements = s.selectedElements.filter(x => x.id !== el.id);
          else s.selectedElements = [...(s.selectedElements || []), el];
        } else {
          s.selectedElements = [el];
          // Pan camera to element
          if (s.camera && el.x !== undefined) {
            const cvs = s.canvas;
            s.camera.x = (cvs ? cvs.width/2 : 400) - el.x * s.camera.zoom;
            s.camera.y = (cvs ? cvs.height/2 : 300) - el.y * s.camera.zoom;
          }
        }
        if (s.render) s.render();
        render(); // refresh selection state
      });
      list.appendChild(div);
    });
  }

  function openPanel() {
    const panel = document.getElementById('elem-tabs-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) render();
  }

  // Close button
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('et-close-btn')
      ?.addEventListener('click', () => {
        document.getElementById('elem-tabs-panel')?.classList.remove('open');
      });

    document.getElementById('et-search-input')
      ?.addEventListener('input', e => {
        searchQuery = e.target.value.trim();
        render();
      });

    // Auto-refresh when panel is open
    setInterval(() => render(), 1000);
  });

  // Hook "Vista → Elementos" in ribbon (added by ribbon JS)
  // Also expose globally
  window.ElemTabsPanel = { open: openPanel, render };

  // Add menu item to Vista dropdown
  const waitVista = setInterval(() => {
    const vistaMenu = document.querySelector('#rbm-vista .rb-dropdown');
    if (!vistaMenu) return;
    clearInterval(waitVista);

    const sep = document.createElement('div');
    sep.className = 'rb-sep';
    const item = document.createElement('div');
    item.className = 'rb-item';
    item.id = 'rb-elem-tabs';
    item.innerHTML = '🗂️ Panel de Elementos';
    item.addEventListener('click', openPanel);
    vistaMenu.appendChild(sep);
    vistaMenu.appendChild(item);
  }, 400);

})();

/* ══════════════════════════════════════════════════════════════════
   AIDA — Asistente IA nativa del editor
   Chat flotante con contexto del canvas en tiempo real
══════════════════════════════════════════════════════════════════ */
(function initAIDA() {

  // ── CSS ────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #aida-btn {
      position:fixed;bottom:24px;left:24px;z-index:9998;
      width:48px;height:48px;border-radius:50%;
      background:linear-gradient(135deg,#e94560,#0f3460);
      border:none;cursor:pointer;font-size:22px;
      box-shadow:0 4px 20px rgba(233,69,96,.5);
      transition:transform .2s,box-shadow .2s;
      display:flex;align-items:center;justify-content:center;
    }
    #aida-btn:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(233,69,96,.7);}
    #aida-btn .aida-pulse {
      position:absolute;width:100%;height:100%;border-radius:50%;
      background:rgba(233,69,96,.3);animation:aidaPulse 2s ease-out infinite;
    }
    @keyframes aidaPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}

    #aida-panel {
      position:fixed;bottom:84px;left:24px;z-index:9998;
      width:320px;height:440px;
      background:#12121e;border:1px solid #2a2a4e;
      border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.7);
      display:none;flex-direction:column;overflow:hidden;
      font-family:'Segoe UI',system-ui,sans-serif;
    }
    #aida-panel.open{display:flex;}

    #aida-header {
      display:flex;align-items:center;gap:8px;
      padding:12px 14px;
      background:linear-gradient(90deg,#0f1e3a,#1a0a2a);
      border-bottom:1px solid #2a2a4e;flex-shrink:0;
    }
    #aida-header .aida-avatar {
      width:28px;height:28px;border-radius:50%;
      background:linear-gradient(135deg,#e94560,#7b2fff);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;flex-shrink:0;
    }
    #aida-header .aida-info { flex:1;min-width:0; }
    #aida-header .aida-name {font-size:13px;font-weight:600;color:#e0e0ff;}
    #aida-header .aida-status {font-size:10px;color:#556;display:flex;align-items:center;gap:4px;}
    #aida-header .aida-dot {
      width:6px;height:6px;border-radius:50%;background:#00c975;
      animation:aidaBlink 2s ease-in-out infinite;
    }
    @keyframes aidaBlink{0%,100%{opacity:1}50%{opacity:.3}}
    #aida-close {background:none;border:none;color:#445;cursor:pointer;font-size:16px;padding:0;}
    #aida-close:hover{color:#e94560;}

    #aida-ctx {
      padding:6px 12px;background:#0a0a18;
      border-bottom:1px solid #1a1a3a;font-size:10px;color:#446;
      flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }

    #aida-messages {
      flex:1;overflow-y:auto;padding:12px;
      display:flex;flex-direction:column;gap:10px;
      scrollbar-width:thin;scrollbar-color:#1e2a4e transparent;
    }
    .aida-msg {
      max-width:85%;font-size:12px;line-height:1.5;
      padding:8px 11px;border-radius:10px;word-break:break-word;
    }
    .aida-msg.user {
      align-self:flex-end;background:#1e3060;color:#cce;
      border-radius:10px 10px 2px 10px;
    }
    .aida-msg.aida {
      align-self:flex-start;background:#1a1a2e;color:#ddd;
      border-radius:10px 10px 10px 2px;border-left:2px solid #e94560;
    }
    .aida-msg.typing {
      align-self:flex-start;background:#1a1a2e;
      padding:10px 14px;border-radius:10px;
    }
    .aida-typing-dots span {
      display:inline-block;width:5px;height:5px;border-radius:50%;
      background:#e94560;margin:0 2px;
      animation:aidaDot .8s ease-in-out infinite;
    }
    .aida-typing-dots span:nth-child(2){animation-delay:.15s;}
    .aida-typing-dots span:nth-child(3){animation-delay:.3s;}
    @keyframes aidaDot{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}

    #aida-quick {
      display:flex;gap:5px;padding:6px 10px;
      flex-wrap:wrap;border-top:1px solid #1a1a3a;flex-shrink:0;
    }
    .aida-quick-btn {
      background:#0f1e3a;border:1px solid #1e2a4e;border-radius:12px;
      color:#889;font-size:10px;cursor:pointer;padding:3px 8px;
      transition:all .15s;white-space:nowrap;
    }
    .aida-quick-btn:hover{background:#1e3060;color:#aac4ff;border-color:#2a4090;}

    #aida-input-row {
      display:flex;gap:6px;padding:10px 12px;
      border-top:1px solid #1a1a3a;flex-shrink:0;
      background:#0c0c1c;
    }
    #aida-input {
      flex:1;background:#1a1a2e;border:1px solid #2a2a4e;
      border-radius:8px;color:#ddd;font-size:12px;
      padding:7px 10px;font-family:inherit;resize:none;
      max-height:80px;overflow-y:auto;
      scrollbar-width:none;line-height:1.4;
    }
    #aida-input:focus{outline:none;border-color:#e94560;}
    #aida-send {
      width:32px;height:32px;border-radius:8px;
      background:#e94560;border:none;cursor:pointer;
      color:#fff;font-size:14px;flex-shrink:0;
      transition:filter .15s;align-self:flex-end;
    }
    #aida-send:hover{filter:brightness(1.2);}
    #aida-send:disabled{opacity:.4;cursor:not-allowed;}
  `;
  document.head.appendChild(style);

  // ── HTML ───────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'aida-btn';
  btn.title = 'AIDA — Asistente IA';
  btn.innerHTML = '<div class="aida-pulse"></div>🤖';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'aida-panel';
  panel.innerHTML = `
    <div id="aida-header">
      <div class="aida-avatar">🤖</div>
      <div class="aida-info">
        <div class="aida-name">AIDA</div>
        <div class="aida-status"><span class="aida-dot"></span> Asistente de diseño IA</div>
      </div>
      <button id="aida-close">✕</button>
    </div>
    <div id="aida-ctx">📄 Canvas vacío</div>
    <div id="aida-messages">
      <div class="aida-msg aida">¡Hola! Soy AIDA, tu asistente de diseño. Puedo ayudarte con tu diagrama, sugerir elementos, explicar funciones o describir lo que tienes en el canvas. ¿En qué trabajamos hoy?</div>
    </div>
    <div id="aida-quick">
      <button class="aida-quick-btn" data-q="¿Qué elementos tengo en el canvas?">📋 Ver canvas</button>
      <button class="aida-quick-btn" data-q="Sugiere cómo mejorar el diseño">✨ Mejorar</button>
      <button class="aida-quick-btn" data-q="¿Cómo exporto mi trabajo?">💾 Exportar</button>
      <button class="aida-quick-btn" data-q="¿Qué herramientas tiene el editor?">🛠️ Ayuda</button>
    </div>
    <div id="aida-input-row">
      <textarea id="aida-input" placeholder="Escribe a AIDA..." rows="1"></textarea>
      <button id="aida-send">➤</button>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Logic ──────────────────────────────────────────────────────
  let isOpen = false;
  let isThinking = false;

  function getCanvasCtx() {
    const s = window.system;
    if (!s || !s.elements || !s.elements.length)
      return { elemCount: 0, types: [], projectName: 'Sin título' };
    const types = [...new Set(s.elements.map(e => e.type || 'unknown'))];
    return {
      elemCount: s.elements.length,
      types,
      projectName: s.currentProjectName || 'Sin título',
      zoom: s.camera ? Math.round((s.camera.zoom||1)*100) + '%' : '100%',
      selectedCount: s.selectedElements ? s.selectedElements.length : 0
    };
  }

  function updateCtxBar() {
    const ctx = getCanvasCtx();
    const ctxEl = document.getElementById('aida-ctx');
    if (ctxEl) {
      ctxEl.textContent = ctx.elemCount === 0
        ? '📄 Canvas vacío'
        : `📄 ${ctx.projectName} · ${ctx.elemCount} elementos · ${ctx.types.slice(0,3).join(', ')}${ctx.types.length > 3 ? '…' : ''}`;
    }
  }

  function addMsg(text, role) {
    const msgs = document.getElementById('aida-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'aida-msg ' + role;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const msgs = document.getElementById('aida-messages');
    if (!msgs) return null;
    const div = document.createElement('div');
    div.className = 'aida-msg typing';
    div.id = 'aida-typing';
    div.innerHTML = '<div class="aida-typing-dots"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendMessage(text) {
    if (!text.trim() || isThinking) return;
    isThinking = true;

    const sendBtn = document.getElementById('aida-send');
    const inputEl = document.getElementById('aida-input');
    if (sendBtn) sendBtn.disabled = true;
    if (inputEl) inputEl.value = '';

    addMsg(text, 'user');
    const typingEl = showTyping();

    try {
      const r = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, canvasContext: getCanvasCtx() })
      });
      const data = await r.json();
      typingEl?.remove();
      addMsg(data.reply || 'Sin respuesta', 'aida');
    } catch (err) {
      typingEl?.remove();
      addMsg('⚠️ Error de conexión. Verifica que el servidor esté activo.', 'aida');
    }

    isThinking = false;
    if (sendBtn) sendBtn.disabled = false;
  }

  // ── Event listeners ────────────────────────────────────────────
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) updateCtxBar();
  });

  document.getElementById('aida-close')
    ?.addEventListener('click', () => { isOpen = false; panel.classList.remove('open'); });

  document.getElementById('aida-send')
    ?.addEventListener('click', () => {
      const v = document.getElementById('aida-input')?.value || '';
      sendMessage(v.trim());
    });

  document.getElementById('aida-input')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = e.target.value.trim();
        if (v) sendMessage(v);
      }
    });

  document.querySelectorAll('.aida-quick-btn').forEach(b => {
    b.addEventListener('click', () => sendMessage(b.dataset.q));
  });

  // Auto-update context bar
  setInterval(() => { if (isOpen) updateCtxBar(); }, 1500);

  console.info('[AIDA] 🤖 Asistente IA lista — /api/ai-assistant activo');
})();
