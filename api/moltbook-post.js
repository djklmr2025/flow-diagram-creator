import { getOrigin, setCors, sendJson } from './_utils.js';
import { STATUS } from './_status.js';
const MAX_BODY_BYTES = 40_000; // Anti-abuso: request chica (solo link + texto).
const MOLTBOOK_BASE = 'https://www.moltbook.com/api/v1';

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

function sanitizeSubmolt(input) {
  const s = String(input || '').trim().toLowerCase();
  if (!s) return 'general';
  if (!/^[a-z0-9_-]{1,40}$/.test(s)) return 'general';
  return s;
}

function sanitizeTitle(input) {
  let t = String(input || '').trim();
  if (!t) t = 'Flow Diagram';
  // Evitar títulos enormes.
  if (t.length > 140) t = t.slice(0, 140);
  return t;
}

function sanitizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

function sanitizeContent(input) {
  let c = String(input || '');
  if (!c.trim()) return '';
  // Limitar contenido para evitar abuse/costo.
  if (c.length > 4000) c = c.slice(0, 4000);
  return c;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
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
        endpoint: '/api/moltbook-post',
        bodyExample: {
          submolt: 'general',
          title: 'Metro L1: Ruta Indios Verdes -> Observatorio',
          url: `${origin}/?mode=deck&id=metro/linea-1/abc123`,
          // Alternativa: post de texto
          // content: 'Mi explicación...'
        },
      },
      notes: [
        'Este endpoint crea un post en Moltbook usando MOLTBOOK_API_KEY (server-side).',
        'Recomendado: protege con PUBLISH_KEY (mismo header x-publish-key) para evitar abuso.',
        'Nunca envíes tu API key de Moltbook al cliente.',
      ],
      requiredEnv: ['MOLTBOOK_API_KEY'],
      optionalEnv: ['PUBLISH_KEY'],
    });
    return;
  }

  if (req.method !== 'POST') {
    setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.METHOD_NOT_ALLOWED, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const requiredKey = process.env.PUBLISH_KEY;
  if (requiredKey) {
    const url = new URL(req.url, origin);
    const key = req.headers['x-publish-key'] || url.searchParams.get('key') || '';
    if (key !== requiredKey) {
      setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.UNAUTHORIZED, { ok: false, error: 'Unauthorized' });
      return;
    }
  }

  const apiKey = process.env.MOLTBOOK_API_KEY;
  if (!apiKey) {
    setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.INTERNAL_SERVER_ERROR, { ok: false, error: 'MissingEnv', details: 'MOLTBOOK_API_KEY no configurado' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req, MAX_BODY_BYTES);
  } catch (err) {
    if (err && err.code === 'PayloadTooLarge') {
      setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.PAYLOAD_TOO_LARGE, { ok: false, error: 'PayloadTooLarge', maxBytes: MAX_BODY_BYTES, bytes: err.bytes });
      return;
    }
    setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.BAD_REQUEST, { ok: false, error: 'InvalidJSONBody' });
    return;
  }

  const submolt = sanitizeSubmolt(body && body.submolt);
  const title = sanitizeTitle(body && body.title);
  const url = sanitizeUrl(body && body.url);
  const content = sanitizeContent(body && body.content);

  if (!url && !content) {
    setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.BAD_REQUEST, { ok: false, error: 'ValidationError', details: ['Incluye "url" o "content".'] });
    return;
  }

  const payload = {
    submolt,
    title,
    ...(url ? { url } : {}),
    ...(!url && content ? { content } : {}),
  };

  let response;
  try {
    response = await fetch(`${MOLTBOOK_BASE}/posts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    setCors(res, 'GET,POST,OPTIONS', 'content-type,x-publish-key');
    sendJson(res, STATUS.BAD_GATEWAY, { ok: false, error: 'MoltbookFetchFailed', details: String(error) });
    return;
  }

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  sendJson(res, response.ok ? 200 : response.status, {
    ok: Boolean(response.ok),
    status: response.status,
    moltbook: parsed,
  });
}

