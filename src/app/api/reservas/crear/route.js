import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';
import { normalizeWhatsApp } from '@/lib/whatsapp.js';
import { cleanupExpiredPendingPayments } from '@/lib/cleanup.js';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

async function hasOverlappingTurno(fechaStr, horaInicio, horaFin, excludeTurnoId = null) {
  const targetDate = new Date(fechaStr + 'T00:00:00');
  const nextDate = new Date(targetDate);
  nextDate.setDate(targetDate.getDate() + 1);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const dayTurnos = await prisma.turno.findMany({
    where: {
      fecha: {
        gte: targetDate,
        lt: nextDate
      },
      estado: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
      NOT: {
        estado: 'PENDIENTE_PAGO',
        createdAt: { lt: fiveMinutesAgo }
      },
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

  // Check administrative blocks
  const dayBloqueos = await prisma.bloqueo.findMany({
    where: {
      fecha: {
        gte: targetDate,
        lt: nextDate
      }
    }
  });

  for (const b of dayBloqueos) {
    if (b.esDiaCompleto) return b;
    const bStart = timeToMinutes(b.horaInicio);
    const bEnd = timeToMinutes(b.horaFin);
    if (bStart < newEndMin && bEnd > newStartMin) {
      return b;
    }
  }

  return null;
}

export async function POST(request) {
  try {
    await cleanupExpiredPendingPayments();
    const body = await request.json();
    const { nombreCompleto, whatsapp, email, dni, fechaStr, horaInicio, selectedZoneIds, observaciones } = body;

    if (!nombreCompleto || !whatsapp || !email || !fechaStr || !horaInicio || !selectedZoneIds || selectedZoneIds.length === 0) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios son requeridos.' },
        { status: 400 }
      );
    }

    // Argentina timezone checks
    const now = new Date();
    const offsetBA = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowLocal = new Date(utc + (3600000 * offsetBA));
    const todayStr = nowLocal.toISOString().split('T')[0];

    if (fechaStr <= todayStr) {
      return NextResponse.json({ error: 'No es posible agendar turnos para el mismo día o fechas pasadas.' }, { status: 400 });
    }

    const targetDate = new Date(fechaStr + 'T00:00:00');
    const targetDay = targetDate.getDay(); // 0 = Sunday
    if (targetDay === 0) {
      return NextResponse.json({ error: 'No es posible agendar turnos los domingos.' }, { status: 400 });
    }

    // 1. Fetch zones details from DB
    const dbZones = await prisma.zona.findMany({
      where: {
        id: { in: selectedZoneIds }
      }
    });

    if (dbZones.length !== selectedZoneIds.length) {
      return NextResponse.json({ error: 'Alguna de las zonas seleccionadas no es válida.' }, { status: 400 });
    }

    const finalWhatsapp = normalizeWhatsApp(whatsapp);

    // 2. Client deferred creation/update: ONLY created upon reservation confirmation
    let client = await prisma.cliente.findFirst({
      where: {
        email: {
          equals: email.trim().toLowerCase()
        }
      }
    });

    if (!client && dni) {
      client = await prisma.cliente.findUnique({
        where: { dni: dni.trim() }
      });
    }

    if (client) {
      const updateData = {};
      if (!client.dni && dni) updateData.dni = dni.trim();
      if (client.nombreCompleto !== nombreCompleto.trim()) updateData.nombreCompleto = nombreCompleto.trim();
      if (client.whatsapp !== finalWhatsapp) updateData.whatsapp = finalWhatsapp;
      if (client.email.toLowerCase() !== email.trim().toLowerCase()) updateData.email = email.trim().toLowerCase();

      if (Object.keys(updateData).length > 0) {
        client = await prisma.cliente.update({
          where: { id: client.id },
          data: updateData
        });
      }
    } else {
      client = await prisma.cliente.create({
        data: {
          dni: dni ? dni.trim() : null,
          nombreCompleto: nombreCompleto.trim(),
          whatsapp: finalWhatsapp,
          email: email.trim().toLowerCase(),
          canalAdquisicion: 'ORGANICO',
          estado: 'ACTIVO'
        }
      });
    }

    // 3. Enforce maximum 1 active appointment rule
    const todayZero = new Date(todayStr + 'T00:00:00');
    const activeTurno = await prisma.turno.findFirst({
      where: {
        clienteId: client.id,
        estado: {
          in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION']
        },
        fecha: {
          gte: todayZero
        }
      }
    });

    if (activeTurno) {
      return NextResponse.json({
        error: 'Ya tenés un turno activo registrado. Por razones de organización, no es posible agendar turnos paralelos. Podés consultar tu turno para reprogramarlo.'
      }, { status: 400 });
    }

    // 4. Calculate appointment duration & values
    const { valorTotal, valorSeña, duracionMinutos } = calculateTurnDetails(dbZones, false);

    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = startMinutes + duracionMinutos;
    const horaFin = minutesToTime(endMinutes);

    // Verify operating hours
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    const workStartStr = startConfig?.value || '12:30';
    const workEndStr = endConfig?.value || '22:00';

    if (startMinutes < timeToMinutes(workStartStr) || endMinutes > timeToMinutes(workEndStr)) {
      return NextResponse.json({ error: `El horario seleccionado está fuera de atención (${workStartStr} a ${workEndStr} hs).` }, { status: 400 });
    }

    // Overlap check
    const checkOverlap = await hasOverlappingTurno(fechaStr, horaInicio, horaFin);
    if (checkOverlap) {
      return NextResponse.json({ error: 'El horario seleccionado ya no se encuentra disponible. Por favor, elige otro horario o día.' }, { status: 400 });
    }

    // 5. Create Turno with state PENDIENTE_PAGO and [AUTOGESTION] tag
    const zonasPayload = dbZones.map(z => ({ id: z.id, nombre: z.nombre, precio: z.precioBase, duracion: z.duracionMinutos }));
    const zonasNombres = dbZones.map(z => z.nombre).join(', ');

    const obsText = observaciones ? `[AUTOGESTION] ${observaciones}` : '[AUTOGESTION] Reserva creada por autogestión';

    const turno = await prisma.turno.create({
      data: {
        clienteId: client.id,
        fecha: targetDate,
        horaInicio,
        horaFin,
        duracionMinutos,
        zonas: JSON.stringify(zonasPayload),
        valorTotal,
        valorSeña,
        saldoPendiente: valorTotal - valorSeña,
        estado: 'PENDIENTE_PAGO',
        observaciones: obsText
      }
    });

    // 6. WhatsApp bypass ("Pagar Seña")
    // Retrieve business phone number
    const businessPhoneConfig = await prisma.configuracion.findUnique({ where: { key: 'business_whatsapp' } });
    const businessPhone = businessPhoneConfig?.value || process.env.BUSINESS_WHATSAPP || process.env.ADMIN_WHATSAPP || '5492984696364';
    const cleanPhone = businessPhone.replace(/\D/g, '');

    // Format readable date (e.g., 25/10/2026)
    const [y, m, d] = fechaStr.split('-');
    const fechaLegible = `${d}/${m}/${y}`;

    // Exact message template required by Luciano
    const whatsappMessage = `Hola 👋 Quiero reservar este turno:

Nombre: ${client.nombreCompleto}
Fecha: ${fechaLegible}
Horario: ${horaInicio}
Zonas: ${zonasNombres}
Duración: ${duracionMinutos} min
Total: $${Math.round(valorTotal).toLocaleString('es-AR')}

Quedo a la espera de los datos para realizar el pago de la seña y confirmar el turno.`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      turnoId: turno.id,
      clienteId: client.id,
      whatsappUrl,
      turno: {
        id: turno.id,
        fecha: fechaStr,
        horaInicio,
        horaFin,
        duracionMinutos,
        zonas: zonasNombres,
        valorTotal,
        valorSeña
      }
    });
  } catch (error) {
    console.error('Error in create reservation API:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
