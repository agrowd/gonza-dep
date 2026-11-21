import nodemailer from 'nodemailer';
import prisma from './db.js';

/**
 * Create a reusable SMTP transporter and sender address.
 * Uses Nodemailer's address object format to avoid shell/dotenv escaping issues.
 */
function getMailConfig() {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT) || 1025;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const bcc = process.env.SMTP_BCC || 'backup.gonzalodepilacion@gmail.com';
  
  let from = 'Gonzalo Depilación <turnos@depilacionparahombres.com>';
  if (process.env.SMTP_FROM) {
    from = process.env.SMTP_FROM;
  } else if (process.env.SMTP_USER) {
    from = `Gonzalo Depilación <${process.env.SMTP_USER}>`;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined
  });

  return { transporter, from, bcc };
}

/**
 * Formats a raw text body into explicit, HTML-safe <p> tags with generous line-height
 * and bottom margin (16px) so that text NEVER collapses into a single glued block in mobile email clients.
 */
export function formatEmailParagraphs(rawText) {
  if (!rawText) return '';
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
    
  return lines
    .map(line => {
      // 1. Auto-detectar URLs planas y convertirlas a enlaces estilizados con dorado de marca #d4a54d
      let processed = line.replace(/(<a\b[^>]*>.*?<\/a>)|(https?:\/\/[^\s<"']+)/gi, (match, anchor, url) => {
        if (anchor) return anchor;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #d4a54d !important; text-decoration: underline !important; font-weight: bold; word-break: break-all;">${url}</a>`;
      });

      // 2. Auto-detectar expresiones temporales relativas (ej: "dentro de 7 días", "en 7 días") que Gmail/iOS linkean en azul y convertirlas a naranja/dorado #d4a54d
      processed = processed.replace(/(<a\b[^>]*>.*?<\/a>)|(\b(?:dentro\s+de|en)\s+\d+\s+(?:d[ií]as?|horas?|hs)\b)/gi, (match, anchor, timeExpr) => {
        if (anchor) return anchor;
        return `<a href="#" class="dummy-link" style="color: #d4a54d !important; text-decoration: none !important; pointer-events: none; cursor: default;"><strong style="color: #d4a54d !important; font-weight: bold;">${timeExpr}</strong></a>`;
      });

      // 3. Proteger expresiones horarias/diarias (ej: "de la noche", "de la tarde", "de la mañana", "la noche anterior") contra detectores de Apple Mail / iOS
      processed = processed.replace(/(<a\b[^>]*>.*?<\/a>)|(\b(?:(?:de|a|por)\s+la\s+(?:noche|tarde|mañana)|la\s+noche\s+anterior)\b)/gi, (match, anchor, expr) => {
        if (anchor) return anchor;
        return `<a href="#" class="dummy-link" style="color: inherit !important; text-decoration: none !important; pointer-events: none; cursor: default;"><span style="color: inherit !important;">${expr}</span></a>`;
      });

      return `<p style="margin: 0 0 16px 0; line-height: 1.65; font-size: 15px; color: #f0ede6;">${processed}</p>`;
    })
    .join('');
}

/**
 * Replaces placeholders in subject strings without HTML tags.
 */
export function applyEmailTemplatePlaceholdersPlain(templateText, clientName = '', turnDetails = {}, address = '') {
  if (!templateText) return '';

  const { fecha, horaInicio, horaFin, zonas, valorSeña, valorTotal } = turnDetails || {};

  const dateObj = fecha ? new Date(fecha) : new Date();
  const rawDateStr = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  const dateFormatted = rawDateStr ? (rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1)) : '';

  const rawWeekday = dateObj.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'UTC' });
  const diaFormatted = rawWeekday ? (rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)) : '';

  let zonesText = '';
  try {
    const zonesArray = typeof zonas === 'string' ? JSON.parse(zonas) : zonas;
    zonesText = Array.isArray(zonesArray) ? zonesArray.map(z => z.nombre || z).join(', ') : (zonas || 'Sesión de depilación');
  } catch (e) {
    zonesText = zonas || 'Sesión de depilación';
  }

  const horaStr = horaInicio ? (horaFin ? `${horaInicio} a ${horaFin}` : `${horaInicio}`) : '';
  const señaNum = Number(valorSeña || 0);
  const totalNum = Number(valorTotal || 0);
  const saldoNum = Math.max(0, totalNum - señaNum);
  const addrStr = address || 'Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)';

  return templateText
    .replace(/(\{|\[)(cliente|nombre|Nombre|Cliente)(\}|\])/gi, clientName || 'Cliente')
    .replace(/(\{|\[)(día|dia|Día|Dia)(\}|\])/gi, diaFormatted)
    .replace(/(\{|\[)(fecha|Fecha|FechaTurno)(\}|\])/gi, dateFormatted)
    .replace(/(\{|\[)(horario|Horario|hora|Hora)(\}|\])(\s*hs\b)?/gi, `${horaStr} hs`)
    .replace(/(\{|\[)(zonas|Zonas)(\}|\])/gi, zonesText)
    .replace(/(\{|\[)(seña|Seña)(\}|\])/gi, () => `$${señaNum.toLocaleString('es-AR')}`)
    .replace(/(\{|\[)(saldo|Saldo)(\}|\])/gi, () => `$${saldoNum.toLocaleString('es-AR')}`)
    .replace(/(\{|\[)(total|Total|valorTotal)(\}|\])/gi, () => `$${totalNum.toLocaleString('es-AR')}`)
    .replace(/(\{|\[)(direccion|dirección|Direccion|Dirección)(\}|\])/gi, addrStr);
}

