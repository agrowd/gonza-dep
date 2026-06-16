import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage } from '@/lib/whatsapp.js';

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long' });
}

// PUT: Update appointment (actions: reprogram, cancel, mark completed, approve)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      fechaStr,
      horaInicio,
      horaFin,
      estado,
      valorTotal,
      valorSeña,
      observaciones
    } = body;

    // Fetch old turn state
    const oldTurn = await prisma.turno.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!oldTurn) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Prepare update data
    const updateData = {};
    if (fechaStr) updateData.fecha = new Date(fechaStr + 'T00:00:00');
    if (horaInicio) updateData.horaInicio = horaInicio;
    if (horaFin) updateData.horaFin = horaFin;
    if (estado) updateData.estado = estado;
    if (valorTotal !== undefined) updateData.valorTotal = valorTotal;
    if (valorSeña !== undefined) updateData.valorSeña = valorSeña;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    // Recalculate remaining balance
    const finalTotal = valorTotal !== undefined ? valorTotal : oldTurn.valorTotal;
    const finalSeña = valorSeña !== undefined ? valorSeña : oldTurn.valorSeña;
    updateData.saldoPendiente = Math.max(0, finalTotal - finalSeña);

    // Perform database update
    const updatedTurno = await prisma.turno.update({
      where: { id },
      data: updateData,
      include: { cliente: true }
    });

    // WhatsApp Notification Trigger:
    // If state changes to "SEÑADO" (Approved) and old state was "PENDIENTE_AUTORIZACION"
    if (estado === 'SEÑADO' && oldTurn.estado === 'PENDIENTE_AUTORIZACION') {
      try {
        // Fetch template from configuration
        const templateConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_confirmation_template' }
        });

        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });

        if (templateConfig) {
          let msg = templateConfig.value;
          
          // Parse zones stringified array
          let zonesText = '';
          try {
            const parsedZonas = JSON.parse(updatedTurno.zonas);
            zonesText = parsedZonas.map(z => z.nombre).join(', ');
          } catch (e) {
            zonesText = 'tratamiento';
          }

          // Replace variables
          msg = msg
            .replaceAll('[Nombre]', updatedTurno.cliente.nombreCompleto)
            .replaceAll('[FechaTurno]', formatDate(updatedTurno.fecha))
            .replaceAll('[Horario]', `${updatedTurno.horaInicio} hs`)
            .replaceAll('[Zonas]', zonesText)
            .replaceAll('[ValorTotal]', `$${updatedTurno.valorTotal}`)
            .replaceAll('[Seña]', `$${updatedTurno.valorSeña}`)
            .replaceAll('[Direccion]', addressConfig ? addressConfig.value : 'Paraná 597');

          // Send message
          await sendWhatsAppMessage(updatedTurno.cliente.whatsapp, msg);

          // Log in database
          await prisma.notificacion.create({
            data: {
              clienteId: updatedTurno.clienteId,
              canal: 'WHATSAPP',
              mensaje: msg,
              estado: 'ENVIADO'
            }
          });
          console.log(`WhatsApp confirmation automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
        }
      } catch (err) {
        console.error('Failed to send automatic WhatsApp confirmation:', err);
        // Do not crash the API request if WhatsApp fails, just log it
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            canal: 'WHATSAPP',
            mensaje: `Error al enviar confirmación automática: ${err.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }

    return NextResponse.json(updatedTurno);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Cancel/Remove appointment
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.turno.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
