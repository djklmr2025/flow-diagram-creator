export function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

export function setCors(res, methods = 'GET,OPTIONS', headers = 'content-type') {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', methods);
  res.setHeader('access-control-allow-headers', headers);
}

export function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(data));
}
