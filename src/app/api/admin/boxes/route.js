import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  return sessionCookie ? verifySessionToken(sessionCookie.value) : null;
}

/**
 * Garantiza la existencia del Box 1 Principal (Gonzalo)
 * y reasigna retroactivamente cualquier turno con boxId null a este box.
 */
export async function ensureDefaultBox() {
  try {
    let defaultBox = await prisma.box.findFirst({
      where: { esPrincipal: true }
    });

    if (!defaultBox) {
      // Buscar si existe algún box previo para promoverlo o crearlo
      defaultBox = await prisma.box.findFirst({
        orderBy: { createdAt: 'asc' }
      });

      if (!defaultBox) {
        defaultBox = await prisma.box.create({
          data: {
            nombre: 'Box 1 - Principal (Gonzalo)',
            descripcion: 'Cabina principal de atención',
            color: '#7a1f1e',
            esPrincipal: true,
            activo: true,
            horaInicio: '14:00',
            horaFin: '22:00',
            diasAtencion: '1,2,3,4,5'
          }
        });
      } else {
        defaultBox = await prisma.box.update({
          where: { id: defaultBox.id },
          data: { esPrincipal: true }
        });
      }
    }

    // Vinculación retrocompatible: todos los turnos huérfanos se asocian al box principal
    await prisma.turno.updateMany({
      where: { boxId: null },
      data: { boxId: defaultBox.id }
    });

    return defaultBox;
  } catch (error) {
    console.error('Error en ensureDefaultBox:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await ensureDefaultBox();

    const boxes = await prisma.box.findMany({
      include: {
        servicio: true,
        _count: {
          select: { turnos: true }
        }
      },
      orderBy: [
        { esPrincipal: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json(boxes);
  } catch (error) {
    console.error('Error al listar boxes:', error);
    return NextResponse.json({ error: 'Error al obtener boxes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, color, horaInicio, horaFin, diasAtencion, servicioId } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del box es obligatorio' }, { status: 400 });
    }

    const newBox = await prisma.box.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        color: color || '#7a1f1e',
        horaInicio: horaInicio || '14:00',
        horaFin: horaFin || '22:00',
        diasAtencion: diasAtencion || '1,2,3,4,5',
        servicioId: servicioId || null,
        esPrincipal: false,
        activo: true
      },
      include: {
        servicio: true
      }
    });

    return NextResponse.json(newBox, { status: 201 });
  } catch (error) {
    console.error('Error al crear box:', error);
    return NextResponse.json({ error: 'Error interno al crear box' }, { status: 500 });
  }
}
