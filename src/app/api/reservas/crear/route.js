import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';
import { mpPreference } from '@/lib/mercadopago.js';
import { normalizeWhatsApp } from '@/lib/whatsapp.js';

// Convert minutes from midnight to HH:MM string helper
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Convert HH:MM to minutes
function timeToMinutes(timeStr) {
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
    const { nombreCompleto, whatsapp, email, dni, fechaStr, horaInicio, selectedZoneIds, observaciones } = body;

    if (!nombreCompleto || !whatsapp || !email || !dni || !fechaStr || !horaInicio || !selectedZoneIds || selectedZoneIds.length === 0) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios son requeridos.' },
        { status: 400 }
      );
    }

    // Past Date/Time Check
    if (isPastDateTime(fechaStr, horaInicio)) {
      return NextResponse.json({ error: 'El horario seleccionado ya no está disponible por haber transcurrido.' }, { status: 400 });
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

    // 2. Resolve client by DNI
    let client = await prisma.cliente.findUnique({
      where: { dni: dni }
    });

    let isNewClient = false;

    if (!client) {
      // Check if client exists with same email or whatsapp but no DNI
      client = await prisma.cliente.findFirst({
        where: {
          OR: [
            { email: email },
            { whatsapp: finalWhatsapp }
          ]
        }
      });

      if (client) {
        // Update client with DNI and other details
        client = await prisma.cliente.update({
          where: { id: client.id },
          data: { dni, nombreCompleto, whatsapp: finalWhatsapp, email }
        });
      } else {
        // Create new client
        isNewClient = true;
        client = await prisma.cliente.create({
          data: {
            dni,
            nombreCompleto,
            whatsapp: finalWhatsapp,
            email,
            canalAdquisicion: 'ORGANICO',
            estado: 'ACTIVO'
          }
        });
      }
    }

    // 3. Enforce maximum 1 active appointment rule
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const activeTurno = await prisma.turno.findFirst({
      where: {
        clienteId: client.id,
        estado: {
          in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION']
        },
        fecha: {
          gte: today
        }
      }
    });

    if (activeTurno) {
      return NextResponse.json({
        error: 'Ya tenés un turno activo registrado. Por razones de seguridad y organización, no es posible agendar 2 o más turnos en paralelo de forma online. Por favor, comunícate con nosotros para reprogramarlo.'
      }, { status: 400 });
    }

    // 3. Calculate appointment details (duration, pricing, seña)
    // Always use isNewClient=false for duration to match the availability API
    // The new client bonus is an internal operational buffer, not shown to the client
    const { valorTotal, valorSeña, duracionMinutos } = calculateTurnDetails(dbZones, false);

    // Calculate horaFin
    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = startMinutes + duracionMinutos;
    const horaFin = minutesToTime(endMinutes);

    // Fetch work hours configuration
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    const workStartStr = startConfig?.value || '10:00';
    const workEndStr = endConfig?.value || '20:00';
    
    const workStartMinutes = timeToMinutes(workStartStr);
    const workEndMinutes = timeToMinutes(workEndStr);

    if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
      return NextResponse.json({ error: `El horario seleccionado está fuera del horario de atención permitido (${workStartStr} hs a ${workEndStr} hs).` }, { status: 400 });
    }

    // Overlap Check
    const checkOverlap = await hasOverlappingTurno(fechaStr, horaInicio, horaFin);
    if (checkOverlap) {
      return NextResponse.json({ error: 'El horario seleccionado ya no se encuentra disponible. Por favor, elige otro horario o día.' }, { status: 400 });
    }

    // 4. Create Turno in database in PENDIENTE_PAGO state
    const targetDate = new Date(fechaStr + 'T00:00:00');
    
    const turno = await prisma.turno.create({
      data: {
        clienteId: client.id,
        fecha: targetDate,
        horaInicio,
        horaFin,
        duracionMinutos,
        zonas: JSON.stringify(dbZones.map(z => ({ id: z.id, nombre: z.nombre, precio: z.precioBase, duracion: z.duracionMinutos }))),
        valorTotal,
        valorSeña,
        saldoPendiente: valorTotal - valorSeña,
        estado: 'PENDIENTE_PAGO',
        observaciones
      }
    });

    // 5. Create MercadoPago preference for the seña
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // In MercadoPago v2 SDK, preference.create takes a body object
    const preference = await mpPreference.create({
      body: {
        items: [
          {
            id: turno.id,
            title: `Seña Turno Depilación Láser - ${nombreCompleto}`,
            quantity: 1,
            unit_price: valorSeña,
            currency_id: 'ARS'
          }
        ],
        metadata: {
          turno_id: turno.id
        },
        back_urls: {
          success: `${appUrl}/booking/success?turnoId=${turno.id}`,
          failure: `${appUrl}/booking/failure?turnoId=${turno.id}`,
          pending: `${appUrl}/booking/success?turnoId=${turno.id}` // handle pending as success for UX
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/webhooks/mercadopago`
      }
    });

    return NextResponse.json({
      success: true,
      initPoint: preference.init_point,
      preferenceId: preference.id,
      turnoId: turno.id
    });
  } catch (error) {
    console.error('Error in create reservation API:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
