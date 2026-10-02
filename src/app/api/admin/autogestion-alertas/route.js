import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sinceHours = parseInt(searchParams.get('sinceHours') || '4', 10);

    const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    // Exclude old historical turnos from past months (e.g., August, July)
    const minTurnoDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const turnos = await prisma.turno.findMany({
      where: {
        AND: [
          {
            OR: [
              { observaciones: { contains: '[CANCELADO_AUTOGESTION]' } },
              { observaciones: { contains: '[REPROGRAMADO_AUTOGESTION]' } },
              { observaciones: { contains: '- Autogestión]' } },
              { observaciones: { contains: '- Autogestion]' } },
              { observaciones: { contains: 'AUTOGESTION' } }
            ]
          },
          {
            NOT: {
              observaciones: { contains: 'Administrador' }
            }
          },
          {
            fecha: { gte: minTurnoDate }
          },
          {
            updatedAt: { gte: sinceDate }
          }
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
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });

    const alertas = turnos.map(t => {
      let tipo = 'REPROGRAMACION';
      if (
        t.estado === 'CANCELADO' ||
        t.observaciones?.includes('[CANCELADO_AUTOGESTION]') ||
        t.observaciones?.includes('[Pierde seña:') ||
        t.observaciones?.includes('[Cancelado -')
      ) {
        tipo = 'CANCELACION';
      } else if (
        t.estado === 'REPROGRAMADO' ||
        t.observaciones?.includes('[REPROGRAMADO_AUTOGESTION]') ||
        t.observaciones?.includes('[Turno reprogramado')
      ) {
        tipo = 'REPROGRAMACION';
      }

      let zonasTexto = '';
      try {
        const parsed = JSON.parse(t.zonas);
        zonasTexto = Array.isArray(parsed) ? parsed.map(z => z.nombre).join(', ') : t.zonas;
      } catch (e) {
        zonasTexto = t.zonas;
      }

      const dateIso = t.fecha.toISOString().split('T')[0];
      const d = new Date(t.fecha);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      const fechaFormateada = `${day}/${month}/${year}`;

      return {
        id: t.id,
        turnoId: t.id,
        clienteId: t.cliente?.id,
        clienteNombre: t.cliente?.nombreCompleto || 'Cliente Online',
        clienteWhatsapp: t.cliente?.whatsapp || '',
        clienteEmail: t.cliente?.email || '',
        tipo,
        fecha: fechaFormateada,
        fechaRaw: dateIso,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
        duracionMinutos: t.duracionMinutos,
        zonasTexto,
        valorTotal: t.valorTotal,
        valorSeña: t.valorSeña,
        estado: t.estado,
        createdAt: t.createdAt.toISOString(),
        updatedAt: (t.updatedAt || t.createdAt).toISOString()
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
