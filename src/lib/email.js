import nodemailer from 'nodemailer';

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

  return { transporter, from };
}

/**
 * Sends a notification email to a client who did not show up for their scheduled appointment.
 */
export async function sendNoShowEmail(clientEmail, clientName, turnDetails) {
  const { transporter, from } = getMailConfig();

  const { fecha, horaInicio, zonas, valorSeña } = turnDetails;
  
  // Format Date (e.g. viernes, 19 de junio de 2026)
  const dateObj = new Date(fecha);
  const dateFormatted = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

  // Try to parse zones string safely
  let zonesText = '';
  try {
    const zonesArray = JSON.parse(zonas);
    zonesText = zonesArray.map(z => z.nombre).join(', ');
  } catch (e) {
    zonesText = zonas || 'Sesión de depilación';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Aviso de Turno No Asistido</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
        .highlight-box {
          background-color: #282a2b;
          border-left: 4px solid #d4a54d;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .highlight-title {
          font-weight: bold;
          color: #d4a54d;
          margin-bottom: 10px;
          font-size: 15px;
          text-transform: uppercase;
        }
        .details-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .details-list li {
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }
        .details-label {
          color: #b0adab;
        }
        .details-value {
          font-weight: bold;
          color: #ffffff;
        }
        .note {
          font-size: 14px;
          color: #b0adab;
          border-top: 1px solid #282a2b;
          padding-top: 20px;
          margin-top: 30px;
        }
        .footer {
          background-color: #121212;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #777777;
          border-top: 1px solid #282a2b;
        }
        .footer a {
          color: #d4a54d;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="greeting">Hola ${clientName},</div>
          <p>Te escribimos para informarte que hemos registrado tu <strong>inasistencia</strong> al turno programado.</p>
          
          <div class="highlight-box">
            <div class="highlight-title">Detalles del Turno</div>
            <ul class="details-list">
              <li>
                <span class="details-label">Fecha:</span>
                <span class="details-value" style="color: #ffffff !important; text-decoration: none !important;">${dateFormatted}</span>
              </li>
              <li>
                <span class="details-label">Horario:</span>
                <span class="details-value" style="color: #d4a54d !important; text-decoration: none !important; font-weight: bold;">${horaInicio} hs</span>
              </li>
              <li>
                <span class="details-label">Zonas:</span>
                <span class="details-value">${zonesText}</span>
              </li>
              <li>
                <span class="details-label">Seña abonada:</span>
                <span class="details-value" style="color: #ff8a8a;">$${valorSeña.toLocaleString()}</span>
              </li>
            </ul>
          </div>

          <p>Lamentamos informarte que, según nuestras políticas de cancelación y de reserva vigentes, <strong>la seña abonada se retiene para cubrir los costos logísticos y operativos</strong> de la sesión reservada que no pudimos utilizar.</p>
          
          <p>Si deseas programar una nueva sesión de depilación láser, puedes hacerlo en cualquier momento a través de nuestro portal web ingresando con tu usuario habitual o reservando un nuevo turno.</p>

          <div class="note">
            Si crees que esto ha sido un error de registro o tuviste un inconveniente de fuerza mayor, por favor contáctanos directamente respondiendo a este correo o escribiéndonos por WhatsApp para que podamos evaluar tu situación.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Diseñado para brindarte el mejor servicio en depilación láser masculina.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: `Aviso de turno no asistido - Gonzalo Depilación`,
    html: htmlContent
  });
}

/**
 * Sends a confirmation email when an appointment is confirmed (paid or manually booked).
 */
