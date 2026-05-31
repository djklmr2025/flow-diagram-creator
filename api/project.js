import { list } from '@vercel/blob';
import { setCors, sendJson, getOrigin } from './_utils.js';

function sanitizeId(input) {
  if (!input) return '';
  let id = String(input).trim();
  id = id.replace(/^\/+/, '');
  id = id.replace(/\\+/g, '/');
  id = id.replace(/\.json$/i, '');
  if (!/^[a-zA-Z0-9/_-]+$/.test(id)) return '';
  if (id.includes('..')) return '';
  return id;
}

async function resolveExactBlob(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 2 });
  return (blobs || []).find((b) => b.pathname === pathname) || null;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const origin = getOrigin(req);
  const url = new URL(req.url, origin);
  const id = sanitizeId(url.searchParams.get('id'));
  if (!id) {
    sendJson(res, 400, { ok: false, error: 'MissingOrInvalidId' });
    return;
  }

  // Soportar dos "scopes":
  // - library/<id>.json  (stickers vectoriales)
  // - projects/<id>.json (proyectos con imagenes)
  const libraryPath = `library/${id}.json`;
  const projectsPath = `projects/${id}.json`;

  let exact;
  try {
    exact = await resolveExactBlob(libraryPath);
    if (!exact) exact = await resolveExactBlob(projectsPath);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: 'BlobListFailed', details: String(error) });
    return;
  }

  if (!exact) {
    sendJson(res, 404, { ok: false, error: 'NotFound', id });
    return;
  }

  // Proxy server-side para evitar problemas de CORS y mantener el JSON estable.
  let response;
  try {
    response = await fetch(exact.url, { cache: 'no-store' });
  } catch (error) {
    sendJson(res, 502, { ok: false, error: 'BlobFetchFailed', details: String(error) });
    return;
  }

  const text = await response.text();
  setCors(res);
  res.statusCode = response.ok ? 200 : 502;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=60');
  res.end(text);
}
