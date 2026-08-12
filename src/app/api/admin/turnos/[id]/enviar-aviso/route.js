import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendReminder7DaysEmail, sendConfirmationEmail, sendReceiptEmail } from '@/lib/email.js';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { email: newEmail, tipo = 'RECORDATORIO' } = body;

    const turno = await prisma.turno.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    let targetEmail = (newEmail || turno.cliente?.email || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ error: 'Por favor, ingresa un correo electrónico válido' }, { status: 400 });
    }

    // If email is provided and differs from DB, update client's email in DB
    if (turno.cliente && targetEmail !== turno.cliente.email?.toLowerCase()) {
      await prisma.cliente.update({
        where: { id: turno.cliente.id },
        data: { email: targetEmail }
      });
      turno.cliente.email = targetEmail;
    }

    const clientName = turno.cliente?.nombreCompleto || 'Cliente';
    const turnDetails = {
      fecha: turno.fecha,
      horaInicio: turno.horaInicio,
      zonas: turno.zonas,
      valorSeña: turno.valorSeña,
      valorTotal: turno.valorTotal
    };

    let logMessage = '';

    if (tipo === 'CONFIRMACION') {
      await sendConfirmationEmail(targetEmail, clientName, turnDetails);
      logMessage = `Confirmación de turno enviada manualmente por email a ${targetEmail}.`;
    } else if (tipo === 'RECIBO') {
      await sendReceiptEmail(targetEmail, clientName, turnDetails);
      logMessage = `Comprobante de turno y pago enviado manualmente por email a ${targetEmail}.`;
    } else {
      // Default: RECORDATORIO
      const default7Body = "Hola {cliente}!\n\nTe recordamos que tenés un turno reservado para dentro de 7 días, el {día} {fecha} a las {horario}.\n\nZonas: {zonas}\nSeña abonada: {seña}\nSaldo pendiente a pagar en el local: {saldo}\n\nUbicación: {direccion}\n\nSi necesitas reprogramar o cancelar tu turno, recordá hacerlo con al menos 48 horas de anticipación desde el link de autogestión.\n\nTe esperamos,\nGonzalo Depilación";
      
      const email7SubjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reminder_7days_subject' } });
      const email7BodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reminder_7days_body' } });
      const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'business_address' } });

      const email7SubjectTemplate = email7SubjectConfig?.value || "Recordatorio de tu turno en 7 días - Gonzalo Depilación";
      const email7BodyTemplate = email7BodyConfig?.value || default7Body;
      const businessAddress = addressConfig?.value || "Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)";

      await sendReminder7DaysEmail(
        targetEmail,
        clientName,
        turnDetails,
        businessAddress,
        email7SubjectTemplate,
        email7BodyTemplate
      );
      logMessage = `Recordatorio de turno reenviado manualmente por email a ${targetEmail}.`;
    }

    // Log the notification in the DB
    await prisma.notificacion.create({
      data: {
        clienteId: turno.clienteId,
        turnoId: turno.id,
        canal: 'EMAIL',
        mensaje: logMessage,
        estado: 'ENVIADO'
      }
    });

    return NextResponse.json({
      success: true,
      updatedEmail: targetEmail,
      message: `Aviso enviado con éxito a ${targetEmail}`
    });
  } catch (error) {
    console.error('Error in /api/admin/turnos/[id]/enviar-aviso:', error);
    return NextResponse.json({ error: error.message || 'Error al enviar el aviso por correo' }, { status: 500 });
  }
}
