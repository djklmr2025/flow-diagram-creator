import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { getOrigin, setCors, sendJson } from './_utils.js';
import { STATUS } from './_status.js';


const MAX_PROJECT_BYTES = 200_000; // Anti-abuso: evita payloads enormes.
const MAX_ELEMENTS = 2_000;

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return null;
  return JSON.parse(text);
}

function sanitizeFolder(input) {
  if (!input) return '';
  let folder = String(input).trim();
  folder = folder.replace(/^\/+/, ''); // sin slash inicial
  folder = folder.replace(/\/+$/, ''); // sin slash final
  folder = folder.replace(/\\/g, '/'); // normalizar

  // Solo permitimos rutas simples tipo "metro/linea-1/estacion_x".
  if (!/^[a-zA-Z0-9/_-]+$/.test(folder)) return '';
  if (folder.includes('..')) return '';
  return folder;
}

function analyzeElements(elements) {
  let count = 0;
  let hasImages = false;

  const stack = Array.isArray(elements) ? elements.slice() : [];
  while (stack.length) {
    const e = stack.pop();
    if (!e || typeof e !== 'object') continue;

    count++;

    if (e.type === 'image' || typeof e.imageSrc === 'string' || e.imageData != null) {
      hasImages = true;
    }

    if (e.type === 'group' && Array.isArray(e.elements)) {
      for (let i = e.elements.length - 1; i >= 0; i--) {
        stack.push(e.elements[i]);
      }
    }

    // Early exit para evitar recorridos gigantes.
    if (count > MAX_ELEMENTS) break;
  }

  return { count, hasImages };
}

function validateProject(project) {
  const errors = [];

  if (!project || typeof project !== 'object') {
    errors.push('body debe ser un objeto JSON');
    return errors;
  }

  if (!Array.isArray(project.elements)) {
    errors.push('elements debe ser un array');
  } else {
    const { count, hasImages } = analyzeElements(project.elements);

    if (count > MAX_ELEMENTS) {
      errors.push(`elements excede el máximo (${MAX_ELEMENTS}): ${count}`);
    }

    // Este endpoint es para "stickers" vectoriales/animados (sin base64/imagenes).
    if (hasImages) {
      errors.push('Imágenes no permitidas: elimina elementos tipo "image" / imageSrc');
    }
  }

  // camera opcional
  if (project.camera != null && typeof project.camera !== 'object') {
    errors.push('camera debe ser un objeto');
  }

  return errors;
}

function normalizeElementInPlace(elem) {
  if (!elem || typeof elem !== 'object') return;

  // Compat IA: { color } -> fillColor/strokeColor
  if (typeof elem.color === 'string') {
    if (
      typeof elem.fillColor !== 'string' &&
      (elem.type === 'rectangle' || elem.type === 'circle' || elem.type === 'polygon')
    ) {
      elem.fillColor = elem.color;
    }
    if (typeof elem.strokeColor !== 'string') {
      elem.strokeColor = elem.color;
    }
  }

  // Compat IA: { isAnim } -> { active }
  if (typeof elem.isAnim === 'boolean' && typeof elem.active !== 'boolean') {
    elem.active = elem.isAnim;
  }

  // Compat IA: circle con radius y (x,y) como centro.
  if (
    elem.type === 'circle' &&
    typeof elem.radius === 'number' &&
    (!Number.isFinite(elem.width) || !Number.isFinite(elem.height))
  ) {
    const r = elem.radius;
    const cx = Number.isFinite(elem.x) ? elem.x : 0;
    const cy = Number.isFinite(elem.y) ? elem.y : 0;
    elem.x = cx - r;
    elem.y = cy - r;
    elem.width = r * 2;
    elem.height = r * 2;
    delete elem.radius;
  }

  // Compat IA: line con x1/y1/x2/y2.
  if (
    elem.type === 'line' &&
    Number.isFinite(elem.x1) &&
    Number.isFinite(elem.y1) &&
    Number.isFinite(elem.x2) &&
    Number.isFinite(elem.y2) &&
    (!Number.isFinite(elem.x) ||
      !Number.isFinite(elem.y) ||
      !Number.isFinite(elem.endX) ||
      !Number.isFinite(elem.endY))
  ) {
    elem.x = elem.x1;
    elem.y = elem.y1;
    elem.endX = elem.x2;
    elem.endY = elem.y2;
    delete elem.x1;
    delete elem.y1;
    delete elem.x2;
    delete elem.y2;
  }

  // Defaults mínimos para que el engine no truene.
  if (elem.type === 'line') {
    if (!Number.isFinite(elem.x)) elem.x = 0;
    if (!Number.isFinite(elem.y)) elem.y = 0;
    if (!Number.isFinite(elem.endX)) elem.endX = elem.x;
    if (!Number.isFinite(elem.endY)) elem.endY = elem.y;
    if (typeof elem.strokeColor !== 'string') elem.strokeColor = '#e94560';
    if (typeof elem.animColor !== 'string') elem.animColor = '#4caf50';
    if (typeof elem.flowDirection !== 'string') elem.flowDirection = 'right';
    if (!Number.isFinite(elem.animOffset)) elem.animOffset = 0;
    if (!Array.isArray(elem.controlPoints)) elem.controlPoints = [];
  } else if (elem.type === 'rectangle' || elem.type === 'circle') {
    if (!Number.isFinite(elem.x)) elem.x = 0;
    if (!Number.isFinite(elem.y)) elem.y = 0;
    if (!Number.isFinite(elem.width)) elem.width = 0;
    if (!Number.isFinite(elem.height)) elem.height = 0;
    if (typeof elem.fillColor !== 'string') elem.fillColor = '#0f3460';
    if (typeof elem.strokeColor !== 'string') elem.strokeColor = '#e94560';
  } else if (elem.type === 'polygon' || elem.type === 'path') {
    if (typeof elem.strokeColor !== 'string') elem.strokeColor = '#e94560';
    if (typeof elem.fillColor !== 'string') elem.fillColor = '#0f3460';
    if (!Number.isFinite(elem.lineWidth)) elem.lineWidth = 3;
  }

  if (typeof elem.name !== 'string') elem.name = '';
  if (typeof elem.locked !== 'boolean') elem.locked = false;
  if (typeof elem.active !== 'boolean') elem.active = true;
  if (typeof elem.connectionStatus !== 'string') elem.connectionStatus = 'none';
}

