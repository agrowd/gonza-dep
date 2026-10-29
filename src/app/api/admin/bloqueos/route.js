import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = sessionCookie ? verifySessionToken(sessionCookie.value) : null;
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Los operadores únicamente deben ver sus turnos agendados, no los bloqueos de agenda
    if (session.rol === 'OPERADOR') {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const ano = searchParams.get('ano'); // YYYY (para Configuración > Parámetros)
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD
    const start = searchParams.get('start'); // YYYY-MM-DD
    const end = searchParams.get('end'); // YYYY-MM-DD

    // 1. Caso Consulta por Año Completo (para el listado de feriados anuales en Parámetros)
    if (ano) {
      const yearNum = parseInt(ano, 10);
      const startOfYear = new Date(`${yearNum}-01-01T00:00:00`);
      const endOfYear = new Date(`${yearNum}-12-31T23:59:59`);

      const allBloqueos = await prisma.bloqueo.findMany({
        where: {
          OR: [
            { tipo: 'FIJO' },
            { ano: yearNum },
            { fecha: { gte: startOfYear, lte: endOfYear } },
            { fechaMovida: { gte: startOfYear, lte: endOfYear } }
          ]
        },
        orderBy: [
          { fecha: 'asc' },
          { horaInicio: 'asc' }
        ]
      });

      // Normalizar campos para compatibilidad
      const normalized = allBloqueos.map(b => ({
        ...b,
        tipo: b.tipo || 'UNICO',
        color: b.color || (b.tipo === 'FIJO' ? '#dc2626' : (b.tipo === 'MOVIL' ? '#d97706' : '#2563eb'))
      }));

      return NextResponse.json(normalized);
    }

    // 2. Caso Consulta de Rango para la Agenda (fecha única o rango semanal/mensual)
    let startDate = null;
    let endDate = null;

    if (fecha) {
      startDate = new Date(fecha + 'T00:00:00');
      endDate = new Date(fecha + 'T23:59:59');
    } else if (start && end) {
      startDate = new Date(start + 'T00:00:00');
      endDate = new Date(end + 'T23:59:59');
    }

    if (!startDate || !endDate) {
      const allBloqueos = await prisma.bloqueo.findMany({
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
      });
      return NextResponse.json(allBloqueos);
    }

    // Consultar bloqueos que caigan directamente en el rango por fecha o por fechaMovida
    const directBloqueos = await prisma.bloqueo.findMany({
      where: {
        OR: [
          { fecha: { gte: startDate, lte: endDate } },
          { fechaMovida: { gte: startDate, lte: endDate } }
        ]
      },
      orderBy: [
        { fecha: 'asc' },
        { horaInicio: 'asc' }
      ]
    });

    // Consultar todos los feriados FIJOS que se replican automáticamente año tras año
    const fijos = await prisma.bloqueo.findMany({
      where: { tipo: 'FIJO' }
    });

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const resultMap = new Map();

    // Procesar bloqueos directos
    for (const b of directBloqueos) {
      const item = {
        ...b,
        tipo: b.tipo || 'UNICO',
        color: b.color || (b.tipo === 'FIJO' ? '#dc2626' : (b.tipo === 'MOVIL' ? '#d97706' : '#2563eb'))
      };

      // Si es un feriado móvil con fecha reubicada (fechaMovida)
      if (item.tipo === 'MOVIL' && item.fechaMovida) {
        const movedTime = new Date(item.fechaMovida).getTime();
        // Si la fechaMovida está en el rango solicitado, asignarla como fecha efectiva
        if (movedTime >= startDate.getTime() && movedTime <= endDate.getTime()) {
          item.fecha = item.fechaMovida;
          resultMap.set(`${item.id}-moved`, item);
        }
        // Si no está en el rango, no debe bloquear la fecha original porque fue movido!
        continue;
      }

      resultMap.set(item.id, item);
    }

    // Sintetizar réplicas de feriados FIJOS para los años del rango
    for (const f of fijos) {
      let m = f.mes;
      let d = f.dia;
      if (!m || !d) {
        const origDate = new Date(f.fecha);
        m = origDate.getMonth() + 1;
        d = origDate.getDate();
      }

      for (let y = startYear; y <= endYear; y++) {
        const synthDate = new Date(y, m - 1, d, 0, 0, 0);
        if (synthDate.getTime() >= startDate.getTime() && synthDate.getTime() <= endDate.getTime()) {
          const key = `fijo-${f.id}-${y}-${m}-${d}`;
          if (!resultMap.has(f.id) && !resultMap.has(key)) {
            resultMap.set(key, {
              ...f,
              id: `${f.id}-${y}`,
              originalId: f.id,
              fecha: synthDate,
              tipo: 'FIJO',
              color: f.color || '#dc2626',
              isSynthesized: true
            });
          }
        }
      }
    }

    const finalBloqueos = Array.from(resultMap.values()).sort((a, b) => {
      const tA = new Date(a.fecha).getTime();
      const tB = new Date(b.fecha).getTime();
      if (tA !== tB) return tA - tB;
      return (a.horaInicio || '').localeCompare(b.horaInicio || '');
    });

    return NextResponse.json(finalBloqueos);
  } catch (error) {
    console.error('Error fetching bloqueos:', error);
    return NextResponse.json({ error: 'Error interno al consultar bloqueos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = sessionCookie ? verifySessionToken(sessionCookie.value) : null;
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Los operadores no pueden crear bloqueos de agenda
    if (session.rol === 'OPERADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      fechaStr, 
      horaInicio, 
      horaFin, 
      motivo, 
      esDiaCompleto, 
      tipo = 'UNICO', 
      color, 
      fechaMovidaStr 
    } = body;

    if (!fechaStr) {
      return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400 });
    }

    const [yearStr, monthStr, dayStr] = fechaStr.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const dayNum = parseInt(dayStr, 10);

    const tipoVal = ['FIJO', 'MOVIL', 'UNICO'].includes(tipo) ? tipo : 'UNICO';
    const defaultColor = tipoVal === 'FIJO' ? '#dc2626' : (tipoVal === 'MOVIL' ? '#d97706' : '#2563eb');
    const finalColor = color || defaultColor;

    let finalStart = horaInicio || '10:00';
    let finalEnd = horaFin || '20:00';

    if (esDiaCompleto) {
      const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
      const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
      finalStart = startConfig?.value || '08:00';
      finalEnd = endConfig?.value || '22:00';
    }

    const nuevoBloqueo = await prisma.bloqueo.create({
      data: {
        fecha: new Date(fechaStr + 'T00:00:00'),
        horaInicio: finalStart,
        horaFin: finalEnd,
        motivo: motivo || (tipoVal === 'FIJO' ? 'Feriado Fijo Anual' : (tipoVal === 'MOVIL' ? 'Feriado Móvil' : 'Bloqueo administrativo')),
        esDiaCompleto: !!esDiaCompleto,
        tipo: tipoVal,
        color: finalColor,
        mes: monthNum,
        dia: dayNum,
        ano: tipoVal === 'FIJO' ? null : yearNum,
        fechaMovida: fechaMovidaStr ? new Date(fechaMovidaStr + 'T00:00:00') : null
      }
    });

    return NextResponse.json(nuevoBloqueo, { status: 201 });
  } catch (error) {
    console.error('Error creating bloqueo:', error);
    return NextResponse.json({ error: 'Error interno al crear bloqueo' }, { status: 500 });
  }
}