/**
 * Replaces placeholders in HTML body strings with styled elements.
 * Envuelve fechas, días y horarios en dummy-links en color dorado corporativo #d4a54d
 * para blindarlos contra los detectores automáticos de Safari/iOS Mail y Gmail que los pintan de azul.
 */
export function applyEmailTemplatePlaceholders(templateText, clientName = '', turnDetails = {}, address = '') {
  if (!templateText) return '';

  const { fecha, horaInicio, horaFin, zonas, valorSeña, valorTotal } = turnDetails || {};

  const dateObj = fecha ? new Date(fecha) : new Date();
  const rawDateStr = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  const dateFormatted = rawDateStr ? (rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1)) : '';

  const rawWeekday = dateObj.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'UTC' });
  const diaFormatted = rawWeekday ? (rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)) : '';

  let zonesText = '';
  try {
    const zonesArray = typeof zonas === 'string' ? JSON.parse(zonas) : zonas;
    zonesText = Array.isArray(zonesArray) ? zonesArray.map(z => z.nombre || z).join(', ') : (zonas || 'Sesión de depilación');
  } catch (e) {
    zonesText = zonas || 'Sesión de depilación';
  }

  const horaStr = horaInicio ? (horaFin ? `${horaInicio} a ${horaFin}` : `${horaInicio}`) : '';
  const señaNum = Number(valorSeña || 0);
  const totalNum = Number(valorTotal || 0);
  const saldoNum = Math.max(0, totalNum - señaNum);
  const addrStr = address || 'Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)';

  return templateText
    .replace(/(\{|\[)(cliente|nombre|Nombre|Cliente)(\}|\])/gi, `<strong style="color: #ffffff !important;">${clientName || 'Cliente'}</strong>`)
    .replace(/(\{|\[)(día|dia|Día|Dia)(\}|\])/gi, `<a href="#" class="dummy-link" style="color: #d4a54d !important; text-decoration: none !important; pointer-events: none; cursor: default;"><strong style="color: #d4a54d !important; text-transform: capitalize; font-weight: bold;">${diaFormatted}</strong></a>`)
    .replace(/(\{|\[)(fecha|Fecha|FechaTurno)(\}|\])/gi, `<a href="#" class="dummy-link" style="color: #d4a54d !important; text-decoration: none !important; pointer-events: none; cursor: default;"><strong style="color: #d4a54d !important; text-transform: capitalize; font-weight: bold;">${dateFormatted}</strong></a>`)
    .replace(/(\{|\[)(horario|Horario|hora|Hora)(\}|\])(\s*hs\b)?/gi, `<a href="#" class="dummy-link" style="color: #d4a54d !important; text-decoration: none !important; pointer-events: none; cursor: default;"><strong style="color: #d4a54d !important; font-weight: bold;">${horaStr} hs</strong></a>`)
    .replace(/(\{|\[)(zonas|Zonas)(\}|\])/gi, `<strong style="color: #ffffff !important;">${zonesText}</strong>`)
    .replace(/(\{|\[)(seña|Seña)(\}|\])/gi, () => `<strong style="color: #a5d6a7 !important;">$${señaNum.toLocaleString('es-AR')}</strong>`)
    .replace(/(\{|\[)(saldo|Saldo)(\}|\])/gi, () => `<strong style="color: #ffb74d !important;">$${saldoNum.toLocaleString('es-AR')}</strong>`)
    .replace(/(\{|\[)(total|Total|valorTotal)(\}|\])/gi, () => `<strong style="color: #ffffff !important;">$${totalNum.toLocaleString('es-AR')}</strong>`)
    .replace(/(\{|\[)(direccion|dirección|Direccion|Dirección)(\}|\])/gi, `<a href="#" class="dummy-link" style="color: #ffffff !important; text-decoration: none !important; pointer-events: none; cursor: default;"><strong style="color: #ffffff !important;">${addrStr}</strong></a>`);
}

