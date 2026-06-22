// Netlify Function: recibe el formulario de la landing, guarda el lead en
// Supabase y envía un email de aviso (Resend). Sin dependencias externas:
// usa fetch nativo (Node 18+ en Netlify).
//
// Variables de entorno necesarias (se configuran en Netlify, fase 3):
//   SUPABASE_URL                 -> https://xxxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    -> clave secreta "service_role" de Supabase
//   RESEND_API_KEY               -> (opcional) clave de Resend para el email
//   NOTIFY_EMAIL                 -> a dónde llega el aviso (Rentalsmart.peru@gmail.com)
//   FROM_EMAIL                   -> (opcional) remitente; por defecto onboarding@resend.dev

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'JSON inválido' });
  }

  // Anti-bot: si el campo trampa "company" viene lleno, fingimos éxito y no guardamos.
  if (data.company) {
    return json(200, { ok: true });
  }

  const nombre = (data.nombre || '').toString().trim().slice(0, 200);
  const email = (data.email || '').toString().trim().slice(0, 200);
  const whatsapp = (data.whatsapp || '').toString().trim().slice(0, 60);
  const zona = (data.zona || '').toString().trim().slice(0, 60);
  const mensaje = (data.mensaje || '').toString().trim().slice(0, 4000);

  if (!nombre || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: 'Nombre y email válido son obligatorios' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Faltan variables de entorno de Supabase');
    return json(500, { error: 'Configuración del servidor incompleta' });
  }

  // 1) Guardar en Supabase
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        nombre,
        email,
        whatsapp,
        zona,
        mensaje,
        origen: 'landing',
        user_agent: (event.headers['user-agent'] || '').slice(0, 400),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Error Supabase:', resp.status, text);
      return json(502, { error: 'No se pudo guardar el lead' });
    }
  } catch (err) {
    console.error('Excepción Supabase:', err);
    return json(502, { error: 'No se pudo guardar el lead' });
  }

  // 2) Email de aviso (opcional: solo si hay clave de Resend)
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
  if (RESEND_API_KEY && NOTIFY_EMAIL) {
    try {
      const FROM_EMAIL = process.env.FROM_EMAIL || 'Rental Smart <onboarding@resend.dev>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [NOTIFY_EMAIL],
          reply_to: email,
          subject: `Nuevo lead: ${nombre} (${zona || 'sin zona'})`,
          html: `
            <h2 style="font-family:sans-serif;color:#1A2538">Nuevo contacto desde la web</h2>
            <table style="font-family:sans-serif;font-size:15px;color:#1A2538;border-collapse:collapse">
              <tr><td style="padding:4px 12px 4px 0"><b>Nombre</b></td><td>${escapeHtml(nombre)}</td></tr>
              <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
              <tr><td style="padding:4px 12px 4px 0"><b>WhatsApp</b></td><td>${escapeHtml(whatsapp) || '—'}</td></tr>
              <tr><td style="padding:4px 12px 4px 0"><b>Zona</b></td><td>${escapeHtml(zona) || '—'}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;vertical-align:top"><b>Mensaje</b></td><td>${escapeHtml(mensaje) || '—'}</td></tr>
            </table>
          `,
        }),
      });
    } catch (err) {
      // No bloquea: el lead ya quedó guardado en Supabase.
      console.error('Error enviando email (no crítico):', err);
    }
  }

  return json(200, { ok: true });
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
