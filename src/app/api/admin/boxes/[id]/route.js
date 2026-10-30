import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { ensureDefaultBox } from '../route';

export const dynamic = 'force-dynamic';

async function getAuthSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  return sessionCookie ? verifySessionToken(sessionCookie.value) : null;
}

export async function PUT(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, color, horaInicio, horaFin, diasAtencion, servicioId, activo } = body;

    const existingBox = await prisma.box.findUnique({
      where: { id }
    });

    if (!existingBox) {
      return NextResponse.json({ error: 'Box no encontrado' }, { status: 404 });
    }

    const dataToUpdate = {};
    if (nombre !== undefined && nombre.trim()) dataToUpdate.nombre = nombre.trim();
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion?.trim() || null;
    if (color !== undefined) dataToUpdate.color = color;
    if (horaInicio !== undefined) dataToUpdate.horaInicio = horaInicio;
    if (horaFin !== undefined) dataToUpdate.horaFin = horaFin;
    if (diasAtencion !== undefined) dataToUpdate.diasAtencion = diasAtencion;
    if (servicioId !== undefined) dataToUpdate.servicioId = servicioId || null;

    if (activo !== undefined) {
      // El box principal de administrador no se puede desactivar
      if (existingBox.esPrincipal && activo === false) {
        return NextResponse.json(
          { error: 'El Box Principal no puede ser desactivado' },
          { status: 400 }
        );
      }
      dataToUpdate.activo = Boolean(activo);
    }

    const updatedBox = await prisma.box.update({
      where: { id },
      data: dataToUpdate,
      include: {
        servicio: true
      }
    });

    return NextResponse.json(updatedBox);
  } catch (error) {
    console.error('Error al actualizar box:', error);
    return NextResponse.json({ error: 'Error al actualizar box' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const boxToDelete = await prisma.box.findUnique({
      where: { id },
      include: {
        _count: {
          select: { turnos: true }
        }
      }
    });

    if (!boxToDelete) {
      return NextResponse.json({ error: 'Box no encontrado' }, { status: 404 });
    }

    if (boxToDelete.esPrincipal) {
      return NextResponse.json(
        { error: 'No se puede eliminar el Box Principal de Administrador' },
        { status: 400 }
      );
    }

    // Reasignar todos sus turnos al Box Principal
    const defaultBox = await ensureDefaultBox();
    if (defaultBox && boxToDelete._count.turnos > 0) {
      await prisma.turno.updateMany({
        where: { boxId: id },
        data: { boxId: defaultBox.id }
      });
    }

    // Desvincular bloqueos asociados si hubiese
    await prisma.bloqueo.updateMany({
      where: { boxId: id },
      data: { boxId: null }
    });

    await prisma.box.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Box eliminado correctamente y turnos reasignados al Box Principal'
    });
  } catch (error) {
    console.error('Error al eliminar box:', error);
    return NextResponse.json({ error: 'Error al eliminar box' }, { status: 500 });
  }
}
