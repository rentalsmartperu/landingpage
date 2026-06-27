// Netlify Function: registra una reclamación/queja del Libro de Reclamaciones,
// genera el correlativo (vía trigger en Supabase) y envía copia por email al
// consumidor y a la empresa (Resend). Sin dependencias: fetch nativo (Node 18+).
//
// Variables de entorno (Netlify): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   RESEND_API_KEY (opcional), NOTIFY_EMAIL, FROM_EMAIL (opcional).

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let d;
  try { d = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'JSON inválido' }); }

  if (d.company) return json(200, { ok: true }); // honeypot

  const s = (v, n = 4000) => (v == null ? '' : String(v).trim().slice(0, n));
  const reg = {
    nombre: s(d.nombre, 200),
    documento: s(d.documento, 40),
    telefono: s(d.telefono, 40),
    email: s(d.email, 200),
    es_menor: d.menor === 'Si' || d.es_menor === true,
    apoderado: s(d.apoderado, 300),
    tipo_bien: s(d.tipo_bien, 20),
    monto: d.monto ? Number(d.monto) : null,
    descripcion_bien: s(d.descripcion_bien),
    tipo_reclamo: s(d.tipo_reclamo, 20),
    detalle: s(d.detalle),
    pedido: s(d.pedido),
    acepta_privacidad: d.acepta_privacidad === true,
  };

  // Validaciones de obligatorios (*)
  if (!reg.nombre || !reg.documento || !reg.telefono ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email) ||
      !reg.descripcion_bien || !reg.tipo_reclamo || !reg.detalle || !reg.pedido) {
    return json(400, { error: 'Faltan campos obligatorios' });
  }
  if (!reg.acepta_privacidad) return json(400, { error: 'Debe aceptar la Política de Privacidad' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { error: 'Config incompleta' });

  // 1) Insertar y recuperar el código generado por el trigger
  let codigo, createdAt;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/reclamaciones`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(reg),
    });
    if (!resp.ok) {
      console.error('Supabase reclamo error:', resp.status, await resp.text());
      return json(502, { error: 'No se pudo registrar el reclamo' });
    }
    const rows = await resp.json();
    codigo = rows[0]?.codigo;
    createdAt = rows[0]?.created_at;
  } catch (err) {
    console.error('Excepción Supabase:', err);
    return json(502, { error: 'No se pudo registrar el reclamo' });
  }

  // 2) Emails (copia al consumidor + aviso a la empresa). No bloquea la respuesta.
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'rentalsmart.peru@gmail.com';
  if (RESEND_API_KEY) {
    const FROM_EMAIL = process.env.FROM_EMAIL || 'Rental Smart <onboarding@resend.dev>';
    const fecha = createdAt ? new Date(createdAt).toLocaleString('es-PE') : '';
    const esQueja = reg.tipo_reclamo === 'Queja';
    const tipoMin = esQueja ? 'queja' : 'reclamo';
    const subjInterno = (esQueja ? 'Nueva queja' : 'Nuevo reclamo') + ` ${codigo} — ${reg.nombre}`;
    const subjConsumidor = `Copia de tu ${tipoMin} N° ${codigo} — Rental Smart`;
    const filas = [
      ['Código', codigo], ['Fecha', fecha],
      ['Nombre', reg.nombre], ['Documento', reg.documento],
      ['Teléfono', reg.telefono], ['Correo', reg.email],
      ['Tipo de bien', reg.tipo_bien], ['Monto (S/)', reg.monto ?? '—'],
      ['Descripción del bien', reg.descripcion_bien],
      ['Tipo', reg.tipo_reclamo], ['Detalle', reg.detalle], ['Pedido', reg.pedido],
    ].map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;vertical-align:top"><b>${k}</b></td><td>${escapeHtml(String(v ?? '—'))}</td></tr>`).join('');

    const htmlConsumidor = `
      <div style="font-family:sans-serif;color:#1A2538">
        <h2>Hemos recibido tu ${tipoMin}</h2>
        <p>Tu ${tipoMin} fue registrado con el código <b>N° ${escapeHtml(codigo)}</b>.</p>
        <p>Te responderemos en un plazo máximo de <b>15 días hábiles</b>.</p>
        <table style="font-size:14px;color:#1A2538;border-collapse:collapse">${filas}</table>
        <p style="color:#7A716A;font-size:12px">RENTAL SMART PERU · contacto@rentalsmart-peru.com</p>
      </div>`;

    const sendEmail = (to, subject, html) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: NOTIFY_EMAIL, subject, html }),
      }).then(r => { if (!r.ok) return r.text().then(t => console.error('Email fail', to, r.status, t)); })
        .catch(e => console.error('Email exception', e));

    // Aviso interno (siempre funciona) + copia al consumidor (requiere dominio verificado en Resend)
    await Promise.allSettled([
      sendEmail(NOTIFY_EMAIL, subjInterno, htmlConsumidor),
      sendEmail(reg.email, subjConsumidor, htmlConsumidor),
    ]);
  }

  return json(200, { ok: true, codigo });
};

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