function normalizeProjectInPlace(project) {
  if (!project || typeof project !== 'object') return;
  if (!Array.isArray(project.elements)) project.elements = [];

  const stack = project.elements.slice();
  while (stack.length) {
    const elem = stack.pop();
    if (!elem || typeof elem !== 'object') continue;

    normalizeElementInPlace(elem);

    if (elem.type === 'group' && Array.isArray(elem.elements)) {
      for (let i = elem.elements.length - 1; i >= 0; i--) {
        stack.push(elem.elements[i]);
      }
    }
  }

  if (!project.camera || typeof project.camera !== 'object') {
    project.camera = { x: 0, y: 0, zoom: 1 };
  } else {
    const cam = project.camera;
    if (!Number.isFinite(cam.x)) cam.x = 0;
    if (!Number.isFinite(cam.y)) cam.y = 0;
    if (!Number.isFinite(cam.zoom)) cam.zoom = 1;
  }

  if (typeof project.name !== 'string') project.name = '';
  if (typeof project.date !== 'string') project.date = new Date().toISOString();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res, 'GET,POST,OPTIONS', 'content-type');
    res.statusCode = STATUS.NO_CONTENT;
    res.end();
    return;
  }

  const origin = getOrigin(req);

  if (req.method === 'GET') {
    sendJson(res, STATUS.OK, {
      ok: true,
      usage: {
        method: 'POST',
        endpoint: '/api/publish',
        bodyExample: {
          name: 'metro-linea-1-transbordo',
          folder: 'metro/linea-1',
          elements: [],
          camera: { x: 0, y: 0, zoom: 1 },
          tags: ['metro', 'linea-1', 'transbordo'],
        },
      },
      notes: [
        'Este endpoint publica proyectos como JSON (sin imágenes) y devuelve un link de preview.',
        'Configura BLOB_READ_WRITE_TOKEN en Vercel para habilitar escritura en Blob.',
        'Opcional: define PUBLISH_KEY para requerir una llave simple.',
      ],
      examplePreviewUrl: `${origin}/?mode=preview&id=metro/linea-1/abc123`,
    });
    return;
  }

  if (req.method !== 'POST') {
    setCors(res, 'GET,POST,OPTIONS', 'content-type');
    sendJson(res, STATUS.METHOD_NOT_ALLOWED, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const requiredKey = process.env.PUBLISH_KEY;
  if (requiredKey) {
    const url = new URL(req.url, origin);
    const key = req.headers['x-publish-key'] || url.searchParams.get('key') || '';
    if (key !== requiredKey) {
      setCors(res, 'GET,POST,OPTIONS', 'content-type');
    sendJson(res, STATUS.UNAUTHORIZED, { ok: false, error: 'Unauthorized' });
      return;
    }
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    setCors(res, 'GET,POST,OPTIONS', 'content-type');
    sendJson(res, STATUS.BAD_REQUEST, { ok: false, error: 'InvalidJSONBody' });
    return;
  }

  const errors = validateProject(body);
  if (errors.length) {
    setCors(res, 'GET,POST,OPTIONS', 'content-type');
    sendJson(res, STATUS.BAD_REQUEST, { ok: false, error: 'ValidationError', details: errors });
    return;
  }

  // Normalizar para aceptar "JSON IA-friendly" (radius/x1/y1/...).
  normalizeProjectInPlace(body);

  const folder = sanitizeFolder(body.folder);

  const shortId = randomUUID().replace(/-/g, '').slice(0, 16);
  const id = folder ? `${folder}/${shortId}` : shortId;
  const pathname = `library/${id}.json`;

  const project = {
    name:
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `sticker-${shortId}`,
    date: new Date().toISOString(),
    elements: body.elements || [],
    camera: body.camera || { x: 0, y: 0, zoom: 1 },
    meta: {
      folder,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 50) : [],
      source: 'api/publish',
      version: 1,
    },
  };

  const json = JSON.stringify(project);
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > MAX_PROJECT_BYTES) {
    sendJson(res, STATUS.PAYLOAD_TOO_LARGE, {
      ok: false,
      error: 'PayloadTooLarge',
      maxBytes: MAX_PROJECT_BYTES,
      bytes,
    });
    return;
  }

  let blob;
  try {
    blob = await put(pathname, json, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } catch (error) {
    setCors(res, 'GET,POST,OPTIONS', 'content-type');
    sendJson(res, STATUS.INTERNAL_SERVER_ERROR, { ok: false, error: 'BlobWriteFailed', details: String(error) });
    return;
  }

  const previewUrl = `${origin}/?mode=preview&id=${encodeURIComponent(id)}`;
  const jsonUrl = `${origin}/api/project?id=${encodeURIComponent(id)}`;

  sendJson(res, STATUS.OK, {
    ok: true,
    id,
    pathname: blob.pathname,
    blobUrl: blob.url,
    previewUrl,
    jsonUrl,
  });
}
