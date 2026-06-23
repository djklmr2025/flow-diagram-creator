/**
 * /api/mpc-arkaios-image.js — Vercel Serverless Function (FASE 2)
 * MCP Tool: generateimage
 * Wrapper limpio para generación de imágenes vía Arkaios Gateway.
 * Estandariza el input/output para agentes externos MCP.
 */

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/**
 * Extrae la URL de imagen del response del Gateway.
 * Soporta todos los formatos conocidos:
 *  - { data: [{ url }] }      (OpenAI-style)
 *  - { url }                  (directo)
 *  - { image }                (string URL)
 *  - { images: [url] }        (array)
 *  - { result: { url } }      (Arkaios Gateway wrapped)
 *  - { data: { url } }        (nested data)
 */
function extractImageUrl(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw.data) && raw.data[0]?.url) return raw.data[0].url;
  if (typeof raw.url === 'string' && raw.url) return raw.url;
  if (typeof raw.image === 'string' && raw.image) return raw.image;
  if (Array.isArray(raw.images) && raw.images[0]) return raw.images[0];
  if (raw.result?.url) return raw.result.url;
  if (raw.data?.url) return raw.data.url;
  return null;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  // GET: describe el tool
  if (req.method === 'GET') {
    sendJson(res, 200, {
      tool: 'generateimage',
      description: 'Genera una imagen para un concepto dado usando Arkaios Gateway.',
      input: {
        concept: 'string (requerido) - el concepto a ilustrar',
        style: 'string (opcional) - estilo visual. Default: "educativo"'
      },
      output: {
        ok: true,
        concept: 'string',
        imageUrl: 'string | null',
        style: 'string'
      },
      example: { concept: 'Fotosintesis', style: 'educativo' }
    });
    return;
  }

  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method Not Allowed' }); return; }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const { concept, style = 'educativo' } = body;

    if (!concept || typeof concept !== 'string' || !concept.trim()) {
      sendJson(res, 400, { error: 'concept requerido (string no vacío)' });
      return;
    }

    const gatewayKey = process.env.ARKAIOS_API_KEY || process.env.VITE_AIDA_AUTH_TOKEN;

    if (!gatewayKey) {
      sendJson(res, 500, { error: 'ARKAIOS_API_KEY no configurada en Vercel' });
      return;
    }

    const cleanConcept = concept.trim();
    const cleanStyle = typeof style === 'string' && style.trim() ? style.trim() : 'educativo';
    const prompt = `${cleanConcept}, estilo ${cleanStyle}, ilustración clara, fondo blanco, diseño educativo`;

    console.log(`[MPC-IMAGE] Generando imagen para: "${cleanConcept}" (estilo: ${cleanStyle})`);

    const r = await fetch('https://arkaios-gateway-open.onrender.com/aida/gateway', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gatewayKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: 'image',
        action: 'generate',
        params: { prompt }
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => r.status);
      console.error(`[MPC-IMAGE] Gateway respondó ${r.status}:`, errText);
      sendJson(res, 502, {
        ok: false,
        error: `Arkaios Gateway error: ${r.status}`,
        concept: cleanConcept,
        imageUrl: null
      });
      return;
    }

    const data = await r.json();
    const rawImgData = data?.data || data?.result || data;
    const imageUrl = extractImageUrl(rawImgData);

    console.log(`[MPC-IMAGE] ${imageUrl ? 'OK' : 'Sin URL'} para "${cleanConcept}"`);

    sendJson(res, 200, {
      ok: !!imageUrl,
      concept: cleanConcept,
      style: cleanStyle,
      imageUrl: imageUrl || null,
      ...(imageUrl ? {} : { warning: 'Gateway respondió OK pero no se pudo extraer una URL de imagen del payload' })
    });

  } catch (err) {
    console.error('[MPC-IMAGE] Error fatal:', err);
    sendJson(res, 500, { ok: false, error: err.message, imageUrl: null });
  }
}
