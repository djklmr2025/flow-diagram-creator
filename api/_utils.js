export async function readJsonBody(req, maxBytes = Infinity) {
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
