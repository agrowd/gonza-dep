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
      fechaHastaStr,
      horaInicio, 
      horaFin, 
      motivo, 
      esDiaCompleto, 
      tipo = 'UNICO', 
      color, 
      fechaMovidaStr,
      boxId,
      forzar = false
    } = body;

    if (!fechaStr) {
      return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400 });
    }

    // Determine target dates list (single date or continuous range)
    const dates = [];
    if (fechaHastaStr && fechaHastaStr > fechaStr) {
      let curr = new Date(fechaStr + 'T00:00:00');
      const end = new Date(fechaHastaStr + 'T00:00:00');
      while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      dates.push(fechaStr);
    }

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

    // Advertencia previa: Si no se fuerza, verificar si existen turnos agendados en todo el rango
    if (!forzar) {
      const targetDateStart = new Date(fechaStr + 'T00:00:00');
      const targetDateEnd = new Date((fechaHastaStr && fechaHastaStr > fechaStr ? fechaHastaStr : fechaStr) + 'T23:59:59');

      const existingTurnos = await prisma.turno.findMany({
        where: {
          fecha: { gte: targetDateStart, lte: targetDateEnd },
          estado: { notIn: ['CANCELADO', 'BLOQUEADO'] },
          ...(boxId ? { boxId } : {})
        },
        include: { cliente: true }
      });

      let conflicting = existingTurnos;
      if (!esDiaCompleto && horaInicio && horaFin) {
        const toMin = (h) => {
          const [hh, mm] = (h || '00:00').split(':').map(Number);
          return hh * 60 + (mm || 0);
        };
        const bStart = toMin(horaInicio);
        const bEnd = toMin(horaFin);
        conflicting = existingTurnos.filter(t => {
          const tStart = toMin(t.horaInicio);
          const tEnd = toMin(t.horaFin);
          return tStart < bEnd && tEnd > bStart;
        });
      }

      if (conflicting.length > 0) {
        const isRange = dates.length > 1;
        return NextResponse.json({
          warning: true,
          conflictingCount: conflicting.length,
          turnos: conflicting.slice(0, 5).map(t => ({
            id: t.id,
            cliente: t.cliente?.nombreCompleto || 'Cliente',
            horario: `${t.fecha?.toISOString().split('T')[0]} ${t.horaInicio} - ${t.horaFin}`
          })),
          message: isRange
            ? `Existen ${conflicting.length} turno(s) agendado(s) en el rango de fechas seleccionado (${dates[0]} al ${dates[dates.length - 1]}). ¿Deseas aplicar el bloqueo de todas formas sobre esos días?`
            : `Existen ${conflicting.length} turno(s) agendado(s) en la fecha y horario seleccionados. ¿Deseas aplicar el bloqueo de todas formas sobre ese día con turnos?`
        }, { status: 409 });
      }
    }

    const createdBloqueos = [];
    for (const dStr of dates) {
      const [yearStr, monthStr, dayStr] = dStr.split('-');
      const yearNum = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const dayNum = parseInt(dayStr, 10);

      const nb = await prisma.bloqueo.create({
        data: {
          fecha: new Date(dStr + 'T00:00:00'),
          horaInicio: finalStart,
          horaFin: finalEnd,
          motivo: motivo || (tipoVal === 'FIJO' ? 'Feriado Fijo Anual' : (tipoVal === 'MOVIL' ? 'Feriado Móvil' : 'Bloqueo administrativo')),
          esDiaCompleto: !!esDiaCompleto,
          tipo: tipoVal,
          color: finalColor,
          mes: monthNum,
          dia: dayNum,
          ano: tipoVal === 'FIJO' ? null : yearNum,
          fechaMovida: (dates.length === 1 && fechaMovidaStr) ? new Date(fechaMovidaStr + 'T00:00:00') : null,
          boxId: boxId ? String(boxId) : null
        }
      });
      createdBloqueos.push(nb);
    }

    return NextResponse.json(createdBloqueos.length === 1 ? createdBloqueos[0] : { success: true, count: createdBloqueos.length, bloqueos: createdBloqueos }, { status: 201 });
  } catch (error) {
    console.error('Error creating bloqueo:', error);
    return NextResponse.json({ error: 'Error interno al crear bloqueo' }, { status: 500 });
  }
}
