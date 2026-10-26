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
        turnos: []
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

    return NextResponse.json({
      fecha,
      totalSenas,
      count: turnos.length,
      turnos
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
