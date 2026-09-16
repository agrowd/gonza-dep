import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { horaInicio, horaFin, motivo, esDiaCompleto } = body;

    const data = {};
    if (horaInicio !== undefined) data.horaInicio = horaInicio;
    if (horaFin !== undefined) data.horaFin = horaFin;
    if (motivo !== undefined) data.motivo = motivo;
    if (esDiaCompleto !== undefined) data.esDiaCompleto = !!esDiaCompleto;

    const updated = await prisma.bloqueo.update({
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating bloqueo:', error);
    return NextResponse.json({ error: 'Error al actualizar bloqueo' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.bloqueo.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bloqueo:', error);
    return NextResponse.json({ error: 'Error al eliminar bloqueo' }, { status: 500 });
  }
}
