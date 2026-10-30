import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Rol OPERADOR no tiene acceso a métricas ni importes financieros
    if (session.rol === 'OPERADOR') {
      return NextResponse.json({
        totalSenas: 0,
        count: 0,
        turnos: [],
        turnosNuevos: [],
        countNuevos: 0,
        totalSenasNuevos: 0
      });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha'); // e.g. "2026-10-23"
    if (!fecha) {
      return NextResponse.json({ error: 'Parámetro fecha requerido' }, { status: 400 });
    }

    // Rango para 'createdAt' en hora oficial argentina (UTC-3)
    // De 00:00:00-03:00 a 23:59:59.999-03:00 (equivale a 03:00Z a 02:59:59Z del día siguiente)
    const startCreated = new Date(`${fecha}T00:00:00.000-03:00`);
    const endCreated = new Date(`${fecha}T23:59:59.999-03:00`);

    const turnos = await prisma.turno.findMany({
      where: {
        createdAt: {
          gte: startCreated,
          lte: endCreated
        },
        valorSeña: {
          gt: 0
        },
        OR: [
          { estado: { not: 'CANCELADO' } },
          { estado: 'CANCELADO', señaEstado: 'PERDIDA' }
        ]
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            whatsapp: true,
            email: true
          }
        },
        operador: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const totalSenas = turnos.reduce((sum, t) => sum + Number(t.valorSeña || 0), 0);

    // Identificar clientes que tuvieron un turno activo/realizado en la agenda de esta misma fecha
    // Quienes tuvieron turno hoy y agendaron un turno futuro realizaron un "Turno Siguiente" (D-138)
    const startOfDay = new Date(`${fecha}T00:00:00.000Z`);
    const endOfDay = new Date(`${fecha}T23:59:59.999Z`);

    const clienteIds = [...new Set(turnos.map(t => t.clienteId).filter(Boolean))];

    const turnosEnEstaFecha = await prisma.turno.findMany({
      where: {
        clienteId: { in: clienteIds },
        fecha: {
          gte: startOfDay,
          lte: endOfDay
        },
        estado: { not: 'CANCELADO' },
        id: { notIn: turnos.map(t => t.id) }
      },
      select: {
        clienteId: true
      }
    });

    const clientsWithTurnoToday = new Set(turnosEnEstaFecha.map(t => t.clienteId));

    const turnosEnriquecidos = turnos.map(t => {
      const esTurnoSiguiente = clientsWithTurnoToday.has(t.clienteId);
      return {
        ...t,
        esTurnoSiguiente
      };
    });

    const turnosNuevos = turnosEnriquecidos.filter(t => !t.esTurnoSiguiente);
    const totalSenasNuevos = turnosNuevos.reduce((sum, t) => sum + Number(t.valorSeña || 0), 0);

    return NextResponse.json({
      fecha,
      totalSenas,                // Mantiene el total real para el cálculo financiero de Ingreso Neto
      count: turnos.length,
      turnos: turnosEnriquecidos,
      turnosNuevos,              // Solo clientes que agendan un NUEVO turno (excluye turno siguiente)
      countNuevos: turnosNuevos.length,
      totalSenasNuevos
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching señas día:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
