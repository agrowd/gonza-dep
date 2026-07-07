import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { mpPayment } from '@/lib/mercadopago.js';
import { sendConfirmationEmail } from '@/lib/email.js';
import { sendWhatsAppMessage } from '@/lib/whatsapp.js';

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
    const { turnoId, paymentId, status } = body;

    if (!turnoId) {
      return NextResponse.json({ error: 'Falta el identificador del turno.' }, { status: 400 });
    }

    // 1. Fetch Turno from DB
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { cliente: true }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado.' }, { status: 404 });
    }

    // If it's already marked as SEÑADO, just return success
    if (turno.estado === 'SEÑADO') {
      return NextResponse.json({ success: true, message: 'El turno ya se encuentra confirmado.' });
    }

    // 2. Verify payment status with MercadoPago if paymentId is provided
    let isApproved = false;
    let finalSeña = turno.valorSeña;

    if (paymentId) {
      try {
        const payment = await mpPayment.get({ id: paymentId });
        if (payment.status === 'approved') {
          isApproved = true;
          finalSeña = payment.transaction_amount || turno.valorSeña;
        }
      } catch (err) {
        console.error('Error fetching payment details from MP:', err);
      }
    } else if (status === 'approved') {
      isApproved = true;
    } else {
      // If no paymentId is provided but order is approved (e.g. mock or manual confirmation)
      isApproved = true;
    }

    if (!isApproved) {
      return NextResponse.json({ error: 'El pago de la seña no ha sido aprobado por MercadoPago aún. Si realizaste el pago, aguarda unos instantes y vuelve a intentar.' }, { status: 400 });
    }

    // 3. Update Turno in DB
    const updatedTurno = await prisma.turno.update({
      where: { id: turnoId },
      data: {
        estado: 'SEÑADO',
        valorSeña: finalSeña,
        saldoPendiente: Math.max(0, turno.valorTotal - finalSeña)
      },
      include: { cliente: true }
    });

    // 4. Send Confirmation Email to Client if not already sent
    const emailSentLog = await prisma.notificacion.findFirst({
      where: {
        turnoId: updatedTurno.id,
        canal: 'EMAIL',
        mensaje: { contains: 'Confirmación de turno' }
      }
    });

    if (!emailSentLog && updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
      try {
        await sendConfirmationEmail(
          updatedTurno.cliente.email,
          updatedTurno.cliente.nombreCompleto,
          {
            fecha: updatedTurno.fecha,
            horaInicio: updatedTurno.horaInicio,
            zonas: updatedTurno.zonas,
            valorSeña: updatedTurno.valorSeña,
            valorTotal: updatedTurno.valorTotal
          }
        );

        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Confirmación de turno enviada por email al confirmar en la web.`,
            estado: 'ENVIADO'
          }
        });
      } catch (mailError) {
        console.error('Failed to send confirmation email in confirm API:', mailError);
      }
    }

    // 5. Send Confirmation WhatsApp to Client if not already sent
    const wppSentLog = await prisma.notificacion.findFirst({
      where: {
        turnoId: updatedTurno.id,
        canal: 'WHATSAPP',
        mensaje: { not: { contains: 'Reserva online confirmada automáticamente' } }
      }
    });

    if (!wppSentLog && updatedTurno.cliente.whatsapp && !updatedTurno.cliente.whatsapp.includes('bloqueo')) {
      try {
        const wppConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_confirmation_template' }
        });
        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });
        const wppTemplate = wppConfig?.value || "¡Hola [Nombre]! Tu reserva para el día [FechaTurno] a las [Horario] para [Zonas] fue aprobada con éxito. Recordá venir afeitado al ras. ¡Te esperamos!";
        const wppMsg = parseWppTemplate(wppTemplate, updatedTurno.cliente, updatedTurno, addressConfig?.value);

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
      } catch (wppError) {
        console.error('Failed to send WhatsApp confirmation in confirm API:', wppError);
      }
    }

    return NextResponse.json({ success: true, message: 'Turno confirmado con éxito.' });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
