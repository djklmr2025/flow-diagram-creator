import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const MAX_PROJECT_BYTES = 200_000;
const MAX_ELEMENTS = 2_000;

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
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

function analyzeElements(elements) {
  let count = 0;
  let hasImages = false;
  const stack = Array.isArray(elements) ? elements.slice() : [];
  while (stack.length) {
    const e = stack.pop();
    if (!e || typeof e !== 'object') continue;
    count++;
    if (e.type === 'image' || e.type === 'video' || typeof e.imageSrc === 'string' || e.imageData != null || typeof e.videoSrc === 'string' || e.videoData != null) {
      hasImages = true;
    }
    if (e.type === 'group' && Array.isArray(e.elements)) {
      for (let i = e.elements.length - 1; i >= 0; i--) stack.push(e.elements[i]);
    }
    if (count > MAX_ELEMENTS) break;
  }
  return { count, hasImages };
}

function normalizeElementInPlace(elem) {
  if (!elem || typeof elem !== 'object') return;
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
      for (let i = elem.elements.length - 1; i >= 0; i--) stack.push(elem.elements[i]);
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
        endpoint: '/api/publish-grouped',
        notes: 'Guarda selección rápida en library/grouped sin pedir PUBLISH_KEY en UI.',
      },
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    sendJson(res, 500, { ok: false, error: 'BlobNotConfigured' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'InvalidJSON', details: String(error) });
    return;
  }

  const name = String((body && body.name) || '').trim() || 'agrupado';
  const elements = Array.isArray(body && body.elements) ? body.elements : [];
  const camera = (body && body.camera && typeof body.camera === 'object') ? body.camera : { x: 0, y: 0, zoom: 1 };
  const tags = Array.isArray(body && body.tags) ? body.tags : ['grouped'];
  const project = {
    name,
    date: new Date().toISOString(),
    source: 'api/publish-grouped',
    elements,
    camera,
    tags,
  };

  normalizeProjectInPlace(project);

  const { count, hasImages } = analyzeElements(project.elements);
  if (count === 0) {
    sendJson(res, 400, { ok: false, error: 'EmptySelection' });
    return;
  }
  if (count > MAX_ELEMENTS) {
    sendJson(res, 413, { ok: false, error: 'TooManyElements', details: `${count}` });
    return;
  }
  if (hasImages) {
    sendJson(res, 400, { ok: false, error: 'ImagesNotAllowed' });
    return;
  }

  const jsonText = JSON.stringify(project);
  const bytes = Buffer.byteLength(jsonText, 'utf8');
  if (bytes > MAX_PROJECT_BYTES) {
    sendJson(res, 413, { ok: false, error: 'PayloadTooLarge', details: `${bytes}` });
    return;
  }

  const id = `grouped/${randomUUID().replace(/-/g, '')}`;
  const pathname = `library/${id}.json`;

  try {
    await put(pathname, jsonText, {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: 'BlobWriteFailed', details: String(error) });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    id,
    jsonUrl: `${origin}/api/project?id=${encodeURIComponent(id)}`,
    previewUrl: `${origin}/?mode=preview&id=${encodeURIComponent(id)}`,
    stickerUrl: `${origin}/?mode=sticker&id=${encodeURIComponent(id)}`,
    folder: 'grouped',
  });
}