/**
 * Construye la plantilla HTML base responsiva para correos en tema oscuro, con detalles dorados corporativos (#d4a54d),
 * supresión explícita de detectores automáticos azules en WebKit/iOS Mail y alto contraste.
 */
export function buildDarkTemplateEmailHtml({ subject, clientName = '', formattedBodyHtml = '', includeGreeting = true }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #121212;
      color: #f0ede6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Enlaces generales y autolinks en dorado/ámbar #d4a54d */
    a, a:link, a:visited, a:hover, a:active {
      color: #d4a54d !important;
      text-decoration: underline !important;
    }

    /* Enlaces inertes de fecha/hora/dirección sin subrayado */
    a.dummy-link,
    a.dummy-link:link,
    a.dummy-link:visited,
    a.dummy-link:hover,
    a.dummy-link:active {
      color: #d4a54d !important;
      text-decoration: none !important;
      cursor: default !important;
      pointer-events: none !important;
      border: none !important;
    }

    /* Supresión estricta de letras azules de detectores automáticos de iOS / Apple Mail */
    x-apple-data-detectors,
    x-apple-data-detectors a,
    .x-apple-data-detectors a,
    a[x-apple-data-detectors],
    a[href^="x-apple-data-detectors"],
    a[href^="calendar:"],
    a[href^="tel:"],
    a[href^="sms:"] {
      color: #d4a54d !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* Supresión de color azul en Gmail (web y app), Outlook y Samsung Mail */
    u + #body a,
    #MessageViewBody a,
    .a3s a,
    div.a3s a,
    a[href*="calendar.google.com"],
    a[data-date],
    a[data-event] {
      color: #d4a54d !important;
      text-decoration: none !important;
    }

    a.dummy-link strong {
      color: #d4a54d !important;
    }

    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #1d1d1d;
      border: 1px solid #d4a54d;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    .header {
      background-color: #282a2b;
      border-bottom: 2px solid #d4a54d;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #d4a54d;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
      font-size: 16px;
    }
    .greeting {
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 20px;
    }
    .footer {
      background-color: #121212;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #777777;
      border-top: 1px solid #282a2b;
    }
  </style>
</head>
<body id="body">
  <div class="container">
    <div class="header">
      <h1>GONZALO DEPILACIÓN LÁSER</h1>
    </div>
    <div class="content">
      ${includeGreeting && clientName ? `<div class="greeting">Hola ${clientName},</div>` : ''}
      ${formattedBodyHtml}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
      Paraná 597, Piso 8, Depto 48 (Tribunales, CABA).
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends a notification email to a client who did not show up for their scheduled appointment.
 */
export async function sendNoShowEmail(clientEmail, clientName, turnDetails, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_noshow_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_noshow_body' } });
      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_noshow config from DB:', e);
    }
  }

  const defaultSubject = 'Aviso de turno no asistido - Gonzalo Depilación';
  const defaultBody = "Lamentamos informarte que, según nuestras políticas de cancelación y de reserva vigentes, la seña abonada de {seña} se retiene para cubrir los costos logísticos y operativos de la sesión reservada que no pudimos utilizar.\n\nSi deseas programar una nueva sesión de depilación láser, puedes hacerlo en cualquier momento a través de nuestro portal web ingresando con tu usuario habitual o reservando un nuevo turno.";

  const rawSubject = subjectTemplate || defaultSubject;
  const rawBody = bodyTemplate || defaultBody;

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, clientName, turnDetails);
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, clientName, turnDetails);
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const hasGreetingInBody = /^\s*¡?\s*Hola\b/i.test(rawBody);
  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: clientName || 'Cliente',
    formattedBodyHtml,
    includeGreeting: !hasGreetingInBody
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends a confirmation email when an appointment is confirmed (paid or manually booked).
 */
