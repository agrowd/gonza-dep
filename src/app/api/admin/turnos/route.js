import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';
import { sendConfirmationEmail } from '@/lib/email.js';
import { normalizeWhatsApp, sendWhatsAppMessage } from '@/lib/whatsapp.js';

// Convert HH:MM to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long' });
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

// GET: List turnos in range
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('start'); // e.g. "2026-06-15"
    const endStr = searchParams.get('end');     // e.g. "2026-06-21"

    if (!startStr || !endStr) {
      return NextResponse.json({ error: 'Rango de fechas requerido' }, { status: 400 });
    }

    const startDate = new Date(startStr + 'T00:00:00');
    const endDate = new Date(endStr + 'T23:59:59');

    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        cliente: true
      },
      orderBy: {
        horaInicio: 'asc'
      }
    });

    return NextResponse.json(turnos);
  } catch (error) {
    console.error('Error listing appointments:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Create manually by Admin
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clienteId, // if existing client
      nombreCompleto,
      whatsapp,
      email,
      dni,
      fechaStr,
      horaInicio,
      horaFin,
      selectedZoneIds,
      valorTotal, // overridden or sum
      valorSeña,  // overridden or sum
      estado,
      observaciones,
      hasOtros,
      otrosTexto
    } = body;

    if (estado !== 'BLOQUEADO' && (!fechaStr || !horaInicio || !horaFin || ((!selectedZoneIds || selectedZoneIds.length === 0) && !hasOtros))) {
      return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 });
    }

    if (estado === 'BLOQUEADO' && (!fechaStr || !horaInicio || !horaFin)) {
      return NextResponse.json({ error: 'Fecha y horarios son requeridos para bloquear' }, { status: 400 });
    }

    // Validation: Past Date/Time Check
    if (isPastDateTime(fechaStr, horaInicio)) {
      return NextResponse.json({ error: 'No es posible agendar turnos con fechas o de horarios anteriores/pasados.' }, { status: 400 });
    }

    // Fetch work hours configuration
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    const workStartStr = startConfig?.value || '10:00';
    const workEndStr = endConfig?.value || '20:00';
    
    const workStartMinutes = timeToMinutes(workStartStr);
    const workEndMinutes = timeToMinutes(workEndStr);
    
    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = timeToMinutes(horaFin);

    if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
      return NextResponse.json({ error: `El horario seleccionado está fuera del horario de atención permitido (${workStartStr} hs a ${workEndStr} hs).` }, { status: 400 });
    }

    // Validation: Overlap Check
    const checkOverlap = await hasOverlappingTurno(fechaStr, horaInicio, horaFin);
    if (checkOverlap) {
      const isBlock = checkOverlap.estado === 'BLOQUEADO';
      return NextResponse.json({
        error: isBlock 
          ? 'El horario seleccionado se encuentra bloqueado administrativamente.' 
          : `El horario seleccionado se solapa con otro turno de ${checkOverlap.cliente?.nombreCompleto || 'otro cliente'}.`
      }, { status: 400 });
    }

    let finalClienteId = clienteId;

    // 1. Resolve client (create if new or details provided)
    if (!finalClienteId) {
      if (!nombreCompleto || !whatsapp || !email) {
        return NextResponse.json({ error: 'Datos de cliente requeridos para nuevo cliente' }, { status: 400 });
      }

      const finalWhatsapp = normalizeWhatsApp(whatsapp);

      // Check if already exists
      let client = await prisma.cliente.findFirst({
        where: {
          OR: [
            { dni: dni || undefined },
            { email: email },
            { whatsapp: finalWhatsapp }
          ]
        }
      });

      if (!client) {
        client = await prisma.cliente.create({
          data: {
            dni: dni || null,
            nombreCompleto,
            whatsapp: finalWhatsapp,
            email,
            canalAdquisicion: 'ORGANICO',
            estado: 'ACTIVO'
          }
        });
      }
      finalClienteId = client.id;
    }

    // 2. Compute details (bypass zones if BLOQUEADO)
    let computedDuration = 30;
    let zonasJson = '[]';
    let finalValorTotal = valorTotal !== undefined && valorTotal !== '' ? Number(valorTotal) : 0;
    let finalValorSeña = valorSeña !== undefined && valorSeña !== '' ? Number(valorSeña) : 0;

    if (estado === 'BLOQUEADO') {
      const startMin = timeToMinutes(horaInicio);
      const endMin = timeToMinutes(horaFin);
      computedDuration = Math.max(10, endMin - startMin);
    } else {
      let dbZones = [];
      if (selectedZoneIds && selectedZoneIds.length > 0) {
        dbZones = await prisma.zona.findMany({
          where: { id: { in: selectedZoneIds } }
        });
      }
      const parsedZones = dbZones.map(z => ({ id: z.id, nombre: z.nombre, precio: z.precioBase, duracion: z.duracionMinutos }));
      if (hasOtros && otrosTexto) {
        parsedZones.push({ id: 'otros', nombre: `Otros: ${otrosTexto}`, precio: 0, duracion: 0 });
      }
      zonasJson = JSON.stringify(parsedZones);
      
      const clientRecord = await prisma.cliente.findUnique({ where: { id: finalClienteId }, include: { turnos: true } });
      const isNew = clientRecord.turnos.length === 0;
      const coreDetails = calculateTurnDetails(dbZones, isNew);
      
      computedDuration = coreDetails.duracionMinutos;
      if (computedDuration <= 0) {
        const startMin = timeToMinutes(horaInicio);
        const endMin = timeToMinutes(horaFin);
        computedDuration = Math.max(10, endMin - startMin);
      }
      if (valorTotal === undefined || valorTotal === '') finalValorTotal = coreDetails.valorTotal;
      if (valorSeña === undefined || valorSeña === '') finalValorSeña = coreDetails.valorSeña;
    }

    const targetDate = new Date(fechaStr + 'T00:00:00');

    // 4. Create appointment
    const newTurno = await prisma.turno.create({
      data: {
        clienteId: finalClienteId,
        fecha: targetDate,
        horaInicio,
        horaFin,
        duracionMinutos: computedDuration,
        zonas: zonasJson,
        valorTotal: finalValorTotal,
        valorSeña: finalValorSeña,
        saldoPendiente: Math.max(0, finalValorTotal - finalValorSeña),
        estado: estado || 'SEÑADO',
        observaciones
      },
      include: {
        cliente: true
      }
    });

    if (observaciones !== undefined && observaciones !== '') {
      await prisma.cliente.update({
        where: { id: finalClienteId },
        data: { observaciones }
      });
      if (newTurno.cliente) {
        newTurno.cliente.observaciones = observaciones;
      }
    }

    // 5. Send confirmation email and WhatsApp if it is a real appointment (not a time block)
    if (newTurno.estado !== 'BLOQUEADO') {
      const clientNotificationsEnabled = newTurno.cliente ? newTurno.cliente.enviarNotificaciones !== false : true;
      const notificationsEnabled = clientNotificationsEnabled;

      // 5.1 Send Email
      if (notificationsEnabled) {
        try {
          await sendConfirmationEmail(
            newTurno.cliente.email,
            newTurno.cliente.nombreCompleto,
            {
              fecha: newTurno.fecha,
              horaInicio: newTurno.horaInicio,
              zonas: newTurno.zonas,
              valorSeña: newTurno.valorSeña,
              valorTotal: newTurno.valorTotal
            }
          );
          await prisma.notificacion.create({
            data: {
              clienteId: newTurno.clienteId,
              turnoId: newTurno.id,
              canal: 'EMAIL',
              mensaje: `Confirmación de turno enviada por email al crearse manualmente.`,
              estado: 'ENVIADO'
            }
          });
        } catch (mailError) {
          console.error('Failed to send confirmation email on manual create:', mailError);
          await prisma.notificacion.create({
            data: {
              clienteId: newTurno.clienteId,
              turnoId: newTurno.id,
              canal: 'EMAIL',
              mensaje: `Fallo al enviar email de confirmación manual: ${mailError.message}`,
              estado: 'FALLIDO'
            }
          });
        }
      }

      // 5.2 Send WhatsApp confirmation
      if (notificationsEnabled) {
        try {
        const templateConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_confirmation_manual_template' }
        });
        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });

        const templateVal = templateConfig?.value || "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] para [Zonas] fue agendado con éxito. Recordá venir afeitado al ras. ¡Te esperamos!";
        const addressVal = addressConfig?.value || "Paraná 597, piso 8, depto 48";

        let zonesText = '';
        try {
          const parsedZonas = JSON.parse(newTurno.zonas);
          zonesText = parsedZonas.map(z => z.nombre).join(', ');
        } catch (e) {
          zonesText = 'tratamiento';
        }

        let msg = templateVal
          .replaceAll('[Nombre]', newTurno.cliente.nombreCompleto)
          .replaceAll('[FechaTurno]', formatDate(newTurno.fecha))
          .replaceAll('[Horario]', `${newTurno.horaInicio} hs`)
          .replaceAll('[Zonas]', zonesText)
          .replaceAll('[ValorTotal]', `$${newTurno.valorTotal}`)
          .replaceAll('[Seña]', `$${newTurno.valorSeña}`)
          .replaceAll('[Direccion]', addressVal);

        await sendWhatsAppMessage(newTurno.cliente.whatsapp, msg);

        await prisma.notificacion.create({
          data: {
            clienteId: newTurno.clienteId,
            turnoId: newTurno.id,
            canal: 'WHATSAPP',
            mensaje: msg,
            estado: 'ENVIADO'
          }
        });
        console.log(`WhatsApp confirmation automatically sent on manual create to ${newTurno.cliente.nombreCompleto}.`);
      } catch (wppError) {
        console.error('Failed to send WhatsApp confirmation on manual create:', wppError);
        await prisma.notificacion.create({
          data: {
            clienteId: newTurno.clienteId,
            turnoId: newTurno.id,
            canal: 'WHATSAPP',
            mensaje: `Fallo al enviar WhatsApp de confirmación manual: ${wppError.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }
  }

    return NextResponse.json(newTurno);
  } catch (error) {
    console.error('Error creating manually:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
