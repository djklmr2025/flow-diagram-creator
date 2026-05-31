export function setCors(res, isAiAssistant = false) {
  res.setHeader('access-control-allow-origin', '*');
  if (isAiAssistant) {
    res.setHeader('access-control-allow-methods', 'POST,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type,authorization');
  } else {
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type,x-publish-key');
  }
}

export function sendJson(res, statusCode, data) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}
