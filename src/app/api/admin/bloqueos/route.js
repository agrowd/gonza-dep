import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD
    const start = searchParams.get('start'); // YYYY-MM-DD
    const end = searchParams.get('end'); // YYYY-MM-DD

    const where = {};
    if (fecha) {
      where.fecha = new Date(fecha + 'T00:00:00');
    } else if (start && end) {
      where.fecha = {
        gte: new Date(start + 'T00:00:00'),
        lte: new Date(end + 'T23:59:59')
      };
    }

    const bloqueos = await prisma.bloqueo.findMany({
      where,
      orderBy: [
        { fecha: 'asc' },
        { horaInicio: 'asc' }
      ]
    });

    return NextResponse.json(bloqueos);
  } catch (error) {
    console.error('Error fetching bloqueos:', error);
    return NextResponse.json({ error: 'Error interno al consultar bloqueos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fechaStr, horaInicio, horaFin, motivo, esDiaCompleto } = body;

    if (!fechaStr) {
      return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400 });
    }

    let finalStart = horaInicio || '10:00';
    let finalEnd = horaFin || '20:00';

    if (esDiaCompleto) {
      const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
      const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
      finalStart = startConfig?.value || '08:00';
      finalEnd = endConfig?.value || '22:00';
    }

    const nuevoBloqueo = await prisma.bloqueo.create({
      data: {
        fecha: new Date(fechaStr + 'T00:00:00'),
        horaInicio: finalStart,
        horaFin: finalEnd,
        motivo: motivo || 'Bloqueo administrativo',
        esDiaCompleto: !!esDiaCompleto
      }
    });

    return NextResponse.json(nuevoBloqueo, { status: 201 });
  } catch (error) {
    console.error('Error creating bloqueo:', error);
    return NextResponse.json({ error: 'Error interno al crear bloqueo' }, { status: 500 });
  }
}
