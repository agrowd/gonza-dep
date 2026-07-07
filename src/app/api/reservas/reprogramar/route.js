import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage } from '@/lib/whatsapp.js';
import { sendRescheduleEmail } from '@/lib/email.js';

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

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

async function hasOverlappingTurno(fechaStr, horaInicio, horaFin, excludeTurnoId = null) {
  const targetDate = new Date(fechaStr + 'T00:00:00');
  const dayTurnos = await prisma.turno.findMany({
    where: {
      fecha: targetDate,
      estado: { not: 'CANCELADO' },
      id: excludeTurnoId ? { not: excludeTurnoId } : undefined
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { turnoId, dni, fechaStr, horaInicio } = body;

    if (!turnoId || !dni || !fechaStr || !horaInicio) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    // 1. Fetch appointment and verify owner DNI
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { cliente: true }
    });

    if (!turno || !turno.cliente || turno.cliente.dni !== dni) {
      return NextResponse.json({ error: 'Turno no encontrado o DNI no coincide.' }, { status: 404 });
    }

    if (turno.estado === 'CANCELADO') {
      return NextResponse.json({ error: 'El turno se encuentra cancelado. No se puede reprogramar.' }, { status: 400 });
    }

    const now = new Date();

    // Enforce no same-day rescheduling
    const offsetBuenosAires = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowLocal = new Date(utc + (3600000 * offsetBuenosAires));
    const todayStr = nowLocal.toISOString().split('T')[0];
    if (fechaStr <= todayStr) {
      return NextResponse.json({ error: 'No es posible agendar turnos para el mismo día.' }, { status: 400 });
    }

    // Enforce no Saturdays or Sundays
    const targetDate = new Date(fechaStr + 'T00:00:00');
    const targetDay = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (targetDay === 0 || targetDay === 6) {
      return NextResponse.json({ error: 'No es posible agendar turnos los fines de semana (sábados ni domingos).' }, { status: 400 });
    }

    // 2. Enforce 72 hours advance policy
    const turnTime = new Date(turno.fecha);
    const [h, m] = turno.horaInicio.split(':').map(Number);
    turnTime.setUTCHours(h, m, 0, 0);
    const diffMs = turnTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 72) {
      return NextResponse.json({ error: 'Faltan menos de 72 horas para tu turno. Por políticas de la empresa, no podés reprogramar directamente de forma gratuita.' }, { status: 400 });
    }

    // 3. Check for overlaps for the new date and time
    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = startMinutes + turno.duracionMinutos;
    const horaFin = minutesToTime(endMinutes);

    const checkOverlap = await hasOverlappingTurno(fechaStr, horaInicio, horaFin, turno.id);
    if (checkOverlap) {
      return NextResponse.json({ error: 'El horario seleccionado ya no se encuentra disponible. Por favor, elige otro horario o día.' }, { status: 400 });
    }

    // 4. Update the appointment in DB
    const updatedTurno = await prisma.turno.update({
      where: { id: turnoId },
      data: {
        fecha: targetDate,
        horaInicio,
        horaFin,
        estado: 'REPROGRAMADO'
      },
      include: { cliente: true }
    });

    // 5. Send reschedule email notification
    if (updatedTurno.cliente.email && !updatedTurno.cliente.email.includes('bloqueo')) {
      try {
        const subjectConfig = await prisma.configuracion.findUnique({
          where: { key: 'email_reprogram_subject' }
        });
        const bodyConfig = await prisma.configuracion.findUnique({
          where: { key: 'email_reprogram_body' }
        });

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
            mensaje: `Correo enviado por reprogramación de turno (Autogestión Cliente) al ${formatDate(updatedTurno.fecha)} a las ${updatedTurno.horaInicio}.`,
            estado: 'ENVIADO'
          }
        });
      } catch (err) {
        console.error('Failed to send customer reschedule email:', err);
        await prisma.notificacion.create({
          data: {
            clienteId: updatedTurno.clienteId,
            turnoId: updatedTurno.id,
            canal: 'EMAIL',
            mensaje: `Error al enviar correo de reprogramación (Autogestión): ${err.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }

    // 6. Send reschedule WhatsApp notification
    try {
      const wppRescheduleConfig = await prisma.configuracion.findUnique({
        where: { key: 'wtsp_reschedule_template' }
      });
      const addressConfig = await prisma.configuracion.findUnique({
        where: { key: 'address' }
      });
      const wppTemplate = wppRescheduleConfig?.value || "¡Hola [Nombre]! Tu turno fue reprogramado con éxito para el [FechaTurno] a las [Horario].";
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
    } catch (wppErr) {
      console.error('Failed to send customer reschedule WhatsApp:', wppErr);
      await prisma.notificacion.create({
        data: {
          clienteId: updatedTurno.clienteId,
          turnoId: updatedTurno.id,
          canal: 'WHATSAPP',
          mensaje: `Error al enviar WhatsApp de reprogramación (Autogestión): ${wppErr.message}`,
          estado: 'FALLIDO'
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Turno reprogramado con éxito.' });
  } catch (error) {
    console.error('Error in client rescheduling API:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
