import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { cleanupExpiredPendingPayments } from '@/lib/cleanup.js';

// Convert HH:MM string to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// Convert minutes from midnight to HH:MM string
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export async function GET(request) {
  try {
    await cleanupExpiredPendingPayments();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    // Use Argentina timezone offset (UTC-3)
    const offsetBA = -3;
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowLocal = new Date(utcNow + (3600000 * offsetBA));
    const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

    const fechaStr = searchParams.get('fecha'); // e.g. "2026-06-20"
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const duracion = parseInt(searchParams.get('duracion') || '30', 10);
    const montoTotal = parseFloat(searchParams.get('montoTotal') || '0');
    const excludeTurnoId = searchParams.get('excludeTurnoId') || searchParams.get('turnoId');
    const intervalo = parseInt(searchParams.get('intervalo') || searchParams.get('step') || '30', 10);

    // Fetch operating hours configuration
    const bookingStartConfig = await prisma.configuracion.findUnique({ where: { key: 'booking_work_start' } });
    const bookingEndConfig = await prisma.configuracion.findUnique({ where: { key: 'booking_work_end' } });
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });

    const workStartStr = bookingStartConfig?.value || startConfig?.value || '14:00';
    const workEndStr = bookingEndConfig?.value || endConfig?.value || '22:00';

    const WORK_START = timeToMinutes(workStartStr);
    const WORK_END = timeToMinutes(workEndStr);

    // Helper: calculate slots for a specific day
    const calculateDaySlots = (dayDateStr, dayBusy, hasExistingTurnos) => {
      // 0. Weekend check: Online bookings are never allowed on Saturdays (6) or Sundays (0)
      const dayOfWeek = new Date(dayDateStr + 'T12:00:00Z').getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { disponible: false, lleno: false, motivo: 'FIN_DE_SEMANA', slots: [] };
      }

      // 1. If day has full day block
      if (dayBusy.some(b => b.esDiaCompleto)) {
        return { disponible: false, lleno: true, motivo: 'BLOQUEADO', slots: [] };
      }

      // 2. Open vs Closed Day logic:
      // In Autogestión: ONLY show days with existing appointments unless montoTotal >= 65.000
      if (!hasExistingTurnos) {
        if (montoTotal < 65000) {
          return {
            disponible: false,
            lleno: false,
            motivo: 'DIA_CERRADO',
            slots: []
          };
        }
      }

      const slots = [];
      const addedSlotKeys = new Set();

      const isSlotValid = (sStart, sEnd) => {
        if (sStart < WORK_START || sEnd > WORK_END) return false;
        // Check overlap with busy intervals
        const overlaps = dayBusy.some(b => sStart < b.end && sEnd > b.start);
        return !overlaps;
      };

      const slotStep = intervalo > 0 ? intervalo : 30;

      // 3. Proximity calculation
      if (hasExistingTurnos) {
        // Range: 2 x duracion before and after each existing appointment
        const proximityWindow = 2 * duracion;

        // Separate appointments from blocks for proximity anchoring
        const turnosOnly = dayBusy.filter(b => !b.isBloqueo);
        const anchorTurnos = turnosOnly.length > 0 ? turnosOnly : dayBusy;

        for (const t of anchorTurnos) {
          // A. Backward from t.start: sEnd goes up to t.start, sStart >= t.start - proximityWindow
          for (let sStart = t.start - duracion; sStart >= t.start - proximityWindow; sStart -= slotStep) {
            const sEnd = sStart + duracion;
            if (sEnd <= t.start && isSlotValid(sStart, sEnd)) {
              const key = `${sStart}-${sEnd}`;
              if (!addedSlotKeys.has(key)) {
                addedSlotKeys.add(key);
                slots.push({ horaInicio: minutesToTime(sStart), horaFin: minutesToTime(sEnd), startMin: sStart });
              }
            }
          }

          // B. Forward from t.end: sStart starts at t.end, sStart <= t.end + proximityWindow
          for (let sStart = t.end; sStart <= t.end + proximityWindow; sStart += slotStep) {
            const sEnd = sStart + duracion;
            if (isSlotValid(sStart, sEnd)) {
              const key = `${sStart}-${sEnd}`;
              if (!addedSlotKeys.has(key)) {
                addedSlotKeys.add(key);
                slots.push({ horaInicio: minutesToTime(sStart), horaFin: minutesToTime(sEnd), startMin: sStart });
              }
            }
          }
        }
      } else {
        // Day has NO existing turnos (opened via monto >= 65.000 rule)
        for (let sStart = WORK_START; sStart + duracion <= WORK_END; sStart += slotStep) {
          const sEnd = sStart + duracion;
          if (isSlotValid(sStart, sEnd)) {
            const key = `${sStart}-${sEnd}`;
            if (!addedSlotKeys.has(key)) {
              addedSlotKeys.add(key);
              slots.push({ horaInicio: minutesToTime(sStart), horaFin: minutesToTime(sEnd), startMin: sStart });
            }
          }
        }
      }

      // Sort slots chronologically
      slots.sort((a, b) => a.startMin - b.startMin);
      const cleanSlots = slots.map(({ horaInicio, horaFin }) => ({ horaInicio, horaFin }));

      const disponible = cleanSlots.length > 0;
      const lleno = !disponible && hasExistingTurnos;

      return {
        disponible,
        lleno,
        motivo: disponible ? 'OK' : (lleno ? 'DIA_LLENO' : (hasExistingTurnos ? 'SIN_HUECO' : 'DIA_CERRADO')),
        slots: cleanSlots
      };
    };

    // ==========================================
    // CASE 1: Single Date query (legacy/direct)
    // ==========================================
    if (fechaStr && !yearParam) {
      const targetDate = new Date(fechaStr + 'T00:00:00');
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const turnosWhere = {
        fecha: { gte: targetDate, lt: nextDate },
        estado: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
        NOT: { estado: 'PENDIENTE_PAGO', createdAt: { lt: fiveMinutesAgo } }
      };
      if (excludeTurnoId) {
        turnosWhere.id = { not: excludeTurnoId };
      }

      const turnos = await prisma.turno.findMany({
        where: turnosWhere,
        select: { id: true, horaInicio: true, horaFin: true }
      });

      const bloqueos = await prisma.bloqueo.findMany({
        where: { fecha: { gte: targetDate, lt: nextDate } }
      });

      const dayBusy = [
        ...turnos.map(t => ({ start: timeToMinutes(t.horaInicio), end: timeToMinutes(t.horaFin), isBloqueo: false, esDiaCompleto: false })),
        ...bloqueos.map(b => ({
          start: b.esDiaCompleto ? 0 : timeToMinutes(b.horaInicio),
          end: b.esDiaCompleto ? 1440 : timeToMinutes(b.horaFin),
          isBloqueo: true,
          esDiaCompleto: b.esDiaCompleto
        }))
      ];

      const result = calculateDaySlots(fechaStr, dayBusy, turnos.length > 0);
      return NextResponse.json(result);
    }

    // ==========================================
    // CASE 2: Monthly Calendar query
    // ==========================================
    const year = parseInt(yearParam || nowLocal.getFullYear(), 10);
    const month = parseInt(monthParam || (nowLocal.getMonth() + 1), 10); // 1-12

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const turnosWhere = {
      fecha: { gte: startDate, lt: endDate },
      estado: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
      NOT: { estado: 'PENDIENTE_PAGO', createdAt: { lt: fiveMinutesAgo } }
    };
    if (excludeTurnoId) {
      turnosWhere.id = { not: excludeTurnoId };
    }

    const turnos = await prisma.turno.findMany({
      where: turnosWhere,
      select: { id: true, fecha: true, horaInicio: true, horaFin: true }
    });

    const bloqueos = await prisma.bloqueo.findMany({
      where: { fecha: { gte: startDate, lt: endDate } }
    });

    // Group by Date string
    const turnosByDate = {};
    for (const t of turnos) {
      const dStr = t.fecha.toISOString().split('T')[0];
      if (!turnosByDate[dStr]) turnosByDate[dStr] = [];
      turnosByDate[dStr].push({ start: timeToMinutes(t.horaInicio), end: timeToMinutes(t.horaFin), isBloqueo: false });
    }

    const bloqueosByDate = {};
    for (const b of bloqueos) {
      const dStr = b.fecha.toISOString().split('T')[0];
      if (!bloqueosByDate[dStr]) bloqueosByDate[dStr] = [];
      bloqueosByDate[dStr].push({
        start: b.esDiaCompleto ? 0 : timeToMinutes(b.horaInicio),
        end: b.esDiaCompleto ? 1440 : timeToMinutes(b.horaFin),
        isBloqueo: true,
        esDiaCompleto: b.esDiaCompleto
      });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysResult = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon ...
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Domingo cerrado
      if (dayOfWeek === 0) {
        daysResult[dateStr] = {
          date: dateStr,
          day,
          dayOfWeek,
          disponible: false,
          lleno: false,
          motivo: 'DOMINGO',
          slots: []
        };
        continue;
      }

      // Días pasados
      if (dateStr <= todayStr) {
        daysResult[dateStr] = {
          date: dateStr,
          day,
          dayOfWeek,
          disponible: false,
          lleno: false,
          motivo: 'PASADO',
          slots: []
        };
        continue;
      }

      const dayTurnos = turnosByDate[dateStr] || [];
      const dayBloqueos = bloqueosByDate[dateStr] || [];
      const dayBusy = [...dayTurnos, ...dayBloqueos];

      const dayCalculation = calculateDaySlots(dateStr, dayBusy, dayTurnos.length > 0);

      daysResult[dateStr] = {
        date: dateStr,
        day,
        dayOfWeek,
        turnosCount: dayTurnos.length,
        ...dayCalculation
      };
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      montoTotal,
      duracion,
      config: {
        work_start: workStartStr,
        work_end: workEndStr
      },
      days: daysResult
    });

  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json({ error: 'Error al consultar disponibilidad' }, { status: 500 });
  }
}
