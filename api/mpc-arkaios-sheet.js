/**
 * /api/mpc-arkaios-sheet.js — Vercel Serverless Function (FASE 2)
 * MCP Tool: generatetopic
 * Server-side orchestrator: recibe un topic y retorna 20 conceptos + 20 imágenes.
 * Diseñado para ser llamado por agentes IA puros (sin frontend).
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

function extractImageUrl(imgData) {
  if (!imgData) return null;
  if (Array.isArray(imgData.data) && imgData.data[0]?.url) return imgData.data[0].url;
  if (typeof imgData.url === 'string') return imgData.url;
  if (typeof imgData.image === 'string') return imgData.image;
  if (Array.isArray(imgData.images) && imgData.images[0]) return imgData.images[0];
  if (imgData.result?.url) return imgData.result.url;
  if (imgData.data?.url) return imgData.data.url;
  return null;
}

async function callGateway(gatewayKey, agentId, action, params) {
  const r = await fetch('https://arkaios-gateway-open.onrender.com/aida/gateway', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, action, params })
  });
  if (!r.ok) throw new Error(`Gateway error: ${r.status}`);
  return r.json();
}

async function callGemini(geminiKey, prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  if (!r.ok) throw new Error(`Gemini error: ${r.status}`);
  const d = await r.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function generate20Topics(topic, gatewayKey, geminiKey) {
  const prompt = `Genera exactamente 20 conceptos clave relacionados con "${topic}".
Responde SOLO con un JSON array de 20 strings. Sin markdown, sin explicaciones.
Ejemplo: ["concepto1", "concepto2", ...]`;

  let items = null;

  if (gatewayKey) {
    try {
      const d = await callGateway(gatewayKey, 'aida', 'chat', { message: prompt });
      const text = d?.data?.text || d?.result?.note || d?.reply || d?.text || '';
      const match = text.match(/\[.*\]/s);
      if (match) items = JSON.parse(match[0]);
    } catch (e) { console.error('[MPC-ARKAIOS-SHEET] Gateway error:', e.message); }
  }

  if (!items && geminiKey) {
    try {
      const text = await callGemini(geminiKey, prompt);
      const match = text.match(/\[.*\]/s);
      if (match) items = JSON.parse(match[0]);
    } catch (e) { console.error('[MPC-ARKAIOS-SHEET] Gemini error:', e.message); }
  }

  if (!Array.isArray(items) || items.length !== 20) {
    throw new Error(`Se esperaban exactamente 20 items, se obtuvieron ${Array.isArray(items) ? items.length : 0}`);
  }

  return items;
}

async function generateImageForConcept(concept, topic, gatewayKey) {
  if (!gatewayKey) return null;
  try {
    const d = await callGateway(gatewayKey, 'image', 'generate', {
      prompt: `${concept} - contexto: ${topic}, estilo educativo, ilustración clara, fondo blanco`
    });
    const imgData = d?.data || d?.result || d;
    return extractImageUrl(imgData);
  } catch (e) {
    console.error(`[MPC-ARKAIOS-SHEET] Image error for "${concept}":`, e.message);
    return null;
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  // GET: describe el tool para agentes MCP
  if (req.method === 'GET') {
    sendJson(res, 200, {
      tool: 'generatetopic',
      description: 'Genera 20 conceptos + 20 imágenes para un topic dado.',
      input: { topic: 'string (requerido)' },
      output: {
        ok: true,
        topic: 'string',
        total: 20,
        imagesGenerated: 'number',
        sheet: '[{ index, concept, imageUrl, imageError }]'
      },
      example: { topic: 'Sistema Solar' }
    });
    return;
  }

  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method Not Allowed' }); return; }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const { topic } = body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      sendJson(res, 400, { error: 'topic requerido (string no vacío)' });
      return;
    }

    const gatewayKey = process.env.ARKAIOS_API_KEY || process.env.VITE_AIDA_AUTH_TOKEN;
    const geminiKey = process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!gatewayKey && !geminiKey) {
      sendJson(res, 500, { error: 'No hay claves de API configuradas' });
      return;
    }

    const cleanTopic = topic.trim();
    console.log(`[MPC-ARKAIOS-SHEET] Procesando topic: "${cleanTopic}"`);

    // Paso 1: 20 conceptos
    let items;
    try {
      items = await generate20Topics(cleanTopic, gatewayKey, geminiKey);
    } catch (e) {
      sendJson(res, 422, { error: e.message });
      return;
    }

    // Paso 2: 20 imágenes en paralelo
    const imageResults = await Promise.allSettled(
      items.map(concept => generateImageForConcept(concept, cleanTopic, gatewayKey))
    );

    const sheet = items.map((concept, i) => ({
      index: i + 1,
      concept,
      imageUrl: imageResults[i].status === 'fulfilled' ? imageResults[i].value : null,
      imageError: imageResults[i].status === 'rejected' ? imageResults[i].reason?.message : null
    }));

    const imagesGenerated = sheet.filter(s => s.imageUrl).length;
    console.log(`[MPC-ARKAIOS-SHEET] Completado: ${imagesGenerated}/20 imágenes`);

    sendJson(res, 200, { ok: true, topic: cleanTopic, total: 20, imagesGenerated, sheet });

  } catch (err) {
    console.error('[MPC-ARKAIOS-SHEET] Error fatal:', err);
    sendJson(res, 500, { error: err.message });
  }
}
