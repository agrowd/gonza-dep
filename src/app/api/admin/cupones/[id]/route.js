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
    const { codigo, descuentoTipo, descuentoValor, usosPermitidos, fechaVencimiento, activo } = body;

    const updateData = {};
    if (codigo !== undefined) updateData.codigo = codigo.trim().toUpperCase();
    if (descuentoTipo !== undefined) updateData.descuentoTipo = descuentoTipo;
    if (descuentoValor !== undefined) updateData.descuentoValor = parseFloat(descuentoValor);
    if (usosPermitidos !== undefined) updateData.usosPermitidos = parseInt(usosPermitidos, 10);
    if (fechaVencimiento !== undefined) updateData.fechaVencimiento = fechaVencimiento ? new Date(fechaVencimiento) : null;
    if (activo !== undefined) updateData.activo = Boolean(activo);

    const updated = await prisma.cupon.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ cupon: updated });
  } catch (error) {
    console.error('Error updating cupon:', error);
    return NextResponse.json({ error: 'Error al actualizar cupón' }, { status: 500 });
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
    await prisma.cupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cupon:', error);
    return NextResponse.json({ error: 'Error al eliminar cupón' }, { status: 500 });
  }
}
