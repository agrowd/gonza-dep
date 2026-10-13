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

    const cupones = await prisma.cupon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ cupones });
  } catch (error) {
    console.error('Error in GET /api/admin/cupones:', error);
    return NextResponse.json({ error: 'Error al obtener cupones' }, { status: 500 });
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
    const { codigo, descuentoTipo, descuentoValor, usosPermitidos, fechaVencimiento, activo } = body;

    if (!codigo || !codigo.trim()) {
      return NextResponse.json({ error: 'El código del cupón es requerido' }, { status: 400 });
    }

    const cleanCodigo = codigo.trim().toUpperCase();
    const numericDesc = parseFloat(descuentoValor);
    if (isNaN(numericDesc) || numericDesc <= 0) {
      return NextResponse.json({ error: 'El valor de descuento debe ser mayor a 0' }, { status: 400 });
    }

    const existing = await prisma.cupon.findUnique({
      where: { codigo: cleanCodigo }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un cupón con ese código' }, { status: 400 });
    }

    const nuevo = await prisma.cupon.create({
      data: {
        codigo: cleanCodigo,
        descuentoTipo: descuentoTipo === 'MONTO_FIJO' ? 'MONTO_FIJO' : 'PORCENTAJE',
        descuentoValor: numericDesc,
        usosPermitidos: usosPermitidos ? parseInt(usosPermitidos, 10) : 1,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        activo: activo !== undefined ? Boolean(activo) : true
      }
    });

    return NextResponse.json({ cupon: nuevo }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/cupones:', error);
    return NextResponse.json({ error: 'Error al crear cupón' }, { status: 500 });
  }
}
