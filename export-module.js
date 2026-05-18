/**
 * ═══════════════════════════════════════════════════════════════════════
 *  EXPORT MODULE — flow-diagram-creator  (Arkaios Edition)
 *  Formatos: PNG · GIF animado · WebP/Sticker WA · SVG vectorial · .vector
 *  Se conecta automáticamente a window.system (FlowDiagramSystem)
 *  Autor del módulo: Claude (asistente de Anthropic) + djklmr2025
 * ═══════════════════════════════════════════════════════════════════════
 */
(function (global) {
  "use strict";

  /* ── CONFIG ─────────────────────────────────────────────────────────── */
  const CFG = {
    gif: {
      fps: 15,
      durationSec: 3,
      quality: 8,
      lib: "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js",
      worker: "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js"
    },
    webp: { size: 512, fps: 15, durationSec: 3 },
    png: { scale: 2 }
  };

  /* ── ACCESO AL SISTEMA ───────────────────────────────────────────────── */
  function sys() {
    return global.system || null;
  }
  function getCanvas() {
    const s = sys();
    return (s && s.canvas) || document.getElementById("main-canvas") || document.querySelector("canvas");
  }
  function getElements() {
    const s = sys();
    return (s && Array.isArray(s.elements) ? s.elements : []);
  }
  function getCamera() {
    const s = sys();
    return (s && s.camera) ? s.camera : { x: 0, y: 0, zoom: 1 };
  }
  function getProjectName() {
    const s = sys();
    return (s && s.currentProjectName) || global.currentProjectName || "creacion";
  }

  /* ── HELPERS ─────────────────────────────────────────────────────────── */
  function download(urlOrBlob, filename) {
    const url = (urlOrBlob instanceof Blob) ? URL.createObjectURL(urlOrBlob) : urlOrBlob;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    if (urlOrBlob instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function toast(msg, type = "info") {
    const colors = { info: "#2196f3", success: "#00c975", warn: "#ff9800", error: "#f44336" };
    const el = Object.assign(document.createElement("div"), {
      textContent: msg,
      style: `
        position:fixed;bottom:24px;right:24px;z-index:999999;
        background:${colors[type]};color:#fff;
        padding:11px 18px;border-radius:9px;font-size:13px;
        font-family:'Segoe UI',system-ui,sans-serif;letter-spacing:.2px;
        box-shadow:0 6px 24px rgba(0,0,0,.4);
        animation:_emFadeUp .2s ease both;pointer-events:none;
      `
    });
    if (!document.getElementById("_emCSS")) {
      const s = document.createElement("style");
      s.id = "_emCSS";
      s.textContent = "@keyframes _emFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}";
      document.head.appendChild(s);
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function hasAnimation() {
    return getElements().some(el =>
      el && (el.isAnim || el.animColor || el.active === "yes" ||
             el.activo === "si" || el.type === "mover-metro" ||
             el.type === "mover-male" || el.type === "mover-female")
    );
  }

  /* ── 1. PNG ──────────────────────────────────────────────────────────── */
  function exportPNG(name) {
    const canvas = getCanvas();
    if (!canvas) return toast("Canvas no encontrado", "error");

    const s = CFG.png.scale;
    const off = Object.assign(document.createElement("canvas"), {
      width: canvas.width * s, height: canvas.height * s
    });
    const ctx = off.getContext("2d");
    ctx.scale(s, s);
    ctx.drawImage(canvas, 0, 0);

    download(off.toDataURL("image/png"), `${name}.png`);
    toast("✅ PNG exportado (2×)", "success");
  }

  /* ── 2. GIF animado ──────────────────────────────────────────────────── */
  let _gifLoaded = false;
  function loadGifJs(cb) {
    if (_gifLoaded || global.GIF) { _gifLoaded = true; cb(); return; }
    const s = document.createElement("script");
    s.src = CFG.gif.lib;
    s.onload = () => { _gifLoaded = true; cb(); };
    s.onerror = () => toast("No se pudo cargar gif.js (necesita conexión)", "error");
    document.head.appendChild(s);
  }

  function exportGIF(name) {
    const canvas = getCanvas();
    if (!canvas) return toast("Canvas no encontrado", "error");

    toast("⏳ Capturando frames para GIF...", "info");
    loadGifJs(() => {
      const totalFrames = CFG.gif.fps * CFG.gif.durationSec;
      const delay = Math.round(1000 / CFG.gif.fps);

      const gif = new global.GIF({
        workers: 2, quality: CFG.gif.quality,
        workerScript: CFG.gif.worker,
        width: canvas.width, height: canvas.height,
        transparent: 0x00000000
      });

      let f = 0;
      const next = () => {
        if (f >= totalFrames) { toast("🔄 Generando GIF...", "info"); gif.render(); return; }
        requestAnimationFrame(() => { gif.addFrame(canvas, { copy: true, delay }); f++; next(); });
      };
      gif.on("finished", blob => { download(blob, `${name}.gif`); toast("✅ GIF animado listo", "success"); });
      gif.on("error", e => toast("Error GIF: " + e, "error"));
      next();
    });
  }

  /* ── 3. WebP estático (WhatsApp Sticker) ─────────────────────────────── */
  function exportWebPStatic(name) {
    const canvas = getCanvas();
    if (!canvas) return toast("Canvas no encontrado", "error");

    const sz = CFG.webp.size;
    const off = Object.assign(document.createElement("canvas"), { width: sz, height: sz });
    const ctx = off.getContext("2d");

    const ratio = Math.min(sz / canvas.width, sz / canvas.height);
    const dw = canvas.width * ratio, dh = canvas.height * ratio;
    ctx.clearRect(0, 0, sz, sz);
    ctx.drawImage(canvas, (sz - dw) / 2, (sz - dh) / 2, dw, dh);

    const url = off.toDataURL("image/webp", 0.9);
    download(url, `${name}.webp`);
    toast("✅ Sticker WhatsApp exportado (512×512 WebP)", "success");
  }

  /* ── 4. WebP animado (WhatsApp Animated Sticker) ─────────────────────── */
  function exportWebPAnimated(name) {
    const canvas = getCanvas();
    if (!canvas) return toast("Canvas no encontrado", "error");
    if (!canvas.captureStream) return toast("Tu navegador no soporta captureStream. Usa Chrome/Edge.", "warn");

    const sz = CFG.webp.size;
    const off = Object.assign(document.createElement("canvas"), { width: sz, height: sz });
    const ctx = off.getContext("2d");
    const ratio = Math.min(sz / canvas.width, sz / canvas.height);
    const dw = canvas.width * ratio, dh = canvas.height * ratio;
    const dx = (sz - dw) / 2, dy = (sz - dh) / 2;

    let running = true;
    const sync = () => { if (!running) return; ctx.clearRect(0, 0, sz, sz); ctx.drawImage(canvas, dx, dy, dw, dh); requestAnimationFrame(sync); };
    sync();

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(off.captureStream(CFG.webp.fps), { mimeType: mime });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      running = false;
      const blob = new Blob(chunks, { type: mime });
      download(blob, `${name}.webp`);
      const kb = Math.round(blob.size / 1024);
      toast(`✅ Sticker animado: ${kb} KB ${kb > 500 ? "⚠️ Muy pesado para WA (máx 500 KB)" : "✓ OK"}`, kb > 500 ? "warn" : "success");
    };

    rec.start();
    toast(`⏳ Grabando ${CFG.webp.durationSec}s de sticker animado...`, "info");
    setTimeout(() => rec.stop(), CFG.webp.durationSec * 1000);
  }

  /* ── 5. SVG vectorial ────────────────────────────────────────────────── */
  function exportSVG(name) {
    const elements = getElements();
    const camera = getCamera();
    const canvas = getCanvas();
    if (!canvas || !elements.length) return toast("Sin elementos para exportar como SVG", "warn");

    const W = canvas.width, H = canvas.height;
    const tx = (camera.x || 0), ty = (camera.y || 0), z = camera.zoom || 1;

    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
      `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${z})">`
    ];

    for (const el of elements) {
      if (!el || el.visible === false) continue;
      const fill = el.fillColor || el.color || "none";
      const stroke = el.strokeColor || el.borderColor || "#000000";
      const sw = el.strokeWidth || el.lineWidth || 1;
      const op = el.opacity !== undefined ? el.opacity : 1;
      const base = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"`;

      switch (el.type) {
        case "rect": case "rectangle":
          lines.push(`  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${base}/>`);
          break;
        case "circle": case "ellipse": {
          const r = el.radius || (el.width / 2) || 20;
          if (el.rx || el.ry) lines.push(`  <ellipse cx="${el.x}" cy="${el.y}" rx="${el.rx||r}" ry="${el.ry||r}" ${base}/>`);
          else lines.push(`  <circle cx="${el.x}" cy="${el.y}" r="${r}" ${base}/>`);
          break;
        }
        case "line":
          lines.push(`  <line x1="${el.x1??el.x}" y1="${el.y1??el.y}" x2="${el.x2??(el.x+el.width)}" y2="${el.y2??(el.y+el.height)}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`);
          break;
        case "path": case "pencil": case "freehand": case "route":
          if (el.points && el.points.length > 1) {
            const d = el.points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
            lines.push(`  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`);
          }
          break;
        case "text":
          lines.push(`  <text x="${el.x}" y="${el.y}" font-size="${el.fontSize || 14}" fill="${fill}" opacity="${op}">${(el.text || el.content || "").replace(/</g, "&lt;")}</text>`);
          break;
        case "polygon": case "shape": case "triangle": case "diamond": case "trapezoid":
          if (el.points && el.points.length > 2) {
            const pts = el.points.map(p => `${p.x},${p.y}`).join(" ");
            lines.push(`  <polygon points="${pts}" ${base}/>`);
          }
          break;
        case "image":
          if (el.imageSrc && el.imageSrc.startsWith("http")) {
            lines.push(`  <image href="${el.imageSrc}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" opacity="${op}"/>`);
          }
          break;
        default:
          lines.push(`  <!-- ${el.type || "desconocido"} id="${el.id || ""}" -->`);
      }
    }
    lines.push("</g>", "</svg>");

    download(new Blob([lines.join("\n")], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
    toast("✅ SVG vectorial listo (importable en Figma, Inkscape, Illustrator)", "success");
  }

  /* ── 6. .vector (JSON nativo re-importable) ──────────────────────────── */
  function exportVector(name) {
    const elements = getElements();
    if (!elements.length) return toast("Sin elementos para exportar", "warn");

    const payload = {
      _format: "arkaios-vector-v1",
      _exported: new Date().toISOString(),
      name,
      camera: getCamera(),
      elements
    };
    download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${name}.vector`);
    toast("✅ Archivo .vector exportado (re-importable en el editor)", "success");
  }

  /* ── MODAL DE EXPORTACIÓN ────────────────────────────────────────────── */
  const MODAL_ID = "_arkExportModal";

  function openModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) { modal.style.display = "flex"; return; }

    const anim = hasAnimation();
    const name = () => getProjectName().replace(/\s+/g, "-").toLowerCase();

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,.82);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      font-family:'Segoe UI',system-ui,sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        background:#12121e;border:1px solid #2a2a3e;border-radius:14px;
        padding:28px 30px;width:380px;
        box-shadow:0 28px 72px rgba(0,0,0,.7);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <h2 style="color:#e0e0ff;margin:0;font-size:16px;font-weight:600;letter-spacing:.3px">
            📤 Exportar creación
          </h2>
          <button id="_arkClose" style="background:none;border:none;color:#555;font-size:22px;cursor:pointer;line-height:1">✕</button>
        </div>

        ${anim ? `<div style="background:#0d2b1a;border:1px solid #1d6e3e;border-radius:7px;padding:8px 12px;margin-bottom:14px;font-size:11.5px;color:#2ecc71">
          ⚡ Animación detectada — GIF y Sticker Animado habilitados
        </div>` : ""}

        <div style="display:flex;flex-direction:column;gap:9px">

          <button class="_ark-btn" data-f="png" style="background:#1565c0">
            🖼️ PNG  <em>alta resolución 2×</em>
          </button>

          <button class="_ark-btn" data-f="svg" style="background:#6a1b9a">
            ✏️ SVG vectorial  <em>Figma · Inkscape · Illustrator</em>
          </button>

          <button class="_ark-btn" data-f="vector" style="background:#e65100">
            📦 .vector  <em>formato nativo · re-importable</em>
          </button>

          <div style="border-top:1px solid #222;margin:4px 0"></div>

          <button class="_ark-btn" data-f="gif" style="background:${anim ? "#00695c" : "#2a2a2a"};${anim ? "" : "opacity:.5;cursor:not-allowed"}">
            🎞️ GIF animado  <em>${anim ? "15fps · 3 seg" : "sin animación detectada"}</em>
          </button>

          <button class="_ark-btn" data-f="webp-static" style="background:#b71c1c">
            📱 Sticker WA estático  <em>512×512 WebP</em>
          </button>

          <button class="_ark-btn" data-f="webp-anim" style="background:${anim ? "#b71c1c" : "#2a2a2a"};${anim ? "" : "opacity:.5;cursor:not-allowed"}">
            📱 Sticker WA animado  <em>${anim ? "512×512 · máx 500 KB" : "sin animación detectada"}</em>
          </button>

        </div>

        <p style="margin:16px 0 0;font-size:10.5px;color:#444;text-align:center;line-height:1.5">
          💡 Para Figma: importa el SVG → File › Import.<br>
          El formato .fig es propietario de Figma y no se genera externamente.
        </p>
      </div>

      <style>
        ._ark-btn {
          color:#fff;border:none;padding:11px 14px;border-radius:8px;
          cursor:pointer;font-size:13px;text-align:left;width:100%;
          transition:filter .15s;font-family:inherit;display:flex;
          align-items:center;gap:6px;
        }
        ._ark-btn em { opacity:.65;font-style:normal;font-size:11px;margin-left:auto; }
        ._ark-btn:not([style*="not-allowed"]):hover { filter:brightness(1.15); }
      </style>
    `;

    document.body.appendChild(modal);

    document.getElementById("_arkClose").onclick = () => { modal.style.display = "none"; };
    modal.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

    modal.querySelectorAll("._ark-btn").forEach(btn => {
      if (btn.style.cssText.includes("not-allowed")) return;
      btn.onclick = () => {
        modal.style.display = "none";
        const n = name();
        ({ png: exportPNG, svg: exportSVG, vector: exportVector,
           gif: exportGIF, "webp-static": exportWebPStatic,
           "webp-anim": exportWebPAnimated }[btn.dataset.f] || (() => {}))(n);
      };
    });
  }

  /* ── HOOK al botón existente ─────────────────────────────────────────── */
  function hookButton() {
    // Espera a que el editor arranque
    const wait = setInterval(() => {
      const btn = document.getElementById("btn-export");
      if (!btn) return;
      clearInterval(wait);

      // Reemplaza el listener original
      const newBtn = btn.cloneNode(true); // limpia listeners viejos
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", openModal);

      console.info("[ExportModule] ✅ Conectado a #btn-export → modal de exportación");
    }, 300);
  }

  /* ── API PÚBLICA ─────────────────────────────────────────────────────── */
  global.ExportModule = {
    modal: openModal,
    png: exportPNG,
    gif: exportGIF,
    webpStatic: exportWebPStatic,
    webpAnimated: exportWebPAnimated,
    svg: exportSVG,
    vector: exportVector
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hookButton);
  } else {
    hookButton();
  }

  console.info("[ExportModule] 🚀 Listo — PNG · GIF · WebP(WA) · SVG · .vector");

})(window);
