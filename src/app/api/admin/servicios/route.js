import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

// Helper para asegurar la existencia del servicio base "Depilación Láser" y vincular zonas huérfanas
export async function ensureDefaultService() {
  try {
    let baseService = await prisma.servicio.findFirst({
      where: {
        OR: [
          { nombre: 'Depilación Láser' },
          { nombre: 'Depilación Laser' },
          { nombre: 'Depilacion Laser' }
        ]
      }
    });

    if (!baseService) {
      baseService = await prisma.servicio.create({
        data: {
          nombre: 'Depilación Láser',
          icono: '⚡',
          orden: 0,
          descripcion: 'Zonas y tratamientos corporales y faciales con tecnología láser de diodo',
          activo: true
        }
      });
    }

    // Vincular todas las zonas que no tengan servicioId asignado
    await prisma.zona.updateMany({
      where: {
        servicioId: null
      },
      data: {
        servicioId: baseService.id
      }
    });

    return baseService;
  } catch (error) {
    console.error('Error in ensureDefaultService:', error);
    return null;
  }
}

// GET: Lista todos los servicios con sus zonas asociadas
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = sessionCookie ? verifySessionToken(sessionCookie.value) : null;
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await ensureDefaultService();

    const servicios = await prisma.servicio.findMany({
      include: {
        zonas: {
          orderBy: { nombre: 'asc' }
        }
      },
      orderBy: [
        { orden: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error('Error fetching servicios:', error);
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
}

// POST: Crear un nuevo servicio (ej. "Masajes", "Faciales")
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = sessionCookie ? verifySessionToken(sessionCookie.value) : null;
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Solo administradores pueden crear servicios.' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, icono, orden } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del servicio es obligatorio' }, { status: 400 });
    }

    const trimmedNombre = nombre.trim();

    const existing = await prisma.servicio.findUnique({
      where: { nombre: trimmedNombre }
    });

    if (existing) {
      return NextResponse.json({ error: `Ya existe un servicio llamado "${trimmedNombre}"` }, { status: 400 });
    }

    const newService = await prisma.servicio.create({
      data: {
        nombre: trimmedNombre,
        descripcion: descripcion ? descripcion.trim() : null,
        icono: icono ? icono.trim() : '✨',
        orden: orden !== undefined ? Number(orden) : 10,
        activo: true
      },
      include: {
        zonas: true
      }
    });

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error('Error creating servicio:', error);
    return NextResponse.json({ error: 'Error interno al crear servicio' }, { status: 500 });
  }
}
