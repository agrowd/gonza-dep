import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
    }

    // Query date range with buffer to capture all UTC/local timezone shifts
    const startDate = new Date(`${fecha}T00:00:00.000Z`);
    const endDate = new Date(`${fecha}T23:59:59.999Z`);

    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: new Date(startDate.getTime() - 12 * 3600 * 1000),
          lte: new Date(endDate.getTime() + 12 * 3600 * 1000)
        },
        estado: { not: 'CANCELADO' }
      },
      include: {
        cliente: true
      }
    });

    // Filter turnos matching exact YYYY-MM-DD date string
    const filteredTurnos = turnos.filter(t => {
      if (!t.fecha) return false;
      const rawIsoStr = typeof t.fecha === 'string' ? t.fecha.split('T')[0] : t.fecha.toISOString().split('T')[0];
      return rawIsoStr === fecha;
    });

    // Sort chronologically by start time in minutes
    filteredTurnos.sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));

    return NextResponse.json(filteredTurnos);
  } catch (error) {
    console.error('Error fetching printable turnos:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
