import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { ensureDefaultService } from '@/app/api/admin/servicios/route.js';

// GET: Lista pública de zonas, incluyendo su servicio asociado
export async function GET() {
  try {
    await ensureDefaultService();

    const zonas = await prisma.zona.findMany({
      include: {
        servicio: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });
    return NextResponse.json(zonas);
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json({ error: 'Error al obtener zonas' }, { status: 500 });
  }
}

// POST: Admin crea una nueva zona/tratamiento asociado a un servicio
export async function POST(request) {
  try {
    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, precioBase, duracionMinutos, señaBase, servicioId } = body;

    if (!nombre || precioBase === undefined || duracionMinutos === undefined || señaBase === undefined) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    let targetServicioId = servicioId;
    if (!targetServicioId) {
      const defaultService = await ensureDefaultService();
      targetServicioId = defaultService?.id;
    }

    const newZona = await prisma.zona.create({
      data: {
        nombre: nombre.trim(),
        precioBase: Number(precioBase),
        duracionMinutos: Number(duracionMinutos),
        señaBase: Number(señaBase),
        servicioId: targetServicioId || null
      },
      include: {
        servicio: true
      }
    });

    return NextResponse.json(newZona, { status: 201 });
  } catch (error) {
    console.error('Error creating zone:', error);
    return NextResponse.json({ error: 'Error interno al crear zona' }, { status: 500 });
  }
}
