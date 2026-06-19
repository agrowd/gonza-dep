import nodemailer from 'nodemailer';

/**
 * Sends a notification email to a client who did not show up for their scheduled appointment.
 * 
 * @param {string} clientEmail - Receiver's email
 * @param {string} clientName - Client's full name
 * @param {object} turnDetails - Appointment data { fecha, horaInicio, zonas, valorSeña }
 */
export async function sendNoShowEmail(clientEmail, clientName, turnDetails) {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT) || 1025;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || '"Gonzalo Depilación" <noreply@depilacionparahombres.com>';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined
  });

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
          border: 1px solid #7a1e1e;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .header {
          background-color: #282a2b;
          border-bottom: 2px solid #7a1e1e;
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
                <span class="details-value">${dateFormatted}</span>
              </li>
              <li>
                <span class="details-label">Horario:</span>
                <span class="details-value">${horaInicio}</span>
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
    subject: `Aviso de turno no asistido - Gonzalo Depilación`,
    html: htmlContent
  });
}
