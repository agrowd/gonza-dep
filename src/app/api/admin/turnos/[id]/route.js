import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage, parseTemplate, parseWppTemplate } from '@/lib/whatsapp.js';
import { sendNoShowEmail, sendCancellationEmail, sendRescheduleEmail } from '@/lib/email.js';

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' });
}

// Convert HH:MM to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function isPastDateTime(fechaStr) {
  const now = new Date();
  const offsetBuenosAires = -3;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nowLocal = new Date(utc + (3600000 * offsetBuenosAires));
  const todayStr = nowLocal.toISOString().split('T')[0];
  
  // Only block dates strictly before today (yesterday or earlier)
  return fechaStr < todayStr;
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
      descuentoTipo,
      descuentoValor,
      observaciones,
      selectedZoneIds,
      hasOtros,
      otrosTexto
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
      const isTimeChanged = (horaInicio && horaInicio !== oldTurn.horaInicio) || (horaFin && horaFin !== oldTurn.horaFin);
      const isStateReactivated = estado && estado !== 'CANCELADO' && oldTurn.estado === 'CANCELADO';
      
      if (isDateChanged || isTimeChanged || isStateReactivated) {
        if (isPastDateTime(checkFechaStr, checkHoraInicio)) {
          return NextResponse.json({ error: 'No es posible reprogramar un turno a una fecha o de horario anteriores/pasados.' }, { status: 400 });
        }

        // Fetch work hours configuration
        const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
        const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
        const workStartStr = startConfig?.value || '10:00';
        const workEndStr = endConfig?.value || '20:00';
        
        const workStartMinutes = timeToMinutes(workStartStr);
        const workEndMinutes = timeToMinutes(workEndStr);
        
        const startMinutes = timeToMinutes(checkHoraInicio);
        const endMinutes = timeToMinutes(checkHoraFin);

        if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
          return NextResponse.json({ error: `El horario seleccionado está fuera del horario de atención permitido (${workStartStr} hs a ${workEndStr} hs).` }, { status: 400 });
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
    if (descuentoTipo !== undefined) updateData.descuentoTipo = descuentoTipo;
    if (descuentoValor !== undefined) updateData.descuentoValor = Number(descuentoValor);
    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
      await prisma.cliente.update({
        where: { id: oldTurn.clienteId },
        data: { observaciones }
      });
    }

    if ((body.markClientFinalizado || body.markClientMantenimiento) && oldTurn.clienteId) {
      await prisma.cliente.update({
        where: { id: oldTurn.clienteId },
        data: { estado: 'FINALIZADO' }
      });
      console.log(`Client ${oldTurn.clienteId} marked as FINALIZADO / MANTENIMIENTO.`);
    }

    if (body.markClientVaAAvisar && oldTurn.clienteId) {
      const clientCurrent = await prisma.cliente.findUnique({ where: { id: oldTurn.clienteId } });
      const currentObs = clientCurrent?.observaciones || '';
      const noticeTag = '[Va a avisar próximo turno]';
      const updatedObs = currentObs.includes(noticeTag) ? currentObs : `${currentObs ? currentObs + ' | ' : ''}${noticeTag}`;
      
      await prisma.cliente.update({
        where: { id: oldTurn.clienteId },
        data: { 
          observaciones: updatedObs
        }
      });
      console.log(`Client ${oldTurn.clienteId} marked as Va a avisar.`);
    }

    if (estado === 'CANCELADO' && body.preserveDeposit && oldTurn.clienteId && Number(oldTurn.valorSeña) > 0) {
      const clientCurrent = await prisma.cliente.findUnique({ where: { id: oldTurn.clienteId } });
      const currentObs = clientCurrent?.observaciones || '';
      const dateStr = oldTurn.fecha ? new Date(oldTurn.fecha).toLocaleDateString('es-ES') : '';
      const creditTag = `[Seña a favor: $${Number(oldTurn.valorSeña).toLocaleString('es-ES')} (Guardada por cancelación ${dateStr})]`;
      const updatedObs = currentObs.includes(creditTag) ? currentObs : `${currentObs ? currentObs + ' | ' : ''}${creditTag}`;
      
      await prisma.cliente.update({
        where: { id: oldTurn.clienteId },
        data: { observaciones: updatedObs }
      });
      console.log(`Client ${oldTurn.clienteId} registered preserved deposit: ${creditTag}`);
    }

    if (selectedZoneIds !== undefined) {
      let dbZones = [];
      if (selectedZoneIds && selectedZoneIds.length > 0) {
        dbZones = await prisma.zona.findMany({
          where: { id: { in: selectedZoneIds } }
        });
      }
      const parsedZones = dbZones.map(z => ({
        id: z.id,
        nombre: z.nombre,
        precio: z.precioBase,
        duracion: z.duracionMinutos
      }));
      if (hasOtros && otrosTexto) {
        parsedZones.push({
          id: 'otros',
          nombre: `Otros: ${otrosTexto}`,
          precio: 0,
          duracion: 0
        });
      }
      updateData.zonas = JSON.stringify(parsedZones);
    }

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

    if (updatedTurno.estado === 'BLOQUEADO') {
      console.log('Skipping all notifications for blocked slots.');
      return NextResponse.json(updatedTurno);
    }

    const clientNotificationsEnabled = updatedTurno.cliente ? updatedTurno.cliente.enviarNotificaciones !== false : true;
    const notificationsEnabled = clientNotificationsEnabled;

    // WhatsApp Notification Trigger:
    // If state changes to "SEÑADO" (Approved) and old state was "PENDIENTE_AUTORIZACION"
    if (notificationsEnabled && estado === 'SEÑADO' && oldTurn.estado === 'PENDIENTE_AUTORIZACION') {
      try {
        // Fetch template from configuration
        const templateConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_confirmation_template' }
        });

        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });

        if (templateConfig) {
          const msg = parseTemplate(templateConfig.value, updatedTurno.cliente, updatedTurno, addressConfig?.value || '');

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

    // Email and WhatsApp Notification Trigger for No-Show (NO_ASISTIO):
    // If state changes to "NO_ASISTIO" and old state was not "NO_ASISTIO"
    if (notificationsEnabled && estado === 'NO_ASISTIO' && oldTurn.estado !== 'NO_ASISTIO') {
      // 1. Send Email
      if (updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
        try {
          const subjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_noshow_subject' } });
          const bodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_noshow_body' } });

          await sendNoShowEmail(
            updatedTurno.cliente.email,
            updatedTurno.cliente.nombreCompleto,
            {
              fecha: updatedTurno.fecha,
              horaInicio: updatedTurno.horaInicio,
              zonas: updatedTurno.zonas,
              valorSeña: updatedTurno.valorSeña,
              valorTotal: updatedTurno.valorTotal
            },
            subjectConfig?.value,
            bodyConfig?.value
          );

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

      // 2. Send WhatsApp No-Show Alert
      try {
        const templateConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_noshow_template' }
        });
        const templateVal = templateConfig?.value || "¡Hola [Nombre]! Lamentamos que no hayas asistido a tu turno del día [FechaTurno] a las [Horario]. Según nuestras políticas, la seña de [Seña] no es reembolsable para cubrir los costos del horario reservado. Si querés agendar un nuevo turno, podés hacerlo desde nuestra web.";
        
        const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });
        const msg = parseTemplate(templateVal, updatedTurno.cliente, updatedTurno, addressConfig?.value || '');

        await sendWhatsAppMessage(updatedTurno.cliente.whatsapp, msg);

        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'WHATSAPP',
            mensaje: msg,
            estado: 'ENVIADO'
          }
        });
        console.log(`WhatsApp no-show notification automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
      } catch (wppNoShowErr) {
        console.error('Failed to send WhatsApp no-show notification:', wppNoShowErr);
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'WHATSAPP',
            mensaje: `Error al enviar WhatsApp por inasistencia: ${wppNoShowErr.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }

    // Email and WhatsApp Notification Trigger for Cancellation:
    // If state changes to "CANCELADO" and old state was not "CANCELADO"
    if (notificationsEnabled && estado === 'CANCELADO' && oldTurn.estado !== 'CANCELADO') {
      try {
        // Deposit is lost if admin explicitly set preserveDeposit to false, or if cancelled within 72h on web
        let withLossOfDeposit = false;
        if (typeof body.preserveDeposit === 'boolean') {
          withLossOfDeposit = !body.preserveDeposit;
        } else {
          withLossOfDeposit = diffHours < 72;
        }

        if (updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
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
        }
      } catch (err) {
        console.error('Failed to send automatic cancellation email:', err);
        // Log failure in database
        if (updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
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

      // WhatsApp Cancellation Trigger
      try {
        const wppCancelConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_cancellation_template' }
        });
        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });
        const templateVal = wppCancelConfig?.value || "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] fue cancelado. Si querés agendar un nuevo turno, podés hacerlo desde nuestra web. ¡Saludos!";
        const wppMsg = parseWppTemplate(templateVal, updatedTurno.cliente, updatedTurno, addressConfig?.value);
        
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
          console.log(`WhatsApp cancellation notification automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
        }
      } catch (wppErr) {
        console.error('Failed to send WhatsApp cancellation notification:', wppErr);
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'WHATSAPP',
            mensaje: `Error al enviar WhatsApp de cancelación: ${wppErr.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }

    // Email and WhatsApp Notification Trigger for Rescheduling:
    // If date, time, or state is rescheduled, and it is not CANCELADO / BLOQUEADO
    if (updatedTurno.estado !== 'CANCELADO' && updatedTurno.estado !== 'BLOQUEADO') {
      const isDateChanged = updatedTurno.fecha.toISOString().split('T')[0] !== oldTurn.fecha.toISOString().split('T')[0];
      const isTimeChanged = updatedTurno.horaInicio !== oldTurn.horaInicio || updatedTurno.horaFin !== oldTurn.horaFin;
      const isStateReprogrammed = updatedTurno.estado === 'REPROGRAMADO' && oldTurn.estado !== 'REPROGRAMADO';

      if (notificationsEnabled && (isDateChanged || isTimeChanged || isStateReprogrammed)) {
        try {
          const subjectConfig = await prisma.configuracion.findUnique({
            where: { key: 'email_reprogram_subject' }
          });
          const bodyConfig = await prisma.configuracion.findUnique({
            where: { key: 'email_reprogram_body' }
          });

          if (updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
            await sendRescheduleEmail(
              updatedTurno.cliente.email,
              updatedTurno.cliente.nombreCompleto,
              {
                fecha: updatedTurno.fecha,
                horaInicio: updatedTurno.horaInicio,
                zonas: updatedTurno.zonas,
                valorSeña: updatedTurno.valorSeña,
                valorTotal: updatedTurno.valorTotal
              },
              subjectConfig?.value,
              bodyConfig?.value
            );

            await prisma.notificacion.create({
              data: {
                clienteId: updatedTurno.clienteId,
                turnoId: updatedTurno.id,
                canal: 'EMAIL',
                mensaje: `Correo enviado por reprogramación de turno al ${formatDate(updatedTurno.fecha)} a las ${updatedTurno.horaInicio}.`,
                estado: 'ENVIADO'
              }
            });
            console.log(`Email rescheduling notification automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
          }
        } catch (rescheduleMailErr) {
          console.error('Failed to send rescheduling email:', rescheduleMailErr);
          if (updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
            await prisma.notificacion.create({
              data: {
                clienteId: updatedTurno.clienteId,
                turnoId: updatedTurno.id,
                canal: 'EMAIL',
                mensaje: `Error al enviar correo de reprogramación: ${rescheduleMailErr.message}`,
                estado: 'FALLIDO'
              }
            });
          }
        }

        // WhatsApp Reschedule Trigger
        try {
          const wppRescheduleConfig = await prisma.configuracion.findUnique({
            where: { key: 'wtsp_reschedule_template' }
          });
          const addressConfig = await prisma.configuracion.findUnique({
            where: { key: 'address' }
          });
          const templateVal = wppRescheduleConfig?.value || "¡Hola [Nombre]! Tu turno fue reprogramado con éxito para el día [FechaTurno] a las [Horario] para [Zonas]. Recordá venir afeitado al ras. ¡Te esperamos!";
          const wppMsg = parseWppTemplate(templateVal, updatedTurno.cliente, updatedTurno, addressConfig?.value);
          
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
            console.log(`WhatsApp rescheduling notification automatically sent to ${updatedTurno.cliente.nombreCompleto}.`);
          }
        } catch (wppErr) {
          console.error('Failed to send WhatsApp rescheduling notification:', wppErr);
          await prisma.notificacion.create({
            data: {
              clienteId: updatedTurno.clienteId,
              turnoId: updatedTurno.id,
              canal: 'WHATSAPP',
              mensaje: `Error al enviar WhatsApp de reprogramación: ${wppErr.message}`,
              estado: 'FALLIDO'
            }
          });
        }
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
