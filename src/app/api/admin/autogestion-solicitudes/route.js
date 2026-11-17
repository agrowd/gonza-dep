import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db.js';
import { verifySessionToken } from '@/lib/auth.js';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

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

    const { searchParams } = new URL(request.url);
    const estadoFilter = searchParams.get('estado') || 'PENDIENTE';
    const operadorFilter = searchParams.get('operadorId') || 'ALL';

    const where = {};
    if (estadoFilter !== 'ALL' && estadoFilter !== 'TODOS') {
      where.estado = estadoFilter;
    }
    if (operadorFilter !== 'ALL' && operadorFilter !== 'TODOS') {
      where.operadorId = operadorFilter;
    }

    const [solicitudesRaw, pendingCount] = await Promise.all([
      prisma.solicitudAutogestion.findMany({
        where,
        orderBy: [
          { fecha: 'asc' },
          { horaInicio: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          cliente: {
            select: {
              id: true,
              nombreCompleto: true,
              whatsapp: true,
              email: true,
              dni: true,
              saldoAFavor: true
            }
          }
        }
      }),
      prisma.solicitudAutogestion.count({
        where: { estado: 'PENDIENTE' }
      })
    ]);

    // Compute live availability for each solicitud
    const solicitudes = await Promise.all(
      solicitudesRaw.map(async (sol) => {
        const solStartMin = timeToMinutes(sol.horaInicio);
        const solEndMin = timeToMinutes(sol.horaFin);
        const targetDate = new Date(sol.fechaStr + 'T00:00:00');
        const nextDate = new Date(sol.fechaStr + 'T23:59:59.999');

        // Check against active Turnos on same day
        const dayTurnosWhere = {
          fecha: { gte: targetDate, lte: nextDate },
          estado: { notIn: ['CANCELADO', 'NO_ASISTIO'] }
        };
        if (sol.boxId) {
          dayTurnosWhere.boxId = sol.boxId;
        }

        const dayTurnos = await prisma.turno.findMany({
          where: dayTurnosWhere,
          select: {
            id: true,
            horaInicio: true,
            horaFin: true,
            estado: true,
            cliente: { select: { nombreCompleto: true } }
          }
        });

        let overlapTurno = null;
        for (const t of dayTurnos) {
          const tStart = timeToMinutes(t.horaInicio);
          const tEnd = timeToMinutes(t.horaFin);
          if (tStart < solEndMin && tEnd > solStartMin) {
            overlapTurno = t;
            break;
          }
        }

        // Check against administrative Bloqueos on same day
        let overlapBlock = null;
        if (!overlapTurno) {
          const dayBlocks = await prisma.bloqueo.findMany({
            where: {
              fecha: { gte: targetDate, lte: nextDate }
            }
          });

          for (const b of dayBlocks) {
            if (b.esDiaCompleto) {
              overlapBlock = b;
              break;
            }
            const bStart = timeToMinutes(b.horaInicio);
            const bEnd = timeToMinutes(b.horaFin);
            if (bStart < solEndMin && bEnd > solStartMin) {
              overlapBlock = b;
              break;
            }
          }
        }

        const isAvailable = !overlapTurno && !overlapBlock;
        const ocupadoMotivo = overlapBlock
          ? (overlapBlock.motivo || 'Bloqueo administrativo')
          : (overlapTurno ? `Ocupado por ${overlapTurno.cliente?.nombreCompleto || 'otro turno'}` : null);

        return {
          ...sol,
          disponible: isAvailable,
          ocupadoMotivo
        };
      })
    );

    return NextResponse.json({
      success: true,
      solicitudes,
      pendingCount
    });
  } catch (error) {
    console.error('Error fetching autogestion solicitudes:', error);
    return NextResponse.json(
      { error: 'Error interno al obtener solicitudes' },
      { status: 500 }
    );
  }
}
