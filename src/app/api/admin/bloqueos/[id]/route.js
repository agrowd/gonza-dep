import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

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
      horaInicio, 
      horaFin, 
      motivo, 
      esDiaCompleto, 
      tipo, 
      color, 
      fechaStr, 
      fechaMovidaStr, 
      originalId 
    } = body;

    const targetId = originalId || id;

    const data = {};
    if (horaInicio !== undefined) data.horaInicio = horaInicio;
    if (horaFin !== undefined) data.horaFin = horaFin;
    if (motivo !== undefined) data.motivo = motivo;
    if (esDiaCompleto !== undefined) data.esDiaCompleto = !!esDiaCompleto;
    if (tipo !== undefined) data.tipo = tipo;
    if (color !== undefined) data.color = color;

    if (fechaStr) {
      const [yearStr, monthStr, dayStr] = fechaStr.split('-');
      data.fecha = new Date(fechaStr + 'T00:00:00');
      data.mes = parseInt(monthStr, 10);
      data.dia = parseInt(dayStr, 10);
      if (tipo === 'FIJO') {
        data.ano = null;
      } else {
        data.ano = parseInt(yearStr, 10);
      }
    }

    if (fechaMovidaStr !== undefined) {
      data.fechaMovida = fechaMovidaStr ? new Date(fechaMovidaStr + 'T00:00:00') : null;
    }

    const updated = await prisma.bloqueo.update({
      where: { id: targetId },
      data
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating bloqueo:', error);
    return NextResponse.json({ error: 'Error al actualizar bloqueo' }, { status: 500 });
  }
}

export const PATCH = PUT;


export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Si viene un ID sintetizado como 'uuid-2026', extraer el UUID original
    let targetId = id;
    if (id.includes('-') && id.split('-').length > 5) {
      const parts = id.split('-');
      // Si la última parte es un año de 4 dígitos, el targetId son las 5 primeras partes
      if (parts[parts.length - 1].length === 4 && !isNaN(parts[parts.length - 1])) {
        targetId = parts.slice(0, 5).join('-');
      }
    }

    await prisma.bloqueo.delete({
      where: { id: targetId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bloqueo:', error);
    return NextResponse.json({ error: 'Error al eliminar bloqueo' }, { status: 500 });
  }
}
