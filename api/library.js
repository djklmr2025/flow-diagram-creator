import { list } from '@vercel/blob';

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
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

function sanitizePrefix(input) {
  if (!input) return '';
  let prefix = String(input).trim();
  prefix = prefix.replace(/^\/+/, '');
  prefix = prefix.replace(/\\+/g, '/');
  if (!/^[a-zA-Z0-9/_-]*$/.test(prefix)) return '';
  if (prefix.includes('..')) return '';
  return prefix;
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

  // Prefijo "humano" sin el "library/" interno.
  const prefixParam = sanitizePrefix(url.searchParams.get('prefix'));
  const modeParam = String(url.searchParams.get('mode') || 'folded').toLowerCase();
  const limitParam = Number(url.searchParams.get('limit') || '200');
  const cursor = url.searchParams.get('cursor') || undefined;

  const prefix = prefixParam ? `library/${prefixParam.replace(/\/+$/, '')}/` : 'library/';
  const mode = modeParam === 'expanded' ? 'expanded' : 'folded';
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 1000) : 200;

  let result;
  try {
    result = await list({ prefix, mode, limit, cursor });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: 'BlobListFailed', details: String(error) });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    prefix: prefix.replace(/^library\//, ''),
    mode,
    limit,
    folders: (result.folders || []).map((f) => String(f).replace(/^library\//, '').replace(/\/+$/, '')),
    blobs: (result.blobs || []).map((b) => ({
      pathname: b.pathname.replace(/^library\//, '').replace(/\.json$/i, ''),
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt,
    })),
    cursor: result.cursor || null,
    hasMore: Boolean(result.hasMore),
  });
}

