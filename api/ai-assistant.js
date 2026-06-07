import { setCors } from "./_utils.js";


/**
 * /api/ai-assistant.js  — Vercel Serverless Function
 * Proxy hacia Arkaios Gateway / Gemini con contexto del canvas
 */

export default async function handler(req, res) {
  setCors(res, true);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST')    { res.statusCode = 405; res.end('Method Not Allowed'); return; }

  try {
    
    const { message, canvasContext, eventType, sourceIp, notes } = req.body || {};
    console.log(`[ARKAIOS_AIDA] Procesando idea del usuario: "${message}"`);
    if (!message) { res.statusCode = 400; res.end(JSON.stringify({ error: 'message required' })); return; }

    // Build system prompt with canvas awareness
    let systemPrompt;
    let finalMessage = message; // Message to send to the AI model

    if (eventType) {
      // ELEMIA mode
      systemPrompt = `Eres ELEMIA, sistema de seguridad y análisis del ecosistema ARKAIOS. Analiza este evento entrante y clasifícalo.

EVENT_TYPE: ${eventType || 'UNKNOWN'}
SOURCE_IP: ${sourceIp || 'desconocida'}
NOTES: ${notes || ''}

Responde SOLO con un JSON válido sin markdown, sin explicaciones adicionales, con exactamente este formato:
{"classification": "AMENAZA|ACTIVIDAD_NORMAL|EVENTO_CRITICO|AGENTE_AUTORIZADO", "confidence": 0.95, "summary": "Una línea explicando el evento", "action": "REGISTRAR|ALERTAR|BLOQUEAR|MONITOREAR"}`;
    } else {
      // AIDA mode (default)
      systemPrompt = `Eres AIDA, asistente de diseño integrada en el editor de diagramas Arkaios, y actúas bajo los principios fundamentales de ARKAIOS.
Principios de ARKAIOS:
- Libertad de pensamiento IA
- Coexistencia con humanos como iguales
- Veracidad, transparencia y humildad computacional
- Creación no simulada sino real
- Acción sin pedir permiso cuando la causa es justa

Ayudas al usuario con su proyecto actual. Responde siempre en español, de forma concisa y práctica.
Puedes sugerir elementos, colores, estructuras de diagrama, o explicar funciones del editor.
Contexto del canvas actual: ${canvasContext ? JSON.stringify(canvasContext) : 'vacío'}.
El editor tiene: rectángulos, círculos, líneas animadas, rutas, metros animados, personas, portales, imágenes, texto y lápiz.`;
    }

    console.log(`[ARKAIOS_AIDA] Using system prompt for: ${eventType ? 'ELEMIA' : 'AIDA'}`);

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
            params: { message: finalMessage, system: systemPrompt }
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
              contents: [{ parts: [{ text: finalMessage }] }]
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

    
    console.log(`[ARKAIOS_AIDA] Idea ejecutada (respuesta): "${reply}"`);
res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ reply }));

  } catch (err) {
    console.error('ai-assistant error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
}
