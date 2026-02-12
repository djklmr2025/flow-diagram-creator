(() => {
  const els = {
    workspace: document.getElementById('workspace'),
    stage: document.getElementById('stage'),
    scene: document.getElementById('scene'),
    world: document.getElementById('world'),
    defs: document.getElementById('defs'),
    bgImage: document.getElementById('bg-image'),
    status: document.getElementById('status'),
    zoomLabel: document.getElementById('zoom-label'),

    inputJson: document.getElementById('input-json'),
    inputBg: document.getElementById('input-bg'),
    inputUploadJson: document.getElementById('input-upload-json'),

    btnOpenJson: document.getElementById('btn-open-json'),
    btnClear: document.getElementById('btn-clear'),
    btnOpenBg: document.getElementById('btn-open-bg'),

    btnLock: document.getElementById('btn-lock'),
    btnRotateLeft: document.getElementById('btn-rotate-left'),
    btnRotateRight: document.getElementById('btn-rotate-right'),
    btnFlipH: document.getElementById('btn-flip-h'),
    btnFlipV: document.getElementById('btn-flip-v'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    btnZoomIn: document.getElementById('btn-zoom-in'),

    btnLibraryToggle: document.getElementById('btn-library-toggle'),
    btnLibraryHide: document.getElementById('btn-library-hide'),
    btnLibraryRefresh: document.getElementById('btn-library-refresh'),
    librarySearch: document.getElementById('library-search'),
    libraryScope: document.getElementById('library-scope'),
    libraryList: document.getElementById('library-list'),

    uploadKind: document.getElementById('upload-kind'),
    uploadFolder: document.getElementById('upload-folder'),
    uploadKey: document.getElementById('upload-key'),
    btnUploadJson: document.getElementById('btn-upload-json')
  };

  const state = {
    project: { elements: [], camera: { x: 0, y: 0, zoom: 1 } },
    zoom: 1,
    rotateDeg: 0,
    flipX: 1,
    flipY: 1,
    fixed: false,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    gradientCounter: 0,

    libraryVisible: false,
    libraryItems: [],
    previewCache: new Map(),
    previewLoading: new Set(),
    listRenderTimer: null
  };

  function setStatus(msg) {
    els.status.textContent = msg;
  }

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function formatBytes(bytes) {
    const val = Number(bytes || 0);
    if (!Number.isFinite(val) || val <= 0) return '0 B';
    if (val < 1024) return `${val} B`;
    if (val < 1024 * 1024) return `${(val / 1024).toFixed(1)} KB`;
    return `${(val / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!value) return 'sin fecha';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    return d.toLocaleString();
  }

  function simpleId(id) {
    if (!id) return 'sin-id';
    const parts = String(id).split('/');
    return parts[parts.length - 1] || id;
  }

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== undefined && v !== null) node.setAttribute(k, String(v));
    });
    return node;
  }

  function setLibraryVisible(on) {
    state.libraryVisible = Boolean(on);
    els.workspace.classList.toggle('library-open', state.libraryVisible);
    if (state.libraryVisible && state.libraryItems.length === 0) {
      void loadLibraryCatalog();
    }
  }

  function updateWorldTransform() {
    const z = state.zoom;
    const tr = `translate(${state.panX} ${state.panY}) scale(${z}) rotate(${state.rotateDeg}) scale(${state.flipX} ${state.flipY})`;
    els.world.setAttribute('transform', tr);
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    els.btnLock.setAttribute('aria-pressed', String(state.fixed));
    els.btnLock.textContent = `Fijar: ${state.fixed ? 'ON' : 'OFF'}`;
  }

  function gradientFill(fillColor, grad) {
    if (!grad || typeof grad !== 'object') return fillColor || '#00bcd4';

    const id = `g_${Date.now()}_${state.gradientCounter++}`;
    const x1 = grad.x1 ?? 0;
    const y1 = grad.y1 ?? 0;
    const x2 = grad.x2 ?? 1;
    const y2 = grad.y2 ?? 1;
    const defsGrad = svgEl('linearGradient', {
      id,
      x1,
      y1,
      x2,
      y2,
      gradientUnits: 'objectBoundingBox'
    });

    const stops = Array.isArray(grad.stops) ? grad.stops : [];
    if (stops.length === 0) {
      defsGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': fillColor || '#00bcd4' }));
      defsGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#ffffff' }));
    } else {
      stops.forEach((s) => {
        defsGrad.appendChild(svgEl('stop', {
          offset: `${clamp(Number(s.offset ?? 0), 0, 1) * 100}%`,
          'stop-color': s.color || '#00bcd4'
        }));
      });
    }

    els.defs.appendChild(defsGrad);
    return `url(#${id})`;
  }

  function clearScene() {
    els.world.innerHTML = '';
    els.defs.innerHTML = '';
  }

  function getRectLike(elem) {
    const x = Number(elem.x ?? 0);
    const y = Number(elem.y ?? 0);
    const w = Number(elem.width ?? elem.w ?? 0);
    const h = Number(elem.height ?? elem.h ?? 0);
    return { x, y, w, h };
  }

  function walkElements(elements, visitor) {
    const stack = Array.isArray(elements) ? elements.slice() : [];
    while (stack.length) {
      const elem = stack.pop();
      if (!elem || typeof elem !== 'object') continue;

      visitor(elem);

      if (elem.type === 'group' && Array.isArray(elem.elements)) {
        for (let i = elem.elements.length - 1; i >= 0; i -= 1) stack.push(elem.elements[i]);
      }
    }
  }

  function resolveProjectPayload(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (Array.isArray(raw.elements)) return raw;

    const possible = [
      'project', 'data', 'payload', 'result', 'value',
      'diagram', 'flow', 'content', 'document'
    ];

    for (const key of possible) {
      const value = raw[key];
      if (value && typeof value === 'object' && Array.isArray(value.elements)) {
        return value;
      }
    }

    return null;
  }

  function applyProject(project, source = 'local') {
    const resolved = resolveProjectPayload(project);
    if (!resolved) throw new Error('No se encontró arreglo elements en el JSON');

    state.project = resolved;
    const cam = resolved.camera || {};
    if (Number.isFinite(cam.zoom)) state.zoom = clamp(Number(cam.zoom), 0.1, 5);

    renderProject();
    const count = Array.isArray(resolved.elements) ? resolved.elements.length : 0;
    setStatus(`Cargado (${source}): ${count} elementos.`);
    return resolved;
  }

  function renderElement(elem, parent) {
    if (!elem || typeof elem !== 'object') return;

    if (elem.type === 'group' && Array.isArray(elem.elements)) {
      const g = svgEl('g', { class: 'sticker' });
      parent.appendChild(g);
      elem.elements.forEach((child) => renderElement(child, g));
      return;
    }

    if (elem.hidden === true) return;

    const fill = gradientFill(elem.fillColor || '#00bcd4', elem.fillGradient);
    const stroke = elem.strokeColor || '#e94560';
    const lineWidth = Number(elem.lineWidth ?? elem.strokeWidth ?? 2);

    let node = null;

    if (elem.type === 'line') {
      const x1 = Number(elem.x ?? elem.x1 ?? 0);
      const y1 = Number(elem.y ?? elem.y1 ?? 0);
      const x2 = Number(elem.endX ?? elem.x2 ?? 0);
      const y2 = Number(elem.endY ?? elem.y2 ?? 0);
      node = svgEl('line', {
        x1,
        y1,
        x2,
        y2,
        stroke,
        'stroke-width': lineWidth,
        'stroke-linecap': 'round',
        'stroke-dasharray': elem.active ? '8 8' : null
      });

      if (elem.active) {
        const anim = svgEl('animate', {
          attributeName: 'stroke-dashoffset',
          from: '0',
          to: '-16',
          dur: `${Math.max(0.2, 2 / (Number(elem.speed) || 1))}s`,
          repeatCount: 'indefinite'
        });
        node.appendChild(anim);
      }
    } else if (elem.type === 'rectangle') {
      const { x, y, w, h } = getRectLike(elem);
      node = svgEl('rect', {
        x,
        y,
        width: w,
        height: h,
        rx: Number(elem.radius ?? 0),
        fill,
        stroke,
        'stroke-width': lineWidth
      });
    } else if (elem.type === 'circle') {
      const { x, y, w, h } = getRectLike(elem);
      const r = Number(elem.radius ?? Math.min(w, h) / 2);
      const cx = Number(elem.cx ?? (x + (w || r * 2) / 2));
      const cy = Number(elem.cy ?? (y + (h || r * 2) / 2));
      node = svgEl('circle', {
        cx,
        cy,
        r,
        fill,
        stroke,
        'stroke-width': lineWidth
      });
    } else if (elem.type === 'polygon' || elem.type === 'path') {
      const pts = Array.isArray(elem.points) ? elem.points : [];
      const points = pts.map((p) => `${Number(p.x ?? 0)},${Number(p.y ?? 0)}`).join(' ');
      if (points) {
        node = svgEl('polygon', {
          points,
          fill,
          stroke,
          'stroke-width': lineWidth
        });
      }
    } else if (elem.type === 'image') {
      const { x, y, w, h } = getRectLike(elem);
      const src = elem.imageSrc || elem.imageData || '';
      if (src) {
        node = svgEl('image', {
          x,
          y,
          width: w,
          height: h,
          href: src,
          preserveAspectRatio: 'none'
        });
      }
    }

    if (!node) return;

    if (Number.isFinite(elem.rotation) && elem.rotation !== 0) {
      const { x, y, w, h } = getRectLike(elem);
      const cx = x + w / 2;
      const cy = y + h / 2;
      node.setAttribute('transform', `rotate(${Number(elem.rotation)} ${cx} ${cy})`);
    }

    node.classList.add('sticker');
    parent.appendChild(node);
  }

  function renderProject() {
    clearScene();
    const elements = Array.isArray(state.project.elements) ? state.project.elements : [];
    elements.forEach((elem) => renderElement(elem, els.world));
    updateWorldTransform();
  }

  async function parseAndApplyProject(rawText, source = 'archivo') {
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error('JSON inválido');
    }

    applyProject(data, source);
  }

  function computeElementBounds(elem) {
    if (!elem || typeof elem !== 'object') return null;

    if (elem.type === 'line') {
      const x1 = Number(elem.x ?? elem.x1 ?? 0);
      const y1 = Number(elem.y ?? elem.y1 ?? 0);
      const x2 = Number(elem.endX ?? elem.x2 ?? 0);
      const y2 = Number(elem.endY ?? elem.y2 ?? 0);
      return {
        minX: Math.min(x1, x2),
        minY: Math.min(y1, y2),
        maxX: Math.max(x1, x2),
        maxY: Math.max(y1, y2)
      };
    }

    if (elem.type === 'rectangle' || elem.type === 'image' || elem.type === 'circle') {
      const { x, y, w, h } = getRectLike(elem);
      if (elem.type === 'circle' && Number.isFinite(elem.radius)) {
        const r = Number(elem.radius);
        return {
          minX: Number(elem.x ?? 0) - r,
          minY: Number(elem.y ?? 0) - r,
          maxX: Number(elem.x ?? 0) + r,
          maxY: Number(elem.y ?? 0) + r
        };
      }
      return { minX: x, minY: y, maxX: x + w, maxY: y + h };
    }

    if (elem.type === 'polygon' || elem.type === 'path') {
      const pts = Array.isArray(elem.points) ? elem.points : [];
      if (!pts.length) return null;
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      pts.forEach((p) => {
        const x = Number(p.x ?? 0);
        const y = Number(p.y ?? 0);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });
      return { minX, minY, maxX, maxY };
    }

    return null;
  }

  function mergeBounds(a, b) {
    if (!a) return b;
    if (!b) return a;
    return {
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY)
    };
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function thumbElementSvg(elem) {
    if (!elem || typeof elem !== 'object') return '';

    if (elem.type === 'group' && Array.isArray(elem.elements)) {
      return elem.elements.map(thumbElementSvg).join('');
    }

    if (elem.hidden === true) return '';

    const fill = elem.fillColor || '#22d3ee';
    const stroke = elem.strokeColor || '#e94560';
    const lineWidth = Number(elem.lineWidth ?? elem.strokeWidth ?? 2);

    if (elem.type === 'line') {
      const x1 = Number(elem.x ?? elem.x1 ?? 0);
      const y1 = Number(elem.y ?? elem.y1 ?? 0);
      const x2 = Number(elem.endX ?? elem.x2 ?? 0);
      const y2 = Number(elem.endY ?? elem.y2 ?? 0);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escapeAttr(stroke)}" stroke-width="${lineWidth}" stroke-linecap="round" />`;
    }

    if (elem.type === 'rectangle') {
      const { x, y, w, h } = getRectLike(elem);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Number(elem.radius ?? 0)}" fill="${escapeAttr(fill)}" stroke="${escapeAttr(stroke)}" stroke-width="${lineWidth}"/>`;
    }

    if (elem.type === 'circle') {
      const { x, y, w, h } = getRectLike(elem);
      const r = Number(elem.radius ?? Math.min(w, h) / 2);
      const cx = Number(elem.cx ?? (x + (w || r * 2) / 2));
      const cy = Number(elem.cy ?? (y + (h || r * 2) / 2));
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${escapeAttr(fill)}" stroke="${escapeAttr(stroke)}" stroke-width="${lineWidth}"/>`;
    }

    if (elem.type === 'polygon' || elem.type === 'path') {
      const pts = Array.isArray(elem.points) ? elem.points : [];
      const points = pts.map((p) => `${Number(p.x ?? 0)},${Number(p.y ?? 0)}`).join(' ');
      if (!points) return '';
      return `<polygon points="${escapeAttr(points)}" fill="${escapeAttr(fill)}" stroke="${escapeAttr(stroke)}" stroke-width="${lineWidth}"/>`;
    }

    if (elem.type === 'image') {
      const { x, y, w, h } = getRectLike(elem);
      const src = elem.imageSrc || '';
      if (!src) return '';
      return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${escapeAttr(src)}" preserveAspectRatio="none" />`;
    }

    return '';
  }

  function getFirstImageSrc(project) {
    let found = '';
    walkElements(project.elements || [], (elem) => {
      if (found) return;
      if (elem.type === 'image' && typeof elem.imageSrc === 'string' && elem.imageSrc.trim()) {
        found = elem.imageSrc.trim();
      }
    });
    return found;
  }

  function buildThumbDataUrl(project) {
    const elements = [];
    walkElements(project.elements || [], (elem) => {
      if (elements.length < 40) elements.push(elem);
    });

    let bounds = null;
    elements.forEach((elem) => {
      bounds = mergeBounds(bounds, computeElementBounds(elem));
    });

    if (!bounds) bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    const w = Math.max(10, bounds.maxX - bounds.minX);
    const h = Math.max(10, bounds.maxY - bounds.minY);
    const pad = Math.max(w, h) * 0.08;
    const minX = bounds.minX - pad;
    const minY = bounds.minY - pad;
    const viewW = w + pad * 2;
    const viewH = h + pad * 2;

    const content = elements.map(thumbElementSvg).join('');
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${viewW} ${viewH}"><rect x="${minX}" y="${minY}" width="${viewW}" height="${viewH}" fill="#0b1f3f"/>${content}</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function placeholderThumb(kind) {
    const label = kind === 'project' ? 'PROY' : 'VECT';
    const color = kind === 'project' ? '#34d399' : '#38bdf8';
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10254a"/><stop offset="100%" stop-color="#0a1f3e"/></linearGradient></defs><rect width="160" height="120" fill="url(#g)"/><rect x="20" y="24" width="120" height="72" rx="10" fill="none" stroke="${color}" stroke-width="4"/><circle cx="50" cy="60" r="10" fill="${color}"/><rect x="68" y="48" width="52" height="24" rx="4" fill="${color}" opacity="0.7"/><text x="80" y="110" text-anchor="middle" font-size="16" fill="#dbeafe" font-family="Segoe UI">${label}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  async function fetchCatalogScope(scope) {
    const res = await fetch(`/api/library?scope=${encodeURIComponent(scope)}&mode=expanded&limit=200`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`No se pudo listar ${scope}: ${body || res.status}`);
    }

    const data = await res.json();
    const blobs = Array.isArray(data.blobs) ? data.blobs : [];

    return blobs.map((b) => ({
      id: String(b.pathname || ''),
      kind: scope === 'projects' ? 'project' : 'vector',
      size: Number(b.size || 0),
      uploadedAt: b.uploadedAt || '',
      name: ''
    }));
  }

  function scheduleLibraryRender() {
    if (state.listRenderTimer) clearTimeout(state.listRenderTimer);
    state.listRenderTimer = setTimeout(() => {
      renderLibraryList();
    }, 90);
  }

  async function ensureItemPreview(item) {
    if (!item || !item.id) return;
    if (state.previewCache.has(item.id)) return;
    if (state.previewLoading.has(item.id)) return;

    state.previewLoading.add(item.id);
    try {
      const res = await fetch(`/api/project?id=${encodeURIComponent(item.id)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const raw = await res.json();
      const project = resolveProjectPayload(raw);
      if (!project) throw new Error('payload sin elements');

      const firstImage = getFirstImageSrc(project);
      const thumb = firstImage || buildThumbDataUrl(project);
      const name = String(project.name || '').trim() || simpleId(item.id);

      state.previewCache.set(item.id, {
        thumb,
        name,
        count: Array.isArray(project.elements) ? project.elements.length : 0
      });
    } catch {
      state.previewCache.set(item.id, {
        thumb: placeholderThumb(item.kind),
        name: simpleId(item.id),
        count: 0
      });
    } finally {
      state.previewLoading.delete(item.id);
      scheduleLibraryRender();
    }
  }

  function filteredLibraryItems() {
    const search = String(els.librarySearch.value || '').trim().toLowerCase();
    const scope = els.libraryScope.value || 'all';

    return state.libraryItems.filter((item) => {
      if (scope !== 'all') {
        const expectedKind = scope === 'projects' ? 'project' : 'vector';
        if (item.kind !== expectedKind) return false;
      }

      if (!search) return true;

      const cache = state.previewCache.get(item.id);
      const byName = String(cache?.name || '').toLowerCase().includes(search);
      const byId = String(item.id || '').toLowerCase().includes(search);
      return byName || byId;
    });
  }

  function renderLibraryList() {
    const items = filteredLibraryItems();
    els.libraryList.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'library-empty';
      empty.textContent = 'Sin resultados. Ajusta filtro, alcance o sube un JSON.';
      els.libraryList.appendChild(empty);
      return;
    }

    items.forEach((item, idx) => {
      const cache = state.previewCache.get(item.id);
      const row = document.createElement('div');
      row.className = 'library-item';
      row.dataset.id = item.id;

      const img = document.createElement('img');
      img.className = 'library-thumb';
      img.alt = 'preview';
      img.src = cache?.thumb || placeholderThumb(item.kind);

      const meta = document.createElement('div');
      meta.className = 'library-meta';
      const title = document.createElement('div');
      title.className = 'library-title';
      title.textContent = cache?.name || simpleId(item.id);
      const sub = document.createElement('div');
      sub.className = 'library-sub';
      sub.textContent = `${item.kind === 'project' ? 'Proyecto' : 'Vector'} • ${formatDate(item.uploadedAt)}`;

      const pills = document.createElement('div');
      pills.className = 'library-pills';
      const pillSize = document.createElement('span');
      pillSize.className = 'pill';
      pillSize.textContent = formatBytes(item.size);
      const pillCount = document.createElement('span');
      pillCount.className = 'pill';
      pillCount.textContent = `${cache?.count ?? '-'} el.`;
      pills.appendChild(pillSize);
      pills.appendChild(pillCount);

      meta.appendChild(title);
      meta.appendChild(sub);
      meta.appendChild(pills);

      const action = document.createElement('button');
      action.className = 'btn btn-small';
      action.textContent = 'Ver';
      action.addEventListener('click', () => {
        void loadStoredItem(item);
      });

      row.appendChild(img);
      row.appendChild(meta);
      row.appendChild(action);
      els.libraryList.appendChild(row);

      if (!cache && idx < 24) {
        void ensureItemPreview(item);
      }
    });
  }

  async function loadLibraryCatalog() {
    setStatus('Cargando catálogo de JSON...');

    try {
      const selected = els.libraryScope.value || 'all';
      let rows = [];

      if (selected === 'all') {
        const [vectors, projects] = await Promise.all([fetchCatalogScope('library'), fetchCatalogScope('projects')]);
        rows = vectors.concat(projects);
      } else if (selected === 'projects') {
        rows = await fetchCatalogScope('projects');
      } else {
        rows = await fetchCatalogScope('library');
      }

      rows.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
      state.libraryItems = rows;
      renderLibraryList();
      setStatus(`Catálogo listo: ${rows.length} item(s).`);
    } catch (error) {
      setStatus(`Error cargando catálogo: ${error.message}`);
    }
  }

  async function loadStoredItem(item) {
    if (!item?.id) return;

    try {
      const res = await fetch(`/api/project?id=${encodeURIComponent(item.id)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`No se pudo cargar id=${item.id}`);
      const raw = await res.text();
      await parseAndApplyProject(raw, `${item.kind}:${item.id}`);
    } catch (error) {
      setStatus(`Error cargando item: ${error.message}`);
    }
  }

  async function uploadJsonFile(file) {
    const kind = els.uploadKind.value || 'vector';
    const endpoint = kind === 'project' ? '/api/publish-project' : '/api/publish';

    const text = await file.text();
    let payload;

    try {
      const parsed = JSON.parse(text);
      const resolved = resolveProjectPayload(parsed);
      if (!resolved) throw new Error('JSON sin elements');
      payload = resolved;
    } catch (error) {
      throw new Error(`No se pudo leer JSON: ${error.message}`);
    }

    const folder = String(els.uploadFolder.value || '').trim();
    if (folder) payload.folder = folder;

    if (!payload.name || !String(payload.name).trim()) {
      payload.name = file.name.replace(/\.json$/i, '') || `json-${Date.now()}`;
    }

    const headers = { 'content-type': 'application/json' };
    const key = String(els.uploadKey.value || '').trim();
    if (key) headers['x-publish-key'] = key;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok || !body?.ok) {
      const details = Array.isArray(body?.details) ? ` ${body.details.join(' | ')}` : '';
      throw new Error(`${body?.error || res.statusText}.${details}`);
    }

    setStatus(`Publicado OK (${kind}): ${body.id}`);
    await loadLibraryCatalog();

    if (body.id) {
      const item = {
        id: body.id,
        kind: kind === 'project' ? 'project' : 'vector',
        size: 0,
        uploadedAt: new Date().toISOString(),
        name: payload.name
      };
      await loadStoredItem(item);
    }
  }

  async function loadFromQuery() {
    const params = new URLSearchParams(window.location.search);

    const jsonData = params.get('data');
    if (jsonData) {
      try {
        await parseAndApplyProject(decodeURIComponent(jsonData), 'parámetro data');
      } catch {
        await parseAndApplyProject(jsonData, 'parámetro data');
      }
      return;
    }

    const id = params.get('id');
    if (id) {
      const res = await fetch(`/api/project?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`No se pudo cargar id=${id}`);
      const text = await res.text();
      await parseAndApplyProject(text, `id:${id}`);
      return;
    }

    const projectUrl = params.get('project');
    if (projectUrl) {
      const res = await fetch(projectUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar URL de proyecto');
      const text = await res.text();
      await parseAndApplyProject(text, 'URL externa');
    }
  }

  function bindEvents() {
    els.btnOpenJson.addEventListener('click', () => els.inputJson.click());
    els.btnOpenBg.addEventListener('click', () => els.inputBg.click());

    els.btnLibraryToggle.addEventListener('click', () => setLibraryVisible(!state.libraryVisible));
    els.btnLibraryHide.addEventListener('click', () => setLibraryVisible(false));
    els.btnLibraryRefresh.addEventListener('click', () => {
      void loadLibraryCatalog();
    });

    els.librarySearch.addEventListener('input', () => renderLibraryList());
    els.libraryScope.addEventListener('change', () => {
      void loadLibraryCatalog();
    });

    els.btnUploadJson.addEventListener('click', () => {
      els.inputUploadJson.click();
    });

    els.inputUploadJson.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await uploadJsonFile(file);
      } catch (error) {
        setStatus(`Error al subir JSON: ${error.message}`);
      }
      e.target.value = '';
    });

    els.inputJson.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        await parseAndApplyProject(text, `archivo:${file.name}`);
      } catch (err) {
        setStatus(`Error: ${err.message}`);
      }
      e.target.value = '';
    });

    els.inputBg.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      els.bgImage.src = url;
      els.bgImage.hidden = false;
      setStatus('Fondo cargado.');
      e.target.value = '';
    });

    els.btnClear.addEventListener('click', () => {
      state.project = { elements: [], camera: { x: 0, y: 0, zoom: 1 } };
      state.panX = 0;
      state.panY = 0;
      state.zoom = 1;
      state.rotateDeg = 0;
      state.flipX = 1;
      state.flipY = 1;
      els.bgImage.hidden = true;
      els.bgImage.removeAttribute('src');
      clearScene();
      updateWorldTransform();
      setStatus('Vista limpia.');
    });

    els.btnLock.addEventListener('click', () => {
      state.fixed = !state.fixed;
      updateWorldTransform();
      setStatus(state.fixed ? 'Vista fijada.' : 'Vista liberada.');
    });

    els.btnRotateLeft.addEventListener('click', () => {
      state.rotateDeg -= 15;
      updateWorldTransform();
    });

    els.btnRotateRight.addEventListener('click', () => {
      state.rotateDeg += 15;
      updateWorldTransform();
    });

    els.btnFlipH.addEventListener('click', () => {
      state.flipX *= -1;
      updateWorldTransform();
    });

    els.btnFlipV.addEventListener('click', () => {
      state.flipY *= -1;
      updateWorldTransform();
    });

    els.btnZoomOut.addEventListener('click', () => {
      state.zoom = clamp(state.zoom - 0.1, 0.1, 5);
      updateWorldTransform();
    });

    els.btnZoomIn.addEventListener('click', () => {
      state.zoom = clamp(state.zoom + 0.1, 0.1, 5);
      updateWorldTransform();
    });

    els.btnZoomReset.addEventListener('click', () => {
      state.zoom = 1;
      updateWorldTransform();
    });

    els.stage.addEventListener('pointerdown', (e) => {
      if (state.fixed) return;
      if (e.button !== 0) return;
      state.isPanning = true;
      state.panStartX = e.clientX - state.panX;
      state.panStartY = e.clientY - state.panY;
      els.stage.setPointerCapture(e.pointerId);
    });

    els.stage.addEventListener('pointermove', (e) => {
      if (!state.isPanning || state.fixed) return;
      state.panX = e.clientX - state.panStartX;
      state.panY = e.clientY - state.panStartY;
      updateWorldTransform();
    });

    els.stage.addEventListener('pointerup', (e) => {
      state.isPanning = false;
      try {
        els.stage.releasePointerCapture(e.pointerId);
      } catch (_) {
        // no-op
      }
    });

    els.stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -0.1 : 0.1;
      state.zoom = clamp(state.zoom + dir, 0.1, 5);
      updateWorldTransform();
    }, { passive: false });
  }

  async function boot() {
    bindEvents();
    updateWorldTransform();
    setStatus('Previewer 2.0 listo.');

    try {
      await loadFromQuery();
    } catch (err) {
      setStatus(`Carga automática falló: ${err.message}`);
    }
  }

  boot();
})();
