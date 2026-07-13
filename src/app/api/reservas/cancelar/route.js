import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage } from '@/lib/whatsapp.js';
import { sendCancellationEmail } from '@/lib/email.js';

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' });
}

function parseWppTemplate(template, client, turno, address) {
  if (!template) return '';
  let zonesText = '';
  try {
    const parsedZonas = JSON.parse(turno.zonas);
    zonesText = parsedZonas.map(z => z.nombre).join(', ');
  } catch (e) {
    zonesText = turno.zonas || 'tratamiento';
  }

  return template
    .replaceAll('[Nombre]', client.nombreCompleto)
    .replaceAll('[FechaTurno]', formatDate(turno.fecha))
    .replaceAll('[Horario]', `${turno.horaInicio} hs`)
    .replaceAll('[Zonas]', zonesText)
    .replaceAll('[ValorTotal]', `$${turno.valorTotal}`)
    .replaceAll('[Seña]', `$${turno.valorSeña}`)
    .replaceAll('[Direccion]', address || 'Paraná 597');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { turnoId, dni, email } = body;

    if (!turnoId || (!dni && !email)) {
      return NextResponse.json({ error: 'Turno ID y credenciales son obligatorios.' }, { status: 400 });
    }

    // 1. Fetch appointment and verify owner
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { cliente: true }
    });

    if (!turno || !turno.cliente) {
      return NextResponse.json({ error: 'Turno no encontrado.' }, { status: 404 });
    }

    const matchesDni = dni && turno.cliente.dni === dni;
    const matchesEmail = email && turno.cliente.email.toLowerCase().trim() === email.toLowerCase().trim();

    if (!matchesDni && !matchesEmail) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 403 });
    }

    if (turno.estado === 'CANCELADO') {
      return NextResponse.json({ error: 'El turno ya se encuentra cancelado.' }, { status: 400 });
    }

    // 2. Calculate policy threshold
    const now = new Date();
    const turnTime = new Date(turno.fecha);
    const [h, m] = turno.horaInicio.split(':').map(Number);
    turnTime.setUTCHours(h, m, 0, 0);
    const diffMs = turnTime.getTime() - now.getTime();
    const withLossOfDeposit = true;

    // Perform cancellation in DB
    const updatedTurno = await prisma.turno.update({
      where: { id: turnoId },
      data: { estado: 'CANCELADO' },
      include: { cliente: true }
    });

    const configGlobal = await prisma.configuracion.findUnique({
      where: { key: 'global_notifications_enabled' }
    });
    const globalNotificationsEnabled = configGlobal ? configGlobal.value === 'true' : true;
    const clientNotificationsEnabled = updatedTurno.cliente ? updatedTurno.cliente.enviarNotificaciones !== false : true;
    const notificationsEnabled = globalNotificationsEnabled && clientNotificationsEnabled;

    // 3. Dispatch Email notification (if not blocked/special email)
    if (notificationsEnabled && updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
      try {
        await sendCancellationEmail(
          updatedTurno.cliente.email,
          updatedTurno.cliente.nombreCompleto,
          {
            fecha: updatedTurno.fecha,
            horaInicio: updatedTurno.horaInicio,
            zonas: updatedTurno.zonas,
            valorSeña: updatedTurno.valorSeña
          },
          withLossOfDeposit
        );

        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Correo enviado por cancelación de turno (Autogestión Cliente) del ${formatDate(updatedTurno.fecha)} a las ${updatedTurno.horaInicio}.`,
            estado: 'ENVIADO'
          }
        });
      } catch (err) {
        console.error('Failed to send customer cancellation email:', err);
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Error al enviar correo de cancelación (Autogestión): ${err.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }

    // 4. Dispatch WhatsApp notification
    if (notificationsEnabled) {
      try {
        const wppCancelConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_cancellation_template' }
        });
        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });
        const wppTemplate = wppCancelConfig?.value || "¡Hola [Nombre]! Tu turno del [FechaTurno] a las [Horario] fue cancelado con éxito.";
        const wppMsg = parseWppTemplate(wppTemplate, updatedTurno.cliente, updatedTurno, addressConfig?.value);

        if (updatedTurno.cliente.whatsapp && !updatedTurno.cliente.whatsapp.includes('bloqueo')) {
          await sendWhatsAppMessage(updatedTurno.cliente.whatsapp, wppMsg);

          await prisma.notificacion.create({
            data: {
              clienteId: updatedTurno.clienteId,
              turnoId: updatedTurno.id,
              canal: 'WHATSAPP',
              mensaje: wppMsg,
              estado: 'ENVIADO'
            }
          });
        }
      } catch (wppErr) {
      console.error('Failed to send customer cancellation WhatsApp:', wppErr);
      await prisma.notificacion.create({
        data: {
          clienteId: updatedTurno.clienteId,
          turnoId: updatedTurno.id,
          canal: 'WHATSAPP',
          mensaje: `Error al enviar WhatsApp de cancelación (Autogestión): ${wppErr.message}`,
          estado: 'FALLIDO'
        }
      });
    }
  }

    return NextResponse.json({ success: true, message: 'Turno cancelado con éxito.' });
  } catch (error) {
    console.error('Error in client cancellation API:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
