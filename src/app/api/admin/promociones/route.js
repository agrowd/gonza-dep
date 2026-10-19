import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const promociones = await prisma.promocion.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ promociones });
  } catch (error) {
    console.error('Error in GET /api/admin/promociones:', error);
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 });
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
    const { nombre, zonas, descuentoTipo, descuentoValor, fechaInicio, fechaFin, activo } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la promoción es requerido' }, { status: 400 });
    }

    const numericDesc = parseFloat(descuentoValor);
    if (isNaN(numericDesc) || numericDesc <= 0) {
      return NextResponse.json({ error: 'El valor de descuento debe ser mayor a 0' }, { status: 400 });
    }

    const zonasJson = typeof zonas === 'string' ? zonas : JSON.stringify(zonas || []);

    const nueva = await prisma.promocion.create({
      data: {
        nombre: nombre.trim(),
        zonas: zonasJson,
        descuentoTipo: descuentoTipo === 'MONTO_FIJO' ? 'MONTO_FIJO' : 'PORCENTAJE',
        descuentoValor: numericDesc,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        activo: activo !== undefined ? Boolean(activo) : true
      }
    });

    return NextResponse.json({ promocion: nueva }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/promociones:', error);
    return NextResponse.json({ error: 'Error al crear la promoción' }, { status: 500 });
  }
}