export async function sendConfirmationEmail(clientEmail, clientName, turnDetails, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_confirmation_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_confirmation_body' } });
      const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });
      const address = addressConfig?.value || 'Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)';

      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_confirmation config from DB:', e);
    }
  }

  const defaultSubject = 'Confirmación de turno - Gonzalo Depilación';
  const defaultBody = "¡Tu reserva ha sido confirmada con éxito!\n\nA continuación te detallamos los datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario}\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. En caso de no poder asistir, te pedimos que avises con un mínimo de 72 hs de anticipación para reprogramar tu seña.\n\n¡Te esperamos!";

  const rawSubject = subjectTemplate || defaultSubject;
  const rawBody = bodyTemplate || defaultBody;

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, clientName, turnDetails);
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, clientName, turnDetails);
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const hasGreetingInConfirm = /^\s*¡?\s*Hola\b/i.test(rawBody);
  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: clientName || 'Cliente',
    formattedBodyHtml,
    includeGreeting: !hasGreetingInConfirm
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends a cancellation email when an appointment is cancelled.
 */
export async function sendCancellationEmail(clientEmail, clientName, turnDetails, withLossOfDeposit = false, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_cancellation_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_cancellation_body' } });
      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_cancellation config from DB:', e);
    }
  }

  const defaultSubject = 'Cancelación de turno - Gonzalo Depilación';

  const señaMonto = Number(turnDetails?.valorSeña || 0);
  const lossNoticeLine = señaMonto > 0
    ? 'Tené en cuenta que, de acuerdo a nuestras políticas de reserva y cancelación, la seña abonada de {seña} se pierde y no es reembolsable.'
    : '';
  const preservedNoticeLine = señaMonto > 0
    ? 'Tu seña abonada de {seña} queda registrada a tu favor para tu próxima sesión.'
    : '';

  const defaultBody = withLossOfDeposit
    ? `Te informamos que tu turno para depilación láser ha sido cancelado:\n\n- Fecha: {fecha}\n- Horario: {horario}\n- Zonas: {zonas}${lossNoticeLine ? `\n\n${lossNoticeLine}` : ''}\n\nSi deseas agendar una nueva cita, podés hacerlo ingresando a nuestro sitio web:\nhttps://agenda.depilacionparahombres.com/`
    : `Te informamos que tu turno para depilación láser ha sido cancelado:\n\n- Fecha: {fecha}\n- Horario: {horario}\n- Zonas: {zonas}${preservedNoticeLine ? `\n\n${preservedNoticeLine}` : ''}\n\nSi deseas agendar una nueva cita, podés hacerlo ingresando a nuestro sitio web:\nhttps://agenda.depilacionparahombres.com/`;

  const rawSubject = subjectTemplate || defaultSubject;
  let rawBody = bodyTemplate || defaultBody;

  // Garantizar que si hay una plantilla personalizada en BD, igualmente se incluya el aviso de retención/pérdida o conservación de seña (D-174)
  if (bodyTemplate && señaMonto > 0) {
    const injectBeforeCta = (baseText, noticeText) => {
      const ctaMatch = baseText.match(/\n\s*(Si dese[aá]s|Para agendar|Pod[eé]s|https?:\/\/)/i);
      if (ctaMatch && ctaMatch.index !== undefined) {
        return `${baseText.slice(0, ctaMatch.index).trimEnd()}\n\n${noticeText}\n\n${baseText.slice(ctaMatch.index).trimStart()}`;
      }
      return `${baseText.trimEnd()}\n\n${noticeText}`;
    };

    if (withLossOfDeposit && !/seña|reten|pierd|reembols/i.test(rawBody)) {
      rawBody = injectBeforeCta(rawBody, lossNoticeLine);
    } else if (!withLossOfDeposit && !/seña|favor/i.test(rawBody)) {
      rawBody = injectBeforeCta(rawBody, preservedNoticeLine);
    }
  }

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, clientName, turnDetails);
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, clientName, turnDetails);
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const hasGreetingInCancel = /^\s*¡?\s*Hola\b/i.test(rawBody);
  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: clientName || 'Cliente',
    formattedBodyHtml,
    includeGreeting: !hasGreetingInCancel
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends a digital receipt of the appointment / deposit to the client.
 */
