import { normalizeProjectInPlace, normalizeElementInPlace, walkElements } from './_utils/normalize.js';

import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

// Publica un "proyecto" (permite imagenes). Si el JSON trae imagenes embebidas
// como data URLs (base64), las sube como assets a Blob y reemplaza imageSrc por
// URLs publicas, para que el JSON sea ligero y compartible.

const MAX_BODY_BYTES = 6_000_000; // Limite de request (incluye base64).
const MAX_PROJECT_BYTES = 300_000; // Limite del JSON final (sin base64).
const MAX_ELEMENTS = 2_000;

const MAX_IMAGES = 40;
const MAX_IMAGE_BYTES = 2_000_000;
const MAX_TOTAL_IMAGE_BYTES = 8_000_000;

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

async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let bytes = 0;

  for await (const chunk of req) {
    bytes += chunk.length || 0;
    if (Number.isFinite(maxBytes) && bytes > maxBytes) {
      const err = new Error('PayloadTooLarge');
      err.code = 'PayloadTooLarge';
      err.bytes = bytes;
      throw err;
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return null;
  return JSON.parse(text);
}

function sanitizeFolder(input) {
  if (!input) return '';
  let folder = String(input).trim();
  folder = folder.replace(/^\/+/, '');
  folder = folder.replace(/\/+$/, '');
  folder = folder.replace(/\\/g, '/');

  if (!/^[a-zA-Z0-9/_-]+$/.test(folder)) return '';
  if (folder.includes('..')) return '';
  return folder;
}



function countElementsRecursive(elements) {
  let count = 0;
  walkElements(elements, () => {
    count++;
    return true;
  });
  return count;
}

function extForMime(mime) {
  switch (String(mime || '').toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return '';
  }
}

function parseBase64DataUrl(src) {
  if (typeof src !== 'string') return null;
  if (!src.startsWith('data:')) return null;

  const comma = src.indexOf(',');
  if (comma < 0) return null;

  const meta = src.slice(5, comma);
  const dataPart = src.slice(comma + 1);
  if (!meta) return null;

  const parts = meta.split(';').map((p) => p.trim()).filter(Boolean);
  const mime = String(parts[0] || '').toLowerCase();
  const isBase64 = parts.some((p) => p.toLowerCase() === 'base64');

  if (!mime.startsWith('image/')) return null;
  if (!isBase64) return null;

  // Remover espacios por si viene formateado.
  const b64 = dataPart.replace(/\s+/g, '');
  const buffer = Buffer.from(b64, 'base64');
  return { mime, buffer };
}





async function uploadProjectImagesInPlace(elements, assetPrefix) {
  const imageElems = [];

  walkElements(elements, (elem) => {
    if (!elem || typeof elem !== 'object') return true;
    if (elem.type !== 'image' && typeof elem.imageSrc !== 'string') return true;
    if (typeof elem.imageSrc !== 'string') return true;
    if (!elem.imageSrc.startsWith('data:')) return true;
    imageElems.push(elem);
    return true;
  });

  if (imageElems.length > MAX_IMAGES) {
    return {
      ok: false,
      error: 'TooManyImages',
      details: [`Demasiadas imagenes: ${imageElems.length} (max ${MAX_IMAGES})`],
    };
  }

  let totalBytes = 0;
  let uploaded = 0;

  for (let i = 0; i < imageElems.length; i++) {
    const elem = imageElems[i];
    const parsed = parseBase64DataUrl(elem.imageSrc);
    if (!parsed) {
      return {
        ok: false,
        error: 'InvalidImageDataUrl',
        details: ['Se detecto una imagen embebida, pero no es data URL base64 soportada.'],
      };
    }

    const ext = extForMime(parsed.mime);
    if (!ext) {
      return {
        ok: false,
        error: 'UnsupportedImageType',
        details: [`Tipo de imagen no soportado: ${parsed.mime}`],
      };
    }

    const bytes = parsed.buffer.length;
    if (bytes > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: 'ImageTooLarge',
        details: [`Imagen demasiado grande (${bytes} bytes). Max por imagen: ${MAX_IMAGE_BYTES}.`],
      };
    }

    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      return {
        ok: false,
        error: 'ImagesTooLarge',
        details: [`Suma de imagenes demasiado grande (${totalBytes} bytes). Max total: ${MAX_TOTAL_IMAGE_BYTES}.`],
      };
    }

    const short = randomUUID().replace(/-/g, '').slice(0, 12);
    const pathname = `${assetPrefix}/assets/${i + 1}-${short}.${ext}`;

    let blob;
    try {
      blob = await put(pathname, parsed.buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: parsed.mime,
      });
    } catch (error) {
      return { ok: false, error: 'BlobWriteFailed', details: [String(error)] };
    }

    elem.imageSrc = blob.url;
    uploaded++;
  }

  return { ok: true, uploaded, totalBytes };
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
        endpoint: '/api/publish-project',
        bodyExample: {
          name: 'metro-linea-1-proyecto',
          folder: 'metro/linea-1',
          elements: [],
          camera: { x: 0, y: 0, zoom: 1 },
        },
      },
      notes: [
        'Este endpoint publica proyectos como JSON (permite imagenes).',
        'Si el JSON trae imagenes embebidas (data URL base64), se suben como assets y se reemplaza imageSrc por URL.',
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
    body = await readJsonBody(req, MAX_BODY_BYTES);
  } catch (error) {
    if (error && error.code === 'PayloadTooLarge') {
      sendJson(res, 413, {
        ok: false,
        error: 'PayloadTooLarge',
        maxBytes: MAX_BODY_BYTES,
        bytes: error.bytes,
      });
      return;
    }
    sendJson(res, 400, { ok: false, error: 'InvalidJSONBody' });
    return;
  }

  if (!body || typeof body !== 'object') {
    sendJson(res, 400, { ok: false, error: 'ValidationError', details: ['body debe ser un objeto JSON'] });
    return;
  }

  if (!Array.isArray(body.elements)) {
    sendJson(res, 400, { ok: false, error: 'ValidationError', details: ['elements debe ser un array'] });
    return;
  }

  const totalElements = countElementsRecursive(body.elements);
  if (totalElements > MAX_ELEMENTS) {
    sendJson(res, 400, {
      ok: false,
      error: 'ValidationError',
      details: [`elements excede el maximo (${MAX_ELEMENTS}): ${totalElements}`],
    });
    return;
  }

  // Normalizar para aceptar "JSON IA-friendly" (radius/x1/y1/...).
  normalizeProjectInPlace(body);

  const folder = sanitizeFolder(body.folder);

  const shortId = randomUUID().replace(/-/g, '').slice(0, 16);
  const id = folder ? `${folder}/${shortId}` : shortId;

  // 1) Subir assets (imagenes embebidas) y reemplazar imageSrc.
  const assetPrefix = `projects/${id}`;
  const uploadRes = await uploadProjectImagesInPlace(body.elements, assetPrefix);
  if (!uploadRes.ok) {
    sendJson(res, 400, { ok: false, error: uploadRes.error, details: uploadRes.details || [] });
    return;
  }

  // 2) Guardar JSON final (sin base64).
  const project = {
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `project-${shortId}`,
    date: new Date().toISOString(),
    elements: body.elements || [],
    camera: body.camera || { x: 0, y: 0, zoom: 1 },
    meta: {
      folder,
      kind: 'project',
      source: 'api/publish-project',
      version: 1,
      images: {
        uploaded: uploadRes.uploaded || 0,
        totalBytes: uploadRes.totalBytes || 0,
      },
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

  const pathname = `projects/${id}.json`;

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
  const editorUrl = `${origin}/?id=${encodeURIComponent(id)}`;

  sendJson(res, 200, {
    ok: true,
    id,
    pathname: blob.pathname,
    blobUrl: blob.url,
    previewUrl,
    editorUrl,
    jsonUrl,
    assetsPrefix: `${assetPrefix}/assets/`,
    images: {
      uploaded: uploadRes.uploaded || 0,
      totalBytes: uploadRes.totalBytes || 0,
    },
  });
}

