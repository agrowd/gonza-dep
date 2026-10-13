import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function PUT(request, context) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { nombre, zonas, descuentoTipo, descuentoValor, fechaInicio, fechaFin, activo } = body;

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (zonas !== undefined) updateData.zonas = typeof zonas === 'string' ? zonas : JSON.stringify(zonas);
    if (descuentoTipo !== undefined) updateData.descuentoTipo = descuentoTipo;
    if (descuentoValor !== undefined) updateData.descuentoValor = parseFloat(descuentoValor);
    if (fechaInicio !== undefined) updateData.fechaInicio = fechaInicio ? new Date(fechaInicio) : null;
    if (fechaFin !== undefined) updateData.fechaFin = fechaFin ? new Date(fechaFin) : null;
    if (activo !== undefined) updateData.activo = Boolean(activo);

    const updated = await prisma.promocion.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ promocion: updated });
  } catch (error) {
    console.error('Error updating promocion:', error);
    return NextResponse.json({ error: 'Error al actualizar promoción' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    await prisma.promocion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promocion:', error);
    return NextResponse.json({ error: 'Error al eliminar promoción' }, { status: 500 });
  }
}
