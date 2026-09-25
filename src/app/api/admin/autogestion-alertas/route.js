import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sinceHours = parseInt(searchParams.get('sinceHours') || '48', 10);

    const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

    const turnos = await prisma.turno.findMany({
      where: {
        OR: [
          { observaciones: { contains: '[AUTOGESTION]' } },
          { observaciones: { contains: '[ONLINE]' } }
        ],
        createdAt: {
          gte: sinceDate
        }
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            whatsapp: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    const alertas = turnos.map(t => {
      let tipo = 'RESERVA';
      if (t.estado === 'REPROGRAMADO' || t.observaciones?.includes('[REPROGRAMADO_AUTOGESTION]')) {
        tipo = 'REPROGRAMACION';
      } else if (t.estado === 'CANCELADO' || t.observaciones?.includes('[CANCELADO_AUTOGESTION]')) {
        tipo = 'CANCELACION';
      }

      let zonasTexto = '';
      try {
        const parsed = JSON.parse(t.zonas);
        zonasTexto = Array.isArray(parsed) ? parsed.map(z => z.nombre).join(', ') : t.zonas;
      } catch (e) {
        zonasTexto = t.zonas;
      }

      const dateStr = t.fecha.toISOString().split('T')[0];

      return {
        id: t.id,
        turnoId: t.id,
        clienteId: t.cliente?.id,
        clienteNombre: t.cliente?.nombreCompleto || 'Cliente Online',
        clienteWhatsapp: t.cliente?.whatsapp || '',
        clienteEmail: t.cliente?.email || '',
        tipo,
        fecha: dateStr,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
        duracionMinutos: t.duracionMinutos,
        zonasTexto,
        valorTotal: t.valorTotal,
        valorSeña: t.valorSeña,
        estado: t.estado,
        createdAt: t.createdAt.toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      count: alertas.length,
      alertas
    });
  } catch (error) {
    console.error('Error fetching autogestion alertas:', error);
    return NextResponse.json({ error: 'Error al obtener alertas de autogestión' }, { status: 500 });
  }
}
