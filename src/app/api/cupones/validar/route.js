import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { codigo } = body;

    if (!codigo || !codigo.trim()) {
      return NextResponse.json({ valido: false, error: 'Ingresá un código de cupón' }, { status: 400 });
    }

    const cleanCodigo = codigo.trim().toUpperCase();

    const cupon = await prisma.cupon.findUnique({
      where: { codigo: cleanCodigo }
    });

    if (!cupon) {
      return NextResponse.json({ valido: false, error: 'Cupón inexistente' }, { status: 404 });
    }

    if (!cupon.activo) {
      return NextResponse.json({ valido: false, error: 'Este cupón está desactivado' }, { status: 400 });
    }

    if (cupon.fechaVencimiento && new Date(cupon.fechaVencimiento) < new Date()) {
      return NextResponse.json({ valido: false, error: 'Este cupón ha vencido' }, { status: 400 });
    }

    if (cupon.usosActuales >= cupon.usosPermitidos) {
      return NextResponse.json({ valido: false, error: 'Este cupón ha alcanzado el límite máximo de usos' }, { status: 400 });
    }

    let zonasList = null;
    if (cupon.zonas) {
      try {
        zonasList = typeof cupon.zonas === 'string' ? JSON.parse(cupon.zonas) : cupon.zonas;
      } catch {
        zonasList = null;
      }
    }

    return NextResponse.json({
      valido: true,
      cupon: {
        id: cupon.id,
        codigo: cupon.codigo,
        descuentoTipo: cupon.descuentoTipo,
        descuentoValor: cupon.descuentoValor,
        zonas: zonasList
      }
    });
  } catch (error) {
    console.error('Error validating cupon:', error);
    return NextResponse.json({ valido: false, error: 'Error al validar cupón' }, { status: 500 });
  }
}
