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
    const { nombre, precioBase, duracionMinutos, señaBase } = body;

    if (!nombre || precioBase === undefined || duracionMinutos === undefined || señaBase === undefined) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    const updated = await prisma.zona.update({
      where: { id },
      data: {
        nombre,
        precioBase: Number(precioBase),
        duracionMinutos: Number(duracionMinutos),
        señaBase: Number(señaBase)
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating zone:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
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
    return NextResponse.json({ error: 'Error interno o zona vinculada a turnos existentes' }, { status: 500 });
  }
}
