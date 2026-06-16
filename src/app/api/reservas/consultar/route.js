import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const turno = await prisma.turno.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Parse zones stringified array
    let zonasText = '';
    try {
      const parsedZonas = JSON.parse(turno.zonas);
      zonasText = parsedZonas.map(z => z.nombre).join(', ');
    } catch (e) {
      zonasText = turno.zonas;
    }

    return NextResponse.json({
      success: true,
      turno: {
        id: turno.id,
        clienteNombre: turno.cliente.nombreCompleto,
        fecha: turno.fecha,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
        duracionMinutos: turno.duracionMinutos,
        zonas: zonasText,
        valorTotal: turno.valorTotal,
        valorSeña: turno.valorSeña,
        saldoPendiente: turno.saldoPendiente,
        estado: turno.estado
      }
    });
  } catch (error) {
    console.error('Error in public query reservation API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
