import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const MAX_PROJECT_BYTES = 200_000; // Anti-abuso: evita payloads enormes.
const MAX_ELEMENTS = 2_000;

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,x-publish-key');
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const origin = getOrigin(req);

  if (req.method === 'GET') {
    sendJson(res, 200, {
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
    sendJson(res, 405, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const requiredKey = process.env.PUBLISH_KEY;
  if (requiredKey) {
    const url = new URL(req.url, origin);
    const key = req.headers['x-publish-key'] || url.searchParams.get('key') || '';
    if (key !== requiredKey) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return;
    }
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: 'InvalidJSONBody' });
    return;
  }

  const errors = validateProject(body);
  if (errors.length) {
    sendJson(res, 400, { ok: false, error: 'ValidationError', details: errors });
    return;
  }

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
    sendJson(res, 413, {
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
    sendJson(res, 500, { ok: false, error: 'BlobWriteFailed', details: String(error) });
    return;
  }

  const previewUrl = `${origin}/?mode=preview&id=${encodeURIComponent(id)}`;
  const jsonUrl = `${origin}/api/project?id=${encodeURIComponent(id)}`;

  sendJson(res, 200, {
    ok: true,
    id,
    pathname: blob.pathname,
    blobUrl: blob.url,
    previewUrl,
    jsonUrl,
  });
}
