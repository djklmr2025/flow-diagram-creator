import { list } from '@vercel/blob';
import { getOrigin, setCors, sendJson } from './_utils.js';
import { STATUS } from './_status.js';

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
    setCors(res, 'GET,OPTIONS', 'content-type');
    res.statusCode = STATUS.NO_CONTENT;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    setCors(res, 'GET,OPTIONS', 'content-type');
    sendJson(res, STATUS.METHOD_NOT_ALLOWED, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const origin = getOrigin(req);
  const url = new URL(req.url, origin);
  const id = sanitizeId(url.searchParams.get('id'));
  if (!id) {
    setCors(res, 'GET,OPTIONS', 'content-type');
    sendJson(res, STATUS.BAD_REQUEST, { ok: false, error: 'MissingOrInvalidId' });
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
    setCors(res, 'GET,OPTIONS', 'content-type');
    sendJson(res, STATUS.INTERNAL_SERVER_ERROR, { ok: false, error: 'BlobListFailed', details: String(error) });
    return;
  }

  if (!exact) {
    setCors(res, 'GET,OPTIONS', 'content-type');
    sendJson(res, STATUS.NOT_FOUND, { ok: false, error: 'NotFound', id });
    return;
  }

  // Proxy server-side para evitar problemas de CORS y mantener el JSON estable.
  let response;
  try {
    response = await fetch(exact.url, { cache: 'no-store' });
  } catch (error) {
    setCors(res, 'GET,OPTIONS', 'content-type');
    sendJson(res, STATUS.BAD_GATEWAY, { ok: false, error: 'BlobFetchFailed', details: String(error) });
    return;
  }

  const text = await response.text();
  setCors(res, 'GET,OPTIONS', 'content-type');
  res.statusCode = response.ok ? 200 : 502;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=60');
  res.end(text);
}