export async function sendConfirmationEmail(clientEmail, clientName, turnDetails) {
  const { transporter, from } = getMailConfig();

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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmación de Turno</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
        .highlight-box {
          background-color: #282a2b;
          border-left: 4px solid #d4a54d;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .highlight-title {
          font-weight: bold;
          color: #d4a54d;
          margin-bottom: 10px;
          font-size: 15px;
          text-transform: uppercase;
        }
        .details-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .details-list li {
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }
        .details-label {
          color: #b0adab;
        }
        .details-value {
          font-weight: bold;
          color: #ffffff;
        }
        .note {
          font-size: 14px;
          color: #b0adab;
          border-top: 1px solid #282a2b;
          padding-top: 20px;
          margin-top: 30px;
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
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="greeting">Hola ${clientName},</div>
          <p>¡Tu reserva ha sido confirmada con éxito! A continuación te detallamos los datos de tu turno:</p>
          
          <div class="highlight-box">
            <div class="highlight-title">Detalles del Turno</div>
            <ul class="details-list">
              <li>
                <span class="details-label">Fecha:</span>
                <span class="details-value" style="text-transform: capitalize; color: #ffffff !important; text-decoration: none !important;">${dateFormatted}</span>
              </li>
              <li>
                <span class="details-label">Horario:</span>
                <span class="details-value" style="color: #d4a54d !important; text-decoration: none !important; font-weight: bold;">${horaInicio} hs</span>
              </li>
              <li>
                <span class="details-label">Zonas:</span>
                <span class="details-value">${zonesText}</span>
              </li>
              <li>
                <span class="details-label">Valor Total:</span>
                <span class="details-value">$${valorTotal.toLocaleString()}</span>
              </li>
              <li>
                <span class="details-label">Seña abonada:</span>
                <span class="details-value" style="color: #a5d6a7;">$${valorSeña.toLocaleString()}</span>
              </li>
              <li>
                <span class="details-label">Saldo restante a pagar en el local:</span>
                <span class="details-value" style="color: #ffb74d;">$${(valorTotal - valorSeña).toLocaleString()}</span>
              </li>
            </ul>
          </div>

          <div class="note">
            <strong>⚠️ Recordatorios importantes:</strong><br>
            - Recordá venir <strong>afeitado al ras</strong> con maquinita de afeitar (24 horas antes) en las zonas a depilar. No uses cera ni pinza.<br>
            - Por favor asistí con puntualidad. La tolerancia máxima de demora es de solo <strong>5 minutos</strong>.<br>
            - Dirección del estudio: <strong>Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)</strong>.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Para reprogramar o cancelar, por favor ponte en contacto con nosotros.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: `Confirmación de turno - Gonzalo Depilación`,
    html: htmlContent
  });
}

/**
 * Sends a cancellation email when an appointment is cancelled.
 */
