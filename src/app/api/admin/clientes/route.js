import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, new, recurrent, upcoming, no_upcoming, canceled, no_show

    // Query builder
    let whereClause = {};

    // Search by name, email, or whatsapp
    if (search) {
      whereClause.OR = [
        { nombreCompleto: { contains: search } },
        { email: { contains: search } },
        { whatsapp: { contains: search } }
      ];
    }

    // Load clients
    let clients = await prisma.cliente.findMany({
      where: whereClause,
      include: {
        turnos: {
          orderBy: { fecha: 'desc' }
        }
      },
      orderBy: {
        nombreCompleto: 'asc'
      }
    });

    const now = new Date();

    // Apply filters in memory for complex relationships
    if (filter && filter !== 'all') {
      clients = clients.filter(c => {
        const turnosRealizados = c.turnos.filter(t => t.estado === 'REALIZADO');
        const proximoTurno = c.turnos.find(t => new Date(t.fecha) >= now && t.estado !== 'CANCELADO');
        const hasCanceled = c.turnos.some(t => t.estado === 'CANCELADO');
        const hasNoShow = c.turnos.some(t => t.estado === 'NO_ASISTIO');

        switch (filter) {
          case 'new':
            return turnosRealizados.length <= 1; // 0 or 1 session
          case 'recurrent':
            return turnosRealizados.length > 1; // more than 1 session
          case 'upcoming':
            return !!proximoTurno;
          case 'no_upcoming':
            return !proximoTurno;
          case 'canceled':
            return hasCanceled;
          case 'no_show':
            return hasNoShow;
          default:
            return true;
        }
      });
    }

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Create manually
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombreCompleto, whatsapp, email, dni, canalAdquisicion, observaciones, notasGonzalo, frecuencia } = body;

    if (!nombreCompleto || !whatsapp || !email) {
      return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 });
    }

    // 1. DNI Uniqueness check (only if non-empty)
    if (dni) {
      const existingDni = await prisma.cliente.findFirst({
        where: { dni }
      });
      if (existingDni) {
        return NextResponse.json({ error: 'Ya existe un cliente registrado con el DNI ingresado.' }, { status: 400 });
      }
    }

    // 2. Email Uniqueness check
    if (email) {
      const existingEmail = await prisma.cliente.findFirst({
        where: { email }
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'Ya existe un cliente registrado con el Email ingresado.' }, { status: 400 });
      }
    }

    // 3. WhatsApp Uniqueness check
    if (whatsapp) {
      const existingWhatsapp = await prisma.cliente.findFirst({
        where: { whatsapp }
      });
      if (existingWhatsapp) {
        return NextResponse.json({ error: 'Ya existe un cliente registrado con el número de WhatsApp ingresado.' }, { status: 400 });
      }
    }

    const client = await prisma.cliente.create({
      data: {
        nombreCompleto,
        whatsapp,
        email,
        dni: dni || null,
        canalAdquisicion: canalAdquisicion || 'ORGANICO',
        estado: 'ACTIVO',
        observaciones,
        notasGonzalo,
        frecuencia: frecuencia ? Number(frecuencia) : 4
      }
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
