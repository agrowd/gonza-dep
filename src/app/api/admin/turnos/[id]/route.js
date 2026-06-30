import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage } from '@/lib/whatsapp.js';
import { sendNoShowEmail, sendCancellationEmail } from '@/lib/email.js';

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long' });
}

// Convert HH:MM to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function isPastDateTime(fechaStr, horaInicio) {
  const now = new Date();
  const offsetBuenosAires = -3;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nowLocal = new Date(utc + (3600000 * offsetBuenosAires));
  const todayStr = nowLocal.toISOString().split('T')[0];
  
  if (fechaStr < todayStr) return true;
  if (fechaStr === todayStr) {
    const [hours, minutes] = horaInicio.split(':').map(Number);
    const nowHours = nowLocal.getHours();
    const nowMinutes = nowLocal.getMinutes();
    if (hours < nowHours || (hours === nowHours && minutes < nowMinutes)) {
      return true;
    }
  }
  return false;
}

async function hasOverlappingTurno(fechaStr, horaInicio, horaFin, excludeTurnoId = null) {
  const targetDate = new Date(fechaStr + 'T00:00:00');
  const dayTurnos = await prisma.turno.findMany({
    where: {
      fecha: targetDate,
      estado: { not: 'CANCELADO' },
      id: excludeTurnoId ? { not: excludeTurnoId } : undefined
    },
    include: {
      cliente: true
    }
  });

  const newStartMin = timeToMinutes(horaInicio);
  const newEndMin = timeToMinutes(horaFin);

  for (const t of dayTurnos) {
    const startMin = timeToMinutes(t.horaInicio);
    const endMin = timeToMinutes(t.horaFin);
    if (startMin < newEndMin && endMin > newStartMin) {
      return t;
    }
  }
  return null;
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
      bonificacion,
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

    const checkFechaStr = fechaStr || oldTurn.fecha.toISOString().split('T')[0];
    const checkHoraInicio = horaInicio || oldTurn.horaInicio;
    const checkHoraFin = horaFin || oldTurn.horaFin;
    const checkEstado = estado || oldTurn.estado;

    // Past Date/Time Check (only validate if date/time is actually changing and not cancelled)
    if (checkEstado !== 'CANCELADO') {
      const isDateChanged = fechaStr && fechaStr !== oldTurn.fecha.toISOString().split('T')[0];
      const isTimeChanged = horaInicio && horaInicio !== oldTurn.horaInicio;
      const isStateReactivated = estado && estado !== 'CANCELADO' && oldTurn.estado === 'CANCELADO';
      
      if (isDateChanged || isTimeChanged || isStateReactivated) {
        if (isPastDateTime(checkFechaStr, checkHoraInicio)) {
          return NextResponse.json({ error: 'No es posible reprogramar un turno a una fecha o de horario anteriores/pasados.' }, { status: 400 });
        }
      }
    }

    // Overlap Check (if the appointment is active/being reactivated)
    if (checkEstado !== 'CANCELADO') {
      const checkOverlap = await hasOverlappingTurno(checkFechaStr, checkHoraInicio, checkHoraFin, id);
      if (checkOverlap) {
        const isBlock = checkOverlap.estado === 'BLOQUEADO';
        return NextResponse.json({
          error: isBlock 
            ? 'El horario seleccionado se encuentra bloqueado administrativamente.' 
            : `El horario seleccionado se solapa con otro turno de ${checkOverlap.cliente?.nombreCompleto || 'otro cliente'}.`
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData = {};
    if (fechaStr) updateData.fecha = new Date(fechaStr + 'T00:00:00');
    if (horaInicio) updateData.horaInicio = horaInicio;
    if (horaFin) updateData.horaFin = horaFin;
    if (estado) updateData.estado = estado;
    if (valorTotal !== undefined) updateData.valorTotal = valorTotal;
    if (valorSeña !== undefined) updateData.valorSeña = valorSeña;
    if (bonificacion !== undefined) updateData.bonificacion = Number(bonificacion);
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    // Recalculate remaining balance
    const finalTotal = valorTotal !== undefined ? valorTotal : oldTurn.valorTotal;
    const finalSeña = valorSeña !== undefined ? valorSeña : oldTurn.valorSeña;
    updateData.saldoPendiente = Math.max(0, finalTotal - finalSeña);

    // Recalculate duration if hours are updated
    if (horaInicio || horaFin) {
      const start = horaInicio || oldTurn.horaInicio;
      const end = horaFin || oldTurn.horaFin;
      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);
      updateData.duracionMinutos = Math.max(10, endMin - startMin);
    }


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

    // Email Notification Trigger:
    // If state changes to "NO_ASISTIO" and old state was not "NO_ASISTIO"
    if (estado === 'NO_ASISTIO' && oldTurn.estado !== 'NO_ASISTIO') {
      try {
        await sendNoShowEmail(
          updatedTurno.cliente.email,
          updatedTurno.cliente.nombreCompleto,
          {
            fecha: updatedTurno.fecha,
            horaInicio: updatedTurno.horaInicio,
            zonas: updatedTurno.zonas,
            valorSeña: updatedTurno.valorSeña
          }
        );

        // Log in database
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Correo enviado por inasistencia al turno del ${formatDate(updatedTurno.fecha)} a las ${updatedTurno.horaInicio}.`,
            estado: 'ENVIADO'
          }
        });
        console.log(`Email no-show notification automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
      } catch (err) {
        console.error('Failed to send automatic no-show email:', err);
        // Log failure in database
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Error al enviar correo por inasistencia: ${err.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }

    // Email Notification Trigger for Cancellation:
    // If state changes to "CANCELADO" and old state was not "CANCELADO"
    if (estado === 'CANCELADO' && oldTurn.estado !== 'CANCELADO') {
      try {
        await sendCancellationEmail(
          updatedTurno.cliente.email,
          updatedTurno.cliente.nombreCompleto,
          {
            fecha: updatedTurno.fecha,
            horaInicio: updatedTurno.horaInicio,
            zonas: updatedTurno.zonas
          }
        );

        // Log in database
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Correo enviado por cancelación de turno del ${formatDate(updatedTurno.fecha)} a las ${updatedTurno.horaInicio}.`,
            estado: 'ENVIADO'
          }
        });
        console.log(`Email cancellation notification automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
      } catch (err) {
        console.error('Failed to send automatic cancellation email:', err);
        // Log failure in database
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Error al enviar correo de cancelación: ${err.message}`,
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