export async function sendCancellationEmail(clientEmail, clientName, turnDetails, withLossOfDeposit = false) {
  const { transporter, from } = getMailConfig();

  const { fecha, horaInicio, zonas, valorSeña } = turnDetails;
  
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

  const policyText = withLossOfDeposit
    ? `<p style="margin-bottom: 1.5rem; line-height: 1.6;">Debido a que la cancelación se realizó con **menos de 72 horas** de anticipación, de acuerdo con nuestras políticas corporativas, la seña abonada de <strong>$${(valorSeña || 0).toLocaleString()}</strong> ha sido retenida para cubrir los costos de reserva del espacio.</p>`
    : `<p style="margin-bottom: 1.5rem; line-height: 1.6;">Al haberse realizado la cancelación con **más de 72 horas** de anticipación (o por disposición administrativa), tu seña original de <strong>$${(valorSeña || 0).toLocaleString()}</strong> queda registrada <strong>a tu favor</strong>. Por favor, ponte en contacto con nosotros para coordinar la reprogramación de tu cita utilizando esta seña.</p>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cancelación de Turno</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
          margin: 0;
          color: #d4a54d;
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
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 20px;
        }
        .highlight-box {
          background-color: #282a2b;
          border-left: 4px solid #d4a54d;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .highlight-title {
          font-weight: bold;
          color: #d4a54d;
          margin-bottom: 10px;
          font-size: 15px;
          text-transform: uppercase;
        }
        .details-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .details-list li {
          margin-bottom: 10px;
          font-size: 15px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dotted rgba(255,255,255,0.05);
          padding-bottom: 8px;
        }
        .details-list li:last-child {
          margin-bottom: 0;
          border-bottom: none;
          padding-bottom: 0;
        }
        .details-label {
          color: #b0adab;
        }
        .details-value {
          font-weight: bold;
          color: #ffffff;
        }
        .note {
          font-size: 14px;
          color: #b0adab;
          border-top: 1px solid #282a2b;
          padding-top: 20px;
          margin-top: 30px;
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
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="greeting">Hola ${clientName},</div>
          <p style="margin-bottom: 1rem; line-height: 1.6;">Te informamos que tu turno para depilación láser ha sido <strong>cancelado</strong>:</p>
          
          <div class="highlight-box">
            <div class="highlight-title">Detalles del Turno Cancelado</div>
            <ul class="details-list">
              <li>
                <span class="details-label">Fecha:</span>
                <span class="details-value" style="text-transform: capitalize; color: #ffffff !important; text-decoration: none !important;">${dateFormatted}</span>
              </li>
              <li>
                <span class="details-label">Horario:</span>
                <span class="details-value" style="color: #d4a54d !important; text-decoration: none !important; font-weight: bold;">${horaInicio} hs</span>
              </li>
              <li>
                <span class="details-label">Zonas:</span>
                <span class="details-value">${zonesText}</span>
              </li>
            </ul>
          </div>

          ${policyText}

          <div class="note">
            Si crees que esto es un error o deseas volver a agendar tu turno, podés hacerlo a través de nuestro sitio web en cualquier momento.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Diseñado para brindarte el mejor servicio en depilación láser masculina.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailSubject = withLossOfDeposit
    ? `Cancelación de turno (seña retenida) - Gonzalo Depilación`
    : `Cancelación de turno - Gonzalo Depilación`;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: mailSubject,
    html: htmlContent
  });
}

/**
 * Sends a digital receipt of the appointment / deposit to the client.
 */
export async function sendReceiptEmail(clientEmail, clientName, turnDetails) {
  const { transporter, from } = getMailConfig();

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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Comprobante de Pago / Seña</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
          text-align: center;
        }
        .receipt-badge {
          background-color: rgba(212, 165, 77, 0.1);
          border: 1px dashed #d4a54d;
          color: #d4a54d;
          padding: 15px;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          border-radius: 6px;
          margin-bottom: 25px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .highlight-box {
          background-color: #282a2b;
          border-left: 4px solid #d4a54d;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .highlight-title {
          font-weight: bold;
          color: #d4a54d;
          margin-bottom: 10px;
          font-size: 15px;
          text-transform: uppercase;
        }
        .details-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .details-list li {
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }
        .details-label {
          color: #b0adab;
        }
        .details-value {
          font-weight: bold;
          color: #ffffff;
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
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="greeting">Comprobante de Turno y Pago</div>
          <div class="receipt-badge">Recibo Digital Emitido</div>
          
          <p>Hola <strong>\${clientName}</strong>, te adjuntamos el comprobante detallado de tu reserva y los importes facturados:</p>
          
          <div class="highlight-box">
            <div class="highlight-title">Detalle de Facturación</div>
            <ul class="details-list">
              <li>
                <span class="details-label">Fecha del Turno:</span>
                <span class="details-value" style="text-transform: capitalize; color: #ffffff !important; text-decoration: none !important;">\${dateFormatted}</span>
              </li>
              <li>
                <span class="details-label">Horario:</span>
                <span class="details-value" style="color: #d4a54d !important; text-decoration: none !important; font-weight: bold;">\${horaInicio} hs</span>
              </li>
              <li>
                <span class="details-label">Zonas Contratadas:</span>
                <span class="details-value">\${zonesText}</span>
              </li>
              <li style="border-top: 1px solid #3d3d3d; padding-top: 10px; margin-top: 10px;">
                <span class="details-label">Valor Total del Servicio:</span>
                <span class="details-value">\$\${valorTotal.toLocaleString()}</span>
              </li>
              <li>
                <span class="details-label">Monto de Seña Abonado:</span>
                <span class="details-value" style="color: #a5d6a7;">\$\${valorSeña.toLocaleString()}</span>
              </li>
              <li>
                <span class="details-label">Saldo Pendiente de Pago:</span>
                <span class="details-value" style="color: #ffb74d;">\$\${(valorTotal - valorSeña).toLocaleString()}</span>
              </li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #b0adab; text-align: center; margin-top: 25px;">
            Este documento sirve como comprobante de reserva y del pago de la seña indicada.
          </p>
        </div>
        <div class="footer">
          &copy; \${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Paraná 597, Piso 8, Depto 48 (Tribunales, CABA).
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: `Comprobante de Turno - Gonzalo Depilación`,
    html: htmlContent
  });
}

/**
 * Sends a maintenance reminder email to the client.
 */
export async function sendMaintenanceEmail(clientEmail, subject, bodyText) {
  const { transporter, from } = getMailConfig();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>\${subject}</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
        .body-text {
          margin-bottom: 25px;
          white-space: pre-line;
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
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="body-text">\${bodyText}</div>
        </div>
        <div class="footer">
          &copy; \${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Paraná 597, Piso 8, Depto 48 (Tribunales, CABA).
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: subject,
    html: htmlContent
  });
}

/**
 * Sends a rescheduling email to the client when their appointment details are changed.
 */
export async function sendRescheduleEmail(clientEmail, clientName, turnDetails, subjectTemplate, bodyTemplate) {
  const { transporter, from } = getMailConfig();

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

  const address = 'Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)';

  const replacePlaceholders = (text) => {
    if (!text) return '';
    return text
      .replaceAll('{fecha}', `<span style="color: #ffffff !important; font-weight: bold; text-decoration: none !important;">${dateFormatted}</span>`)
      .replaceAll('{horario}', `<span style="color: #d4a54d !important; font-weight: bold; text-decoration: none !important;">${horaInicio} hs</span>`)
      .replaceAll('{zonas}', zonesText)
      .replaceAll('{seña}', `$${valorSeña.toLocaleString()}`)
      .replaceAll('{saldo}', `$${(valorTotal - valorSeña).toLocaleString()}`)
      .replaceAll('{direccion}', address);
  };

  const subject = replacePlaceholders(subjectTemplate || 'Reprogramación de turno - Gonzalo Depilación');
  const bodyText = replacePlaceholders(bodyTemplate || 'Tu turno ha sido reprogramado con éxito.');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
        .body-text {
          margin-bottom: 25px;
          white-space: pre-line;
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
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="greeting">Hola ${clientName},</div>
          <div class="body-text">${bodyText}</div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Paraná 597, Piso 8, Depto 48 (Tribunales, CABA).
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: subject,
    html: htmlContent
  });
}

/**
 * Sends a 7-day automated email reminder to the client.
 */
export async function sendReminder7DaysEmail(clientEmail, clientName, turnDetails, address, subjectTemplate, bodyTemplate) {
  const { transporter, from } = getMailConfig();

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

  const replacePlaceholders = (text) => {
    if (!text) return '';
    return text
      .replaceAll('{fecha}', `<span style="color: #ffffff !important; font-weight: bold; text-decoration: none !important;">${dateFormatted}</span>`)
      .replaceAll('{horario}', `<span style="color: #d4a54d !important; font-weight: bold; text-decoration: none !important;">${horaInicio} hs</span>`)
      .replaceAll('{zonas}', zonesText)
      .replaceAll('{seña}', `$${valorSeña.toLocaleString()}`)
      .replaceAll('{saldo}', `$${(valorTotal - valorSeña).toLocaleString()}`)
      .replaceAll('{direccion}', address || 'Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)');
  };

  const subject = replacePlaceholders(subjectTemplate || 'Recordatorio de tu turno en 7 días - Gonzalo Depilación');
  const bodyText = replacePlaceholders(bodyTemplate || 'Te recordamos que tenés un turno programado para dentro de 7 días.');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #f0ede6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
        .body-text {
          margin-bottom: 25px;
          white-space: pre-line;
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
    <body>
      <div class="container">
        <div class="header">
          <h1>GONZALO DEPILACIÓN LÁSER</h1>
        </div>
        <div class="content">
          <div class="greeting">Hola ${clientName},</div>
          <div class="body-text">${bodyText}</div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Gonzalo Depilación. Todos los derechos reservados.<br>
          Paraná 597, Piso 8, Depto 48 (Tribunales, CABA).
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: clientEmail,
    bcc: 'backup@depilacionparahombres.com',
    subject: subject,
    html: htmlContent
  });
}
