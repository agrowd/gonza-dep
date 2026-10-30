import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

// PUT: Update a zone
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    
    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, precioBase, duracionMinutos, señaBase, servicioId } = body;

    const data = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (precioBase !== undefined) data.precioBase = Number(precioBase);
    if (duracionMinutos !== undefined) data.duracionMinutos = Number(duracionMinutos);
    if (señaBase !== undefined) data.señaBase = Number(señaBase);
    if (servicioId !== undefined) data.servicioId = servicioId || null;

    const updated = await prisma.zona.update({
      where: { id },
      data,
      include: {
        servicio: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating zone:', error);
    return NextResponse.json({ error: 'Error interno al actualizar zona' }, { status: 500 });
  }
}

// DELETE: Delete a zone
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.zona.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting zone:', error);
    return NextResponse.json({ error: 'Error interno al eliminar zona' }, { status: 500 });
  }
}