export async function sendReceiptEmail(clientEmail, clientName, turnDetails) {
  const { transporter, from, bcc } = getMailConfig();

  const { fecha, horaInicio, zonas, valorSeña, valorTotal } = turnDetails;
  
  const dateObj = new Date(fecha);
  const dateFormatted = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

  let zonesText = '';
  try {
    const zonesArray = JSON.parse(zonas);
    zonesText = zonesArray.map(z => z.nombre).join(', ');
  } catch (e) {
    zonesText = zonas || 'Sesión de depilación';
  }

  let parsedZones = [];
  try {
    const zonesArray = typeof zonas === 'string' ? JSON.parse(zonas) : zonas;
    parsedZones = Array.isArray(zonesArray) ? zonesArray : [{ nombre: zonesText, precio: valorTotal }];
  } catch (e) {
    parsedZones = [{ nombre: zonesText, precio: valorTotal }];
  }

  const receiptDate = dateObj.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });

  const receiptNum = `000000${(turnDetails.id ? String(turnDetails.id).replace(/\D/g, '').slice(-3) : '') || '01'}`.slice(-8);

  const tableRows = parsedZones.map(z => {
    const isOtros = z.id === 'otros' || String(z.nombre || '').toLowerCase().startsWith('otros');
    const hasExplicitPrice = z.precio !== undefined && z.precio !== null && z.precio !== '';
    const itemPrice = hasExplicitPrice
      ? Number(z.precio)
      : (isOtros ? 0 : (valorTotal / (parsedZones.length || 1)));
    const hidePrice = isOtros && itemPrice <= 0;
    const priceCell = hidePrice ? '' : `$${Math.round(Number(itemPrice)).toLocaleString('es-AR')}`;
    return `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="width: 38%; padding: 8px 6px; font-size: 12px; color: #111111; word-break: break-word; vertical-align: middle;">${z.nombre || 'Sesión de Depilación'}</td>
        <td style="width: 25%; padding: 8px 4px; font-size: 12px; color: #111111; text-align: right; white-space: nowrap; vertical-align: middle;">${priceCell}</td>
        <td style="width: 13%; padding: 8px 2px; font-size: 12px; color: #111111; text-align: center; vertical-align: middle;">1</td>
        <td style="width: 24%; padding: 8px 4px; font-size: 12px; color: #111111; text-align: right; font-weight: bold; white-space: nowrap; vertical-align: middle;">${priceCell}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <title>Recibo Comercial - Gonzalo Depilación</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #111111; margin: 0; padding: 12px 6px; -webkit-text-size-adjust: 100%; }
        a, a:link, a:visited { color: #111111 !important; text-decoration: none !important; }
        x-apple-data-detectors, x-apple-data-detectors a { color: #111111 !important; text-decoration: none !important; }
        .receipt-container { width: 100%; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 2px solid #333333; padding: 16px 14px; box-sizing: border-box; overflow: hidden; }
        .header-table { width: 100%; border-collapse: collapse; border: 1px solid #777777; margin-bottom: 12px; }
        .client-box { border: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; margin-bottom: 12px; background-color: #fafafa; word-break: break-word; }
        .items-table { width: 100% !important; max-width: 100% !important; table-layout: fixed !important; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #cccccc; box-sizing: border-box; }
        .total-box { text-align: right; font-size: 15px; font-weight: bold; padding: 10px 0; border-top: 2px solid #333333; margin-top: 12px; }
        .footer-legend { text-align: center; font-size: 10px; color: #666666; margin-top: 15px; border-top: 1px solid #eeeeee; padding-top: 8px; }
        @media only screen and (max-width: 480px) {
          body { padding: 4px 2px !important; }
          .receipt-container { padding: 10px 8px !important; border-width: 1.5px !important; }
          .header-left-title { font-size: 12px !important; }
          .header-left-sub { font-size: 9.5px !important; }
          .header-x-letter { font-size: 18px !important; }
          .header-x-sub { font-size: 7px !important; }
          .header-right-title { font-size: 12px !important; }
          .header-right-sub { font-size: 9.5px !important; }
          .client-box { padding: 6px 8px !important; font-size: 11px !important; }
          .items-table th { padding: 6px 3px !important; font-size: 10.5px !important; }
          .items-table td { padding: 6px 3px !important; font-size: 10.5px !important; }
          .total-box { font-size: 13.5px !important; }
          .total-box span:last-child { font-size: 15px !important; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <table class="header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 45%; padding: 8px 6px; vertical-align: middle;">
              <h2 class="header-left-title" style="font-size: 14px; margin: 0 0 2px 0; color: #000000; line-height: 1.2;">Gonzalo Depilacion Laser</h2>
              <div class="header-left-sub" style="font-size: 10.5px; color: #333333; line-height: 1.3;">Domicilio comercial: Parana 597 piso 8 depto 48 - CABA</div>
            </td>
            <td style="width: 15%; text-align: center; border-left: 1px solid #cccccc; border-right: 1px solid #cccccc; padding: 4px 2px; vertical-align: middle;">
              <div class="header-x-letter" style="font-size: 20px; font-weight: 900; margin: 0; line-height: 1;">X</div>
              <span class="header-x-sub" style="font-size: 7.5px; display: block; color: #555555; margin-top: 2px; line-height: 1.1;">Doc. no válido como factura</span>
            </td>
            <td style="width: 40%; text-align: right; padding: 8px 6px; vertical-align: middle;">
              <h3 class="header-right-title" style="font-size: 14px; margin: 0 0 2px 0; letter-spacing: 0.5px;">RECIBO</h3>
              <div class="header-right-sub" style="font-size: 10.5px; color: #333333; line-height: 1.3;"><strong>Nº ${receiptNum}</strong></div>
              <div class="header-right-sub" style="font-size: 10.5px; color: #333333; line-height: 1.3;">Fecha emisión: ${receiptDate}</div>
            </td>
          </tr>
        </table>

        <div class="client-box">
          <strong>Nombre / Razón social:</strong> ${clientName}
        </div>

        <table class="items-table" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th style="width: 38%; text-align: left; background-color: #eeeeee; padding: 7px 6px; font-size: 11.5px; border-bottom: 1px solid #cccccc; word-break: break-word;">Servicio</th>
              <th style="width: 25%; text-align: right; background-color: #eeeeee; padding: 7px 4px; font-size: 11.5px; border-bottom: 1px solid #cccccc; white-space: nowrap;">Precio Unit.</th>
              <th style="width: 13%; text-align: center; background-color: #eeeeee; padding: 7px 2px; font-size: 11.5px; border-bottom: 1px solid #cccccc;">Cant.</th>
              <th style="width: 24%; text-align: right; background-color: #eeeeee; padding: 7px 4px; font-size: 11.5px; border-bottom: 1px solid #cccccc; white-space: nowrap;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="total-box">
          <span>Total: </span>
          <span style="font-size: 16px; color: #000000; font-weight: 800;">$${Number(valorTotal).toLocaleString('es-AR')}</span>
        </div>

        <div class="footer-legend">
          <div>Documento no válido como factura</div>
          <div style="margin-top: 3px;">Página 1 de 1</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject: `Recibo de Pago Nº ${receiptNum} - Gonzalo Depilación`,
    html: htmlContent
  });
}

/**
 * Sends a maintenance reminder email to the client.
 */
export async function sendMaintenanceEmail(clientEmail, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_maintenance_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_maintenance_body' } });
      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_maintenance config from DB:', e);
    }
  }

  const defaultSubject = '¡Es hora de tu mantenimiento! - Gonzalo Depilación';
  const defaultBody = "¡Hola {cliente}!\n\nHace dos meses y medio finalizaste tu tratamiento de depilación láser.\n\nTe escribimos para invitarte a realizar una sesión de mantenimiento. Mantener los resultados te ayudará a lucir siempre impecable y conservar el efecto del tratamiento a largo plazo.\n\nPodés reservar tu turno ingresando directamente a nuestro sitio web.\n\n¡Te esperamos!";

  const rawSubject = subjectTemplate || defaultSubject;
  const rawBody = bodyTemplate || defaultBody;

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, 'Cliente', {});
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, 'Cliente', {});
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: '',
    formattedBodyHtml,
    includeGreeting: false
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends a rescheduling email to the client when their appointment details are changed.
 */
export async function sendRescheduleEmail(clientEmail, clientName, turnDetails, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reprogram_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reprogram_body' } });
      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_reprogram config from DB:', e);
    }
  }

  const defaultSubject = 'Reprogramación de turno - Gonzalo Depilación';
  const defaultBody = "Te informamos que tu turno para depilación láser ha sido reprogramado con éxito.\n\nA continuación te detallamos los nuevos datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario}\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si tenés alguna duda, comunicate con nosotros.\n\n¡Te esperamos!";

  const rawSubject = subjectTemplate || defaultSubject;
  const rawBody = bodyTemplate || defaultBody;

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, clientName, turnDetails);
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, clientName, turnDetails);
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const hasGreetingInReschedule = /^\s*¡?\s*Hola\b/i.test(rawBody);
  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: clientName || 'Cliente',
    formattedBodyHtml,
    includeGreeting: !hasGreetingInReschedule
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends a 7-day automated email reminder to the client.
 */
export async function sendReminder7DaysEmail(clientEmail, clientName, turnDetails, address, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reminder_7days_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reminder_7days_body' } });
      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_reminder_7days config from DB:', e);
    }
  }

  const defaultSubject = 'Recordatorio de tu turno en 7 días - Gonzalo Depilación';
  const defaultBody = "¡Hola {cliente}!\n\nTe recordamos que tenés un turno programado para dentro de 7 días:\n\n- Fecha: {fecha}\n- Horario: {horario}\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si necesitás reprogramar o cancelar, recordá hacerlo con un mínimo de 72 hs de anticipación para conservar tu seña.\n\n¡Te esperamos!";

  const rawSubject = subjectTemplate || defaultSubject;
  const rawBody = bodyTemplate || defaultBody;

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, clientName, turnDetails, address);
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, clientName, turnDetails, address);
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const hasGreetingInReminder = /^\s*¡?\s*Hola\b/i.test(rawBody);
  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: clientName || 'Cliente',
    formattedBodyHtml,
    includeGreeting: !hasGreetingInReminder
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends an automated birthday greeting email to the client.
 */
export async function sendBirthdayEmail(clientEmail, clientName, customSubject, customBody) {
  const { transporter, from, bcc } = getMailConfig();

  let subjectTemplate = customSubject;
  let bodyTemplate = customBody;

  if (!subjectTemplate || !bodyTemplate) {
    try {
      const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_birthday_subject' } });
      const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_birthday_body' } });
      if (!subjectTemplate) subjectTemplate = subjectConfig?.value;
      if (!bodyTemplate) bodyTemplate = bodyConfig?.value;
    } catch (e) {
      console.error('Error loading email_birthday config from DB:', e);
    }
  }

  const defaultSubject = '¡Muy Feliz Cumpleaños! 🎉🎂 - Gonzalo Depilación';
  const defaultBody = "¡Hola {cliente}!\n\nDe parte de todo el equipo de Gonzalo Depilación, queremos desearte un muy feliz cumpleaños 🎉🎂.\n\nEsperamos que disfrutes tu día al máximo. Como agradecimiento por tu confianza, tenés una bonificación especial reservada para tu próxima sesión.\n\n¡Felicidades!";

  const cleanName = clientName || 'Cliente';
  const firstName = cleanName.split(' ')[0] || cleanName;

  const rawSubject = (subjectTemplate || defaultSubject)
    .replaceAll('{cliente}', cleanName)
    .replaceAll('[Nombre]', firstName);

  const rawBody = (bodyTemplate || defaultBody)
    .replaceAll('{cliente}', cleanName)
    .replaceAll('[Nombre]', firstName);

  const subject = applyEmailTemplatePlaceholdersPlain(rawSubject, cleanName, {});
  const bodyTextReplaced = applyEmailTemplatePlaceholders(rawBody, cleanName, {});
  const formattedBodyHtml = formatEmailParagraphs(bodyTextReplaced);

  const htmlContent = buildDarkTemplateEmailHtml({
    subject,
    clientName: cleanName,
    formattedBodyHtml,
    includeGreeting: false
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc,
    subject,
    html: htmlContent
  });
}

/**
 * Sends an administrative alert email when WhatsApp service disconnects or requires re-linking.
 */
export async function sendWhatsAppDisconnectAlertEmail(reason = '', details = '') {
  const { transporter, from, bcc } = getMailConfig();

  const recipient = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'turnos@depilacionparahombres.com';
  const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  const subject = '⚠️ ALERTA SISTEMA: Servicio de WhatsApp Desconectado en la Agenda';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: 'Outfit', 'Inter', Arial, sans-serif; background-color: #121212; color: #f0ede6; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #1e1e1e; border: 1px solid #ff5252; border-radius: 12px; overflow: hidden; }
        .header { background-color: #7a1e1e; color: #ffffff; padding: 20px; text-align: center; }
        .content { padding: 25px; line-height: 1.6; }
        .badge { display: inline-block; padding: 6px 12px; background-color: #ff5252; color: #ffffff; font-weight: bold; border-radius: 20px; font-size: 13px; }
        .info-box { background-color: #282a2b; border-left: 4px solid #ff5252; padding: 15px; margin: 15px 0; border-radius: 4px; font-family: monospace; font-size: 13px; color: #ff8a80; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #d4a54d; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; margin-top: 15px; text-align: center; }
        .footer { background-color: #121212; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #282a2b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin:0;">⚠️ ALERTA DE SISTEMA - WHATSAPP</h2>
        </div>
        <div class="content">
          <p><span class="badge">ESTADO: DESCONECTADO</span></p>
          <p>El servicio automatizado de WhatsApp de la agenda de turnos ha detectado una desconexión o desvinculación.</p>
          <div class="info-box">
            <strong>Fecha / Hora:</strong> ${timestamp} hs (ARG)<br>
            <strong>Causa reportada:</strong> ${reason || 'Desconexión detectada o pérdida de conexión en el dispositivo'}<br>
            ${details ? `<strong>Detalles:</strong> ${details}` : ''}
          </div>
          <p><strong>Impacto:</strong> Los recordatorios automáticos por WhatsApp no podrán despacharse hasta restaurar el enlace.</p>
          <p style="text-align: center;">
            <a href="https://agenda.depilacionparahombres.com/admin/notificaciones" class="btn">📱 Re-vincular WhatsApp / Escanear QR</a>
          </p>
          <p style="font-size: 13px; color: #aaa;">El guardián automático del sistema intentará reconectar usando la sesión guardada. Si la sesión fue desvinculada desde el teléfono, por favor ingresá al panel para escanear el código QR.</p>
        </div>
        <div class="footer">
          Gonzalo Depilación - Sistema de Notificaciones de Reserva
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: recipient,
      bcc,
      subject,
      html: htmlContent
    });
    console.log(`[Alert Email] WhatsApp disconnect alert sent to ${recipient}`);
  } catch (err) {
    console.error('[Alert Email] Failed to send WhatsApp disconnect alert email:', err);
  }
}

/**
 * Sends an administrative alert email when WhatsApp service successfully reconnects.
 */
export async function sendWhatsAppReconnectedAlertEmail() {
  const { transporter, from, bcc } = getMailConfig();

  const recipient = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'turnos@depilacionparahombres.com';
  const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  const subject = '✅ SISTEMA RESTAURADO: Servicio de WhatsApp Reconectado';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: 'Outfit', 'Inter', Arial, sans-serif; background-color: #121212; color: #f0ede6; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #1e1e1e; border: 1px solid #4caf50; border-radius: 12px; overflow: hidden; }
        .header { background-color: #2e7d32; color: #ffffff; padding: 20px; text-align: center; }
        .content { padding: 25px; line-height: 1.6; }
        .badge { display: inline-block; padding: 6px 12px; background-color: #4caf50; color: #ffffff; font-weight: bold; border-radius: 20px; font-size: 13px; }
        .info-box { background-color: #282a2b; border-left: 4px solid #4caf50; padding: 15px; margin: 15px 0; border-radius: 4px; font-size: 13px; color: #a5d6a7; }
        .footer { background-color: #121212; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #282a2b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin:0;">✅ SISTEMA RESTAURADO - WHATSAPP</h2>
        </div>
        <div class="content">
          <p><span class="badge">ESTADO: CONECTADO</span></p>
          <p>El guardián del sistema ha restaurado la conexión del servicio de WhatsApp de la agenda exitosamente.</p>
          <div class="info-box">
            <strong>Fecha / Hora:</strong> ${timestamp} hs (ARG)<br>
            <strong>Estado actual:</strong> Conexión activa y lista para despacho de mensajes.
          </div>
          <p>Los envíos y recordatorios automáticos continúan despachándose con normalidad.</p>
        </div>
        <div class="footer">
          Gonzalo Depilación - Sistema de Notificaciones de Reserva
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: recipient,
      bcc,
      subject,
      html: htmlContent
    });
    console.log(`[Alert Email] WhatsApp reconnected alert sent to ${recipient}`);
  } catch (err) {
    console.error('[Alert Email] Failed to send WhatsApp reconnected alert email:', err);
  }
}
