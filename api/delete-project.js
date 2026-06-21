import { del } from '@vercel/blob';

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    sendJson(res, 405, { ok: false, error: 'MethodNotAllowed' });
    return;
  }

  const origin = getOrigin(req);
  
  // Opcional: verificación de seguridad con llave
  const requiredKey = process.env.PUBLISH_KEY;
  if (requiredKey) {
    const url = new URL(req.url, origin);
    const key = req.headers['x-publish-key'] || url.searchParams.get('key') || '';
    if (key !== requiredKey) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return;
    }
  }

  // Leer cuerpo
  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    body = text ? JSON.parse(text) : {};
  } catch (e) {
    sendJson(res, 400, { ok: false, error: 'InvalidJSONBody' });
    return;
  }

  const urlToDelete = body.url || new URL(req.url, origin).searchParams.get('url');
  if (!urlToDelete) {
    sendJson(res, 400, { ok: false, error: 'MissingUrl' });
    return;
  }

  try {
    // Borrar el blob directamente por su URL pública
    await del(urlToDelete);
    sendJson(res, 200, { ok: true, message: 'Deleted successfully', url: urlToDelete });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: 'BlobDeleteFailed', details: String(error) });
  }
}
