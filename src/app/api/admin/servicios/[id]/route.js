import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

// PUT: Modificar un servicio
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = sessionCookie ? verifySessionToken(sessionCookie.value) : null;
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, icono, activo, orden } = body;

    const data = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (descripcion !== undefined) data.descripcion = descripcion ? descripcion.trim() : null;
    if (icono !== undefined) data.icono = icono.trim();
    if (activo !== undefined) data.activo = !!activo;
    if (orden !== undefined) data.orden = Number(orden);

    const updated = await prisma.servicio.update({
      where: { id },
      data,
      include: {
        zonas: {
          orderBy: { nombre: 'asc' }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating servicio:', error);
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}

// DELETE: Eliminar un servicio (con salvaguarda para Depilación Láser)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = sessionCookie ? verifySessionToken(sessionCookie.value) : null;
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const targetService = await prisma.servicio.findUnique({
      where: { id },
      include: { zonas: true }
    });

    if (!targetService) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // No permitir borrar el servicio base "Depilación Láser"
    const lowerName = targetService.nombre.toLowerCase();
    if (lowerName.includes('depilaci')) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el servicio base de Depilación Láser.' 
      }, { status: 400 });
    }

    // Si tiene zonas vinculadas, reasignarlas a Depilación Láser antes de borrar
    if (targetService.zonas.length > 0) {
      const defaultService = await prisma.servicio.findFirst({
        where: {
          OR: [
            { nombre: 'Depilación Láser' },
            { nombre: 'Depilación Laser' }
          ]
        }
      });

      if (defaultService) {
        await prisma.zona.updateMany({
          where: { servicioId: id },
          data: { servicioId: defaultService.id }
        });
      }
    }

    await prisma.servicio.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting servicio:', error);
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 });
  }
}
