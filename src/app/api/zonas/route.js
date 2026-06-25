import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

// GET: Public list of zones
export async function GET() {
  try {
    const zonas = await prisma.zona.findMany({
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

// POST: Admin creates a new zone
export async function POST(request) {
  try {
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

    const newZona = await prisma.zona.create({
      data: {
        nombre,
        precioBase: Number(precioBase),
        duracionMinutos: Number(duracionMinutos),
        señaBase: Number(señaBase)
      }
    });

    return NextResponse.json(newZona);
  } catch (error) {
    console.error('Error creating zone:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
