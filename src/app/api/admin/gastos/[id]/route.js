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
    if (!id) {
      return NextResponse.json({ error: 'ID de gasto requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { concepto, monto, fecha, categoriaId, observaciones } = body;

    const existingGasto = await prisma.gasto.findUnique({
      where: { id }
    });

    if (!existingGasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 400 });
    }

    const updateData = {};

    if (concepto !== undefined) {
      if (!concepto.trim()) {
        return NextResponse.json({ error: 'El concepto no puede estar vacío' }, { status: 400 });
      }
      updateData.concepto = concepto.trim();
    }

    if (monto !== undefined) {
      const num = parseFloat(monto);
      if (isNaN(num) || num <= 0) {
        return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
      }
      updateData.monto = num;
    }

    if (categoriaId !== undefined) {
      const cat = await prisma.categoriaGasto.findUnique({
        where: { id: categoriaId }
      });
      if (!cat) {
        return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
      }
      updateData.categoriaId = categoriaId;
    }

    if (fecha !== undefined) {
      updateData.fecha = new Date(fecha.includes('T') ? fecha : `${fecha}T12:00:00.000Z`);
    }

    if (observaciones !== undefined) {
      updateData.observaciones = observaciones?.trim() || null;
    }

    const updated = await prisma.gasto.update({
      where: { id },
      data: updateData,
      include: {
        categoria: true
      }
    });

    return NextResponse.json({
      gasto: {
        id: updated.id,
        concepto: updated.concepto,
        monto: updated.monto,
        fecha: updated.fecha.toISOString().split('T')[0],
        categoriaId: updated.categoriaId,
        categoriaNombre: updated.categoria?.nombre || 'General',
        categoriaColor: updated.categoria?.color || '#64748b',
        observaciones: updated.observaciones || ''
      }
    });
  } catch (error) {
    console.error('Error updating gasto:', error);
    return NextResponse.json({ error: 'Error al actualizar el gasto' }, { status: 500 });
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
    if (!id) {
      return NextResponse.json({ error: 'ID de gasto requerido' }, { status: 400 });
    }

    await prisma.gasto.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gasto:', error);
    return NextResponse.json({ error: 'Error al eliminar el gasto' }, { status: 500 });
  }
}
