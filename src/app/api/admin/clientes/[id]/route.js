import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

// GET: Fetch client profile details, turn history, and logs
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const client = await prisma.cliente.findUnique({
      where: { id },
      include: {
        turnos: {
          orderBy: { fecha: 'desc' }
        },
        notificaciones: {
          orderBy: { fechaEnvio: 'desc' }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT: Update client profile
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      nombreCompleto,
      whatsapp,
      email,
      canalAdquisicion,
      estado,
      frecuencia,
      observaciones,
      notasGonzalo
    } = body;

    const updateData = {};
    if (nombreCompleto) updateData.nombreCompleto = nombreCompleto;
    if (whatsapp) updateData.whatsapp = whatsapp;
    if (email) updateData.email = email;
    if (canalAdquisicion) updateData.canalAdquisicion = canalAdquisicion;
    if (estado) updateData.estado = estado;
    if (frecuencia !== undefined) updateData.frecuencia = Number(frecuencia);
    if (observaciones !== undefined) updateData.observaciones = observaciones;
    if (notasGonzalo !== undefined) updateData.notasGonzalo = notasGonzalo;

    const updated = await prisma.cliente.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Delete client and cascade delete their appointments
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.cliente.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
