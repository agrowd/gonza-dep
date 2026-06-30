import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendReceiptEmail } from '@/lib/email.js';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const turno = await prisma.turno.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    if (!turno.cliente || !turno.cliente.email) {
      return NextResponse.json({ error: 'El cliente no tiene un email válido registrado' }, { status: 400 });
    }

    // Send receipt email
    await sendReceiptEmail(turno.cliente.email, turno.cliente.nombreCompleto, {
      fecha: turno.fecha,
      horaInicio: turno.horaInicio,
      zonas: turno.zonas,
      valorSeña: turno.valorSeña,
      valorTotal: turno.valorTotal
    });

    // Log the notification in the DB
    await prisma.notificacion.create({
      data: {
        clienteId: turno.clienteId,
        turnoId: turno.id,
        canal: 'EMAIL',
        mensaje: `Comprobante de turno y pago enviado manualmente por email.`,
        estado: 'ENVIADO'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return NextResponse.json({ error: 'Error interno al enviar el comprobante' }, { status: 500 });
  }
}
