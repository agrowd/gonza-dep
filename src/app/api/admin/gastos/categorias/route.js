import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

const DEFAULT_CATEGORIAS = [
  { nombre: 'Insumos y Descartables', color: '#0284c7' },
  { nombre: 'Servicios y Alquiler', color: '#8b5cf6' },
  { nombre: 'Mantenimiento y Máquinas', color: '#f59e0b' },
  { nombre: 'Publicidad y Marketing', color: '#10b981' },
  { nombre: 'Sueldos y Honorarios', color: '#ef4444' },
  { nombre: 'Impuestos y Tasas', color: '#ec4899' },
  { nombre: 'Otros Gastos', color: '#64748b' }
];

async function ensureDefaultCategorias() {
  const count = await prisma.categoriaGasto.count();
  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIAS) {
      await prisma.categoriaGasto.create({
        data: cat
      }).catch(() => {});
    }
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await ensureDefaultCategorias();

    const categorias = await prisma.categoriaGasto.findMany({
      include: {
        _count: {
          select: { gastos: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json({
      categorias: categorias.map(c => ({
        id: c.id,
        nombre: c.nombre,
        color: c.color || '#64748b',
        cantidadGastos: c._count.gastos
      }))
    });
  } catch (error) {
    console.error('Error fetching categorias gasto:', error);
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, color } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la categoría es requerido' }, { status: 400 });
    }

    const cleanNombre = nombre.trim();
    const cleanColor = color?.trim() || '#64748b';

    const existing = await prisma.categoriaGasto.findUnique({
      where: { nombre: cleanNombre }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 400 });
    }

    const nueva = await prisma.categoriaGasto.create({
      data: {
        nombre: cleanNombre,
        color: cleanColor
      }
    });

    return NextResponse.json({ categoria: nueva }, { status: 201 });
  } catch (error) {
    console.error('Error creating categoria gasto:', error);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, nombre, color } = body;

    if (!id || !nombre?.trim()) {
      return NextResponse.json({ error: 'ID y nombre son requeridos' }, { status: 400 });
    }

    const cleanNombre = nombre.trim();
    const cleanColor = color?.trim() || '#64748b';

    const existingWithSameName = await prisma.categoriaGasto.findFirst({
      where: {
        nombre: cleanNombre,
        NOT: { id }
      }
    });

    if (existingWithSameName) {
      return NextResponse.json({ error: 'Ya existe otra categoría con ese nombre' }, { status: 400 });
    }

    const updated = await prisma.categoriaGasto.update({
      where: { id },
      data: {
        nombre: cleanNombre,
        color: cleanColor
      }
    });

    return NextResponse.json({ categoria: updated });
  } catch (error) {
    console.error('Error updating categoria gasto:', error);
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de categoría es requerido' }, { status: 400 });
    }

    const count = await prisma.gasto.count({ where: { categoriaId: id } });
    if (count > 0) {
      return NextResponse.json({
        error: `No se puede eliminar la categoría porque tiene ${count} gasto(s) asociados.`
      }, { status: 400 });
    }

    await prisma.categoriaGasto.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting categoria gasto:', error);
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
