import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db.js';
import { verifySessionToken } from '@/lib/auth.js';

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.solicitudAutogestion.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Solicitud eliminada con éxito' });
  } catch (error) {
    console.error('Error deleting autogestion solicitud:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la solicitud' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { estado } = body;

    const updated = await prisma.solicitudAutogestion.update({
      where: { id },
      data: {
        ...(estado ? { estado } : {})
      }
    });

    return NextResponse.json({ success: true, solicitud: updated });
  } catch (error) {
    console.error('Error updating autogestion solicitud:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la solicitud' },
      { status: 500 }
    );
  }
}
