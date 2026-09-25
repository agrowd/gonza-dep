import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        cliente: true
      }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Determine sequential receipt number based on completed turns up to this one, or slice of ID
    const countPrior = await prisma.turno.count({
      where: {
        createdAt: { lte: turno.createdAt }
      }
    });
    const numeroRecibo = String(countPrior).padStart(8, '0');

    let parsedZonas = [];
    try {
      parsedZonas = JSON.parse(turno.zonas);
    } catch (e) {
      parsedZonas = [{ nombre: turno.zonas || 'Depilación Láser', precio: turno.valorTotal }];
    }

    const receiptData = {
      emisor: {
        nombre: 'Gonzalo Depilacion Laser',
        domicilio: 'Parana 597 piso 8 depto 48 - CABA',
        leyenda: 'Documento no válido como factura'
      },
      recibo: {
        tipo: 'X',
        numero: numeroRecibo,
        fechaEmision: new Date(turno.fecha).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        turnoId: turno.id,
        hora: `${turno.horaInicio} a ${turno.horaFin}`
      },
      cliente: {
        id: turno.cliente.id,
        nombreCompleto: turno.cliente.nombreCompleto,
        dni: turno.cliente.dni || 'Sin registrar',
        whatsapp: turno.cliente.whatsapp,
        email: turno.cliente.email
      },
      items: parsedZonas.map(z => ({
        servicio: z.nombre,
        precioUnitario: z.precio || (turno.valorTotal / (parsedZonas.length || 1)),
        cantidad: 1,
        subtotal: z.precio || (turno.valorTotal / (parsedZonas.length || 1))
      })),
      totales: {
        valorTotal: turno.valorTotal,
        valorSeña: turno.valorSeña,
        saldoPendiente: turno.saldoPendiente,
        bonificacion: turno.bonificacion || 0,
        estado: turno.estado
      }
    };

    return NextResponse.json(receiptData);
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    return NextResponse.json({ error: 'Error interno al generar recibo' }, { status: 500 });
  }
}
