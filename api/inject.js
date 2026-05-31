import { normalizeProjectInPlace, normalizeElementInPlace, walkElements } from './_utils/normalize.js';

import { put, list } from '@vercel/blob';

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
  // Evitar caché: esto se usa como "canal" vivo.
  res.setHeader('cache-control', 'no-store');
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

function sanitizeSession(input) {
  if (!input) return '';
  let session = String(input).trim();
  session = session.replace(/^\/+/, '');
  session = session.replace(/\\+/g, '/');
  session = session.replace(/\/+$/, '');
  if (!/^[a-zA-Z0-9/_-]+$/.test(session)) return '';
  if (session.includes('..')) return '';
  // Límite razonable para evitar abuso.
  if (session.length > 120) return '';
  return session;
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
      for (let i = e.elements.length - 1; i >= 0; i--) stack.push(e.elements[i]);
    }

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
    if (count > MAX_ELEMENTS) errors.push(`elements excede el máximo (${MAX_ELEMENTS}): ${count}`);
    if (hasImages) errors.push('Imágenes no permitidas: elimina elementos tipo "image" / imageSrc');
  }

  if (project.camera != null && typeof project.camera !== 'object') {
    errors.push('camera debe ser un objeto');
  }

  return errors;
}





async function resolveBlobUrl(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 2 });
  const exact = (blobs || []).find((b) => b.pathname === pathname);
  return exact ? exact.url : null;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const origin = getOrigin(req);
  const url = new URL(req.url, origin);
  const session = sanitizeSession(url.searchParams.get('session') || url.searchParams.get('listen'));
  if (!session) {
    sendJson(res, 400, { ok: false, error: 'MissingOrInvalidSession' });
    return;
  }

  const pathname = `inbox/${session}.json`;

  if (req.method === 'GET') {
    let blobUrl;
    try {
      blobUrl = await resolveBlobUrl(pathname);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: 'BlobListFailed', details: String(error) });
      return;
    }

    if (!blobUrl) {
      sendJson(res, 404, { ok: false, error: 'NotFound', session });
      return;
    }

    let response;
    try {
      response = await fetch(blobUrl, { cache: 'no-store' });
    } catch (error) {
      sendJson(res, 502, { ok: false, error: 'BlobFetchFailed', details: String(error) });
      return;
    }

    const text = await response.text();
    setCors(res);
    res.statusCode = response.ok ? 200 : 502;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(text);
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const requiredKey = process.env.PUBLISH_KEY;
  if (requiredKey) {
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

  // Normalizar para permitir "JSON friendly" de IA.
  normalizeProjectInPlace(body);

  const project = {
    name: String(body.name || '').trim(),
    date: new Date().toISOString(),
    elements: body.elements || [],
    camera: body.camera || { x: 0, y: 0, zoom: 1 },
    meta: {
      session,
      source: 'api/inject',
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

  const listenUrl = `${origin}/?mode=sticker&listen=${encodeURIComponent(session)}`;
  sendJson(res, 200, {
    ok: true,
    session,
    pathname: blob.pathname,
    blobUrl: blob.url,
    listenUrl,
  });
}

