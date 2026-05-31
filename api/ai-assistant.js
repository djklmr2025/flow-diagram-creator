import { setCors } from './_utils.js';
import { STATUS } from './_status.js';

/**
 * /api/ai-assistant.js  — Vercel Serverless Function
 * Proxy hacia Arkaios Gateway / Gemini con contexto del canvas
 */

export default async function handler(req, res) {
  setCors(res, 'POST,OPTIONS', 'content-type,authorization');
  if (req.method === 'OPTIONS') { res.statusCode = STATUS.NO_CONTENT; res.end(); return; }
  if (req.method !== 'POST')    { res.statusCode = STATUS.METHOD_NOT_ALLOWED; res.end('Method Not Allowed'); return; }

  try {
    const { message, canvasContext } = req.body || {};
    if (!message) { res.statusCode = STATUS.BAD_REQUEST; res.end(JSON.stringify({ error: 'message required' })); return; }

    // Build system prompt with canvas awareness
    const systemPrompt = `Eres AIDA, asistente de diseño integrada en el editor de diagramas Arkaios.
Ayudas al usuario con su proyecto actual. Responde siempre en español, de forma concisa y práctica.
Puedes sugerir elementos, colores, estructuras de diagrama, o explicar funciones del editor.
Contexto del canvas actual: ${canvasContext ? JSON.stringify(canvasContext) : 'vacío'}.
El editor tiene: rectángulos, círculos, líneas animadas, rutas, metros animados, personas, portales, imágenes, texto y lápiz.`;

    // Try Arkaios Gateway first
    const gatewayKey = process.env.ARKAIOS_API_KEY || process.env.VITE_AIDA_AUTH_TOKEN;
    const geminiKey  = process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    let reply = null;

    // ── Option A: Arkaios Gateway ─────────────────────────────────────
    if (gatewayKey) {
      try {
        const r = await fetch('https://arkaios-gateway-open.onrender.com/aida/gateway', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gatewayKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agent_id: 'aida',
            action: 'chat',
            params: { message, system: systemPrompt }
          })
        });
        if (r.ok) {
          const d = await r.json();
          reply = d?.data?.text || d?.result?.note || d?.reply || d?.text;
        }
      } catch (e) { console.error('Arkaios error:', e.message); }
    }

    // ── Option B: Gemini fallback ──────────────────────────────────────
    if (!reply && geminiKey) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ parts: [{ text: message }] }]
            })
          }
        );
        if (r.ok) {
          const d = await r.json();
          reply = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      } catch (e) { console.error('Gemini error:', e.message); }
    }

    if (!reply) {
      reply = 'No pude conectarme al servicio IA. Verifica las variables de entorno ARKAIOS_API_KEY o VITE_GOOGLE_API_KEY en Vercel.';
    }

    res.statusCode = STATUS.OK;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ reply }));

  } catch (err) {
    console.error('ai-assistant error:', err);
    res.statusCode = STATUS.INTERNAL_SERVER_ERROR;
    res.end(JSON.stringify({ error: err.message }));
  }
}
