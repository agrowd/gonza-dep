import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const dni = searchParams.get('dni');

    if (!email && !dni) {
      return NextResponse.json({ error: 'Email o DNI es requerido' }, { status: 400 });
    }

    let client = null;
    if (email) {
      client = await prisma.cliente.findFirst({
        where: {
          email: {
            equals: email
          }
        },
        include: {
          turnos: {
            where: {
              estado: {
                in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION']
              },
              fecha: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today or future
              }
            },
            orderBy: [
              { fecha: 'asc' },
              { horaInicio: 'asc' }
            ]
          }
        }
      });
    } else if (dni) {
      client = await prisma.cliente.findUnique({
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
            },
            orderBy: [
              { fecha: 'asc' },
              { horaInicio: 'asc' }
            ]
          }
        }
      });
    }

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
      hasActiveTurno,
      activeTurno: hasActiveTurno ? client.turnos[0] : null
    });

  } catch (error) {
    console.error('Error in query client by DNI:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
