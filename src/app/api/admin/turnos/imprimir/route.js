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
    const fecha = searchParams.get('fecha');

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
    }

    // Parse date as range to search appointments in Argentina local day
    const startDate = new Date(`${fecha}T00:00:00`);
    const endDate = new Date(`${fecha}T23:59:59`);

    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate
        },
        estado: { not: 'CANCELADO' }
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
    console.error('Error fetching printable turnos:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
