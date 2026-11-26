import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage, parseWppTemplate, formatCurrencyArs } from '@/lib/whatsapp.js';
import { sendCancellationEmail } from '@/lib/email.js';
import { emailsMatch } from '@/lib/emailNormalize.js';

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' });
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
    const matchesEmail = email && emailsMatch(turno.cliente.email, email);

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
    const currentObs = turno.observaciones || '';
    let cancelTag = '';
    if (Number(turno.valorSeña) > 0) {
      if (!withLossOfDeposit) {
        cancelTag = `[Cancelado - Seña de ${formatCurrencyArs(turno.valorSeña)} Guardada para siguiente turno - Autogestión]`;
      } else {
        cancelTag = `[Cancelado - Pierde seña de ${formatCurrencyArs(turno.valorSeña)} - Autogestión]`;
      }
    } else {
      cancelTag = `[Cancelado - Autogestión]`;
    }
    let newObs = currentObs.includes('[CANCELADO_AUTOGESTION]') ? currentObs : `${currentObs} [CANCELADO_AUTOGESTION]`.trim();
    if (!newObs.includes(cancelTag)) {
      newObs = `${newObs} ${cancelTag}`.trim();
    }
    const updatedTurno = await prisma.turno.update({
      where: { id: turnoId },
      data: {
        estado: 'CANCELADO',
        observaciones: newObs
      },
      include: { cliente: true }
    });

    // Si el cliente estaba en estado FINALIZADO o MANTENIMIENTO, al cancelar su turno
    // su estado se reestablece a ACTIVO para evitar envíos indebidos de mantenimiento
    if (updatedTurno.clienteId) {
      await prisma.cliente.update({
        where: { id: updatedTurno.clienteId },
        data: { estado: 'ACTIVO' }
      }).catch(err => console.error('Error resetting client status to ACTIVO upon cancellation:', err));
    }

    const clientNotificationsEnabled = updatedTurno.cliente ? updatedTurno.cliente.enviarNotificaciones !== false : true;
    const notificationsEnabled = clientNotificationsEnabled;

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
        const señaNumWpp = Number(updatedTurno.valorSeña || 0);
        const señaFormattedWpp = formatCurrencyArs(señaNumWpp);
        const defaultCancelTpl = "¡Hola [Nombre]! Te informamos que tu turno para el día [Día] [FechaTurno] a las [Horario] fue cancelado.\n\nPara agendar un nuevo turno, podés consultar todos los días y horarios disponibles directamente desde nuestro link de autogestión:\nhttps://agenda.depilacionparahombres.com";
        let wppTemplate = wppCancelConfig?.value || defaultCancelTpl;
        if (señaNumWpp > 0) {
          const injectWppNotice = (baseText, notice) => {
            const ctaMatch = baseText.match(/\n\s*(Para agendar|Si dese[aá]s|Pod[eé]s|https?:\/\/)/i);
            if (ctaMatch && ctaMatch.index !== undefined) {
              return `${baseText.slice(0, ctaMatch.index).trimEnd()}\n\n${notice}\n\n${baseText.slice(ctaMatch.index).trimStart()}`;
            }
            return `${baseText.trimEnd()}\n\n${notice}`;
          };
          if (withLossOfDeposit && !/seña|reten|pierd|reembols/i.test(wppTemplate)) {
            wppTemplate = injectWppNotice(wppTemplate, `Tené en cuenta que, de acuerdo a nuestras políticas de reserva y cancelación, la seña abonada de ${señaFormattedWpp} se pierde y no es reembolsable.`);
          } else if (!withLossOfDeposit && !/seña|favor/i.test(wppTemplate)) {
            wppTemplate = injectWppNotice(wppTemplate, `Tu seña de ${señaFormattedWpp} queda registrada a tu favor para tu próxima sesión.`);
          }
        }
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
