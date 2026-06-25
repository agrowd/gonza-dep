import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    if (!dni) {
      return NextResponse.json({ error: 'DNI es requerido' }, { status: 400 });
    }

    const client = await prisma.cliente.findUnique({
      where: { dni: dni },
      include: {
        turnos: {
          where: {
            estado: {
              in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION']
            },
            fecha: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today or future
            }
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ exists: false });
    }

    const hasActiveTurno = client.turnos.length > 0;

    return NextResponse.json({
      exists: true,
      client: {
        id: client.id,
        nombreCompleto: client.nombreCompleto,
        whatsapp: client.whatsapp,
        email: client.email
      },
      hasActiveTurno
    });

  } catch (error) {
    console.error('Error in query client by DNI:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
