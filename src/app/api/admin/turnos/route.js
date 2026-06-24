import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';

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
      fechaStr,
      horaInicio,
      horaFin,
      selectedZoneIds,
      valorTotal, // overridden or sum
      valorSeña,  // overridden or sum
      estado,
      observaciones
    } = body;

    if (estado !== 'BLOQUEADO' && (!fechaStr || !horaInicio || !horaFin || !selectedZoneIds || selectedZoneIds.length === 0)) {
      return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 });
    }

    if (estado === 'BLOQUEADO' && (!fechaStr || !horaInicio || !horaFin)) {
      return NextResponse.json({ error: 'Fecha y horarios son requeridos para bloquear' }, { status: 400 });
    }

    let finalClienteId = clienteId;

    // 1. Resolve client (create if new or details provided)
    if (!finalClienteId) {
      if (!nombreCompleto || !whatsapp || !email) {
        return NextResponse.json({ error: 'Datos de cliente requeridos para nuevo cliente' }, { status: 400 });
      }

      // Check if already exists
      let client = await prisma.cliente.findFirst({
        where: {
          OR: [
            { email: email },
            { whatsapp: whatsapp }
          ]
        }
      });

      if (!client) {
        client = await prisma.cliente.create({
          data: {
            nombreCompleto,
            whatsapp,
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
      const dbZones = await prisma.zona.findMany({
        where: { id: { in: selectedZoneIds } }
      });
      zonasJson = JSON.stringify(dbZones.map(z => ({ id: z.id, nombre: z.nombre, precio: z.precioBase, duracion: z.duracionMinutos })));
      
      const clientRecord = await prisma.cliente.findUnique({ where: { id: finalClienteId }, include: { turnos: true } });
      const isNew = clientRecord.turnos.length === 0;
      const coreDetails = calculateTurnDetails(dbZones, isNew);
      
      computedDuration = coreDetails.duracionMinutos;
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

    return NextResponse.json(newTurno);
  } catch (error) {
    console.error('Error creating manually:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
