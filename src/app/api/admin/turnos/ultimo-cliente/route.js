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
    const clienteId = searchParams.get('clienteId');
    const nombre = searchParams.get('nombre');

    let targetClienteId = clienteId;
    if (!targetClienteId && nombre) {
      const c = await prisma.cliente.findFirst({
        where: {
          nombreCompleto: { equals: nombre.trim() }
        }
      });
      if (c) targetClienteId = c.id;
    }

    if (!targetClienteId) {
      return NextResponse.json({ found: false });
    }

    // Buscar el último turno del cliente (ordenado por fecha DESC, createdAt DESC)
    const ultimoTurno = await prisma.turno.findFirst({
      where: { clienteId: targetClienteId },
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (!ultimoTurno) {
      return NextResponse.json({ found: false });
    }

    // Parsear zonas
    let parsedZones = [];
    try {
      parsedZones = JSON.parse(ultimoTurno.zonas);
    } catch {
      parsedZones = [];
    }

    return NextResponse.json({
      found: true,
      turnoId: ultimoTurno.id,
      fecha: ultimoTurno.fecha,
      estado: ultimoTurno.estado,
      señaEstado: ultimoTurno.señaEstado, // 'CONSERVADA' | 'PERDIDA' | null
      valorTotal: ultimoTurno.valorTotal,
      valorSeña: ultimoTurno.valorSeña,
      zonas: parsedZones,
      zonasRaw: ultimoTurno.zonas,
      duracionMinutos: ultimoTurno.duracionMinutos,
      descuentoTipo: ultimoTurno.descuentoTipo,
      descuentoValor: ultimoTurno.descuentoValor,
      bonificacion: ultimoTurno.bonificacion,
      observaciones: ultimoTurno.observaciones,
      notasGonzalo: ultimoTurno.notasGonzalo
    });
  } catch (error) {
    console.error('Error fetching ultimo turno de cliente:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
