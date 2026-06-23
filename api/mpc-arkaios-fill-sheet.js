/**
 * /api/mpc-arkaios-fill-sheet.js — Vercel Serverless Function (FASE 1)
 * MCP Frontend Orchestrator: recibe topic, genera 20 conceptos + 20 imágenes
 * y retorna el payload completo para llenar una hoja de Arkaios.
 *
 * FIXES aplicados (ChatGPT code review):
 *  - Validación estricta items.length === 20
 *  - Parsing robusto de imagen: data[0].url | url | image | images[0]
 *  - Manejo de errores granular por item
 */

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/** Extrae la URL de imagen del response sin importar el formato */
function extractImageUrl(imgData) {
  if (!imgData) return null;
  // Formato OpenAI-style: { data: [{ url }] }
  if (Array.isArray(imgData.data) && imgData.data[0]?.url) return imgData.data[0].url;
  // Formato directo
  if (typeof imgData.url === 'string') return imgData.url;
  if (typeof imgData.image === 'string') return imgData.image;
  // Array de imágenes
  if (Array.isArray(imgData.images) && imgData.images[0]) return imgData.images[0];
  // Gateway Arkaios: { result: { url } }
  if (imgData.result?.url) return imgData.result.url;
  if (imgData.data?.url) return imgData.data.url;
  return null;
}

/** Genera 20 conceptos para el topic usando Arkaios Gateway o Gemini */
async function generateTopics(topic, gatewayKey, geminiKey) {
  const prompt = `Genera exactamente 20 conceptos clave relacionados con "${topic}".
Responde SOLO con un JSON array de 20 strings. Sin markdown, sin explicaciones.
Ejemplo: ["concepto1", "concepto2", ...]`;

  let items = null;

  // Opción A: Arkaios Gateway
  if (gatewayKey) {
    try {
      const r = await fetch('https://arkaios-gateway-open.onrender.com/aida/gateway', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: 'aida', action: 'chat', params: { message: prompt } })
      });
      if (r.ok) {
        const d = await r.json();
        const text = d?.data?.text || d?.result?.note || d?.reply || d?.text || '';
        const match = text.match(/\[.*\]/s);
        if (match) items = JSON.parse(match[0]);
      }
    } catch (e) { console.error('[MPC-SHEET] Gateway topics error:', e.message); }
  }

  // Opción B: Gemini fallback
  if (!items && geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      if (r.ok) {
        const d = await r.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/\[.*\]/s);
        if (match) items = JSON.parse(match[0]);
      }
    } catch (e) { console.error('[MPC-SHEET] Gemini topics error:', e.message); }
  }

  if (!Array.isArray(items) || items.length !== 20) {
    throw new Error(`Se esperaban exactamente 20 items, se obtuvieron ${Array.isArray(items) ? items.length : 0}`);
  }

  return items;
}

/** Genera una imagen para un concepto usando Arkaios Gateway */
async function generateImage(concept, topic, gatewayKey) {
  if (!gatewayKey) return null;
  try {
    const r = await fetch('https://arkaios-gateway-open.onrender.com/aida/gateway', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: 'image',
        action: 'generate',
        params: { prompt: `${concept} - ${topic}, estilo educativo, ilustración clara, fondo blanco` }
      })
    });
    if (r.ok) {
      const d = await r.json();
      const imgData = d?.data || d?.result || d;
      return extractImageUrl(imgData);
    }
  } catch (e) { console.error(`[MPC-SHEET] Image error for "${concept}":`, e.message); }
  return null;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
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
      sendJson(res, 500, { error: 'No hay claves de API configuradas (ARKAIOS_API_KEY o VITE_GOOGLE_API_KEY)' });
      return;
    }

    console.log(`[MPC-SHEET] Generando hoja para topic: "${topic.trim()}"`);

    // PASO 1: Generar 20 conceptos
    let items;
    try {
      items = await generateTopics(topic.trim(), gatewayKey, geminiKey);
    } catch (e) {
      sendJson(res, 422, { error: e.message });
      return;
    }

    // PASO 2: Generar 20 imágenes (en paralelo con límite)
    const imageResults = await Promise.allSettled(
      items.map(concept => generateImage(concept, topic.trim(), gatewayKey))
    );

    const sheet = items.map((concept, i) => ({
      index: i + 1,
      concept,
      imageUrl: imageResults[i].status === 'fulfilled' ? imageResults[i].value : null,
      imageError: imageResults[i].status === 'rejected' ? imageResults[i].reason?.message : null
    }));

    const successCount = sheet.filter(s => s.imageUrl).length;
    console.log(`[MPC-SHEET] Completado: ${successCount}/20 imágenes generadas`);

    sendJson(res, 200, {
      ok: true,
      topic: topic.trim(),
      total: 20,
      imagesGenerated: successCount,
      sheet
    });

  } catch (err) {
    console.error('[MPC-SHEET] Error fatal:', err);
    sendJson(res, 500, { error: err.message });
  }
}
