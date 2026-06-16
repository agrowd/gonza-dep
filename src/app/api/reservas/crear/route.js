import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';
import { mpPreference } from '@/lib/mercadopago.js';

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombreCompleto, whatsapp, email, fechaStr, horaInicio, selectedZoneIds, observaciones } = body;

    if (!nombreCompleto || !whatsapp || !email || !fechaStr || !horaInicio || !selectedZoneIds || selectedZoneIds.length === 0) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios son requeridos.' },
        { status: 400 }
      );
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

    // 2. Find if client exists by email or whatsapp
    let client = await prisma.cliente.findFirst({
      where: {
        OR: [
          { email: email },
          { whatsapp: whatsapp }
        ]
      }
    });

    let isNewClient = false;
    if (!client) {
      isNewClient = true;
      client = await prisma.cliente.create({
        data: {
          nombreCompleto,
          whatsapp,
          email,
          canalAdquisicion: 'ORGANICO', // default for online booking
          estado: 'ACTIVO'
        }
      });
    }

    // 3. Calculate appointment details (duration, pricing, seña)
    const { valorTotal, valorSeña, duracionMinutos } = calculateTurnDetails(dbZones, isNewClient);

    // Calculate horaFin
    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = startMinutes + duracionMinutos;
    const horaFin = minutesToTime(endMinutes);

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
