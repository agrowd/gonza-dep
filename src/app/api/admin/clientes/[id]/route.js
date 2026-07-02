import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { normalizeWhatsApp } from '@/lib/whatsapp.js';

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
      dni,
      canalAdquisicion,
      estado,
      frecuencia,
      observaciones,
      notasGonzalo
    } = body;

    // 1. DNI Uniqueness check (only if non-empty and changed)
    if (dni) {
      const existingDni = await prisma.cliente.findFirst({
        where: {
          dni,
          id: { not: id }
        }
      });
      if (existingDni) {
        return NextResponse.json({ error: 'Ya existe otro cliente registrado con el DNI ingresado.' }, { status: 400 });
      }
    }

    // 2. Email Uniqueness check
    if (email) {
      const existingEmail = await prisma.cliente.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'Ya existe otro cliente registrado con el Email ingresado.' }, { status: 400 });
      }
    }

    const finalWhatsapp = whatsapp ? normalizeWhatsApp(whatsapp) : undefined;

    // 3. WhatsApp Uniqueness check
    if (finalWhatsapp) {
      const existingWhatsapp = await prisma.cliente.findFirst({
        where: {
          whatsapp: finalWhatsapp,
          id: { not: id }
        }
      });
      if (existingWhatsapp) {
        return NextResponse.json({ error: 'Ya existe otro cliente registrado con el número de WhatsApp ingresado.' }, { status: 400 });
      }
    }

    const updateData = {};
    if (nombreCompleto) updateData.nombreCompleto = nombreCompleto;
    if (finalWhatsapp !== undefined) updateData.whatsapp = finalWhatsapp;
    if (email) updateData.email = email;
    if (dni !== undefined) updateData.dni = dni || null;
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
