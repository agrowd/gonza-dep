import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { cleanupExpiredPendingPayments } from '@/lib/cleanup.js';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

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
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const year = parseInt(searchParams.get('year') || currentYear, 10);
    const month = parseInt(searchParams.get('month') || currentMonth, 10); // 1-12
    const duracion = parseInt(searchParams.get('duracion') || 30, 10);
    const horaDesde = searchParams.get('horaDesde') || '14:00';
    const horaHasta = searchParams.get('horaHasta') || '22:00';
    const intervalo = parseInt(searchParams.get('intervalo') || searchParams.get('step') || '30', 10);
    const diasSemanaParam = searchParams.get('diasSemana'); // e.g. "1,2,3,4,5"
    const excludeTurnoId = searchParams.get('excludeTurnoId') || searchParams.get('turnoId');

    // Parse allowed days of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
    let allowedDays = [1, 2, 3, 4, 5, 6]; // default Lun-Sab
    if (diasSemanaParam) {
      allowedDays = diasSemanaParam.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
    }

    // Month boundary dates
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // First day of next month

    // Fetch config for operating hours
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    const globalWorkStart = startConfig?.value || '10:00';
    const globalWorkEnd = endConfig?.value || '20:00';

    // Fetch all active appointments for the month (REPROGRAMADO appointments are active and occupy slots; exclude current turno if rescheduling)
    const whereClause = {
      fecha: {
        gte: startDate,
        lt: endDate
      },
      estado: {
        notIn: ['CANCELADO', 'NO_ASISTIO']
      }
    };
    if (excludeTurnoId) {
      whereClause.id = { not: String(excludeTurnoId) };
    }

    const turnos = await prisma.turno.findMany({
      where: whereClause,
      select: {
        fecha: true,
        horaInicio: true,
        horaFin: true,
        estado: true
      }
    });

    // Group busy intervals by date string "YYYY-MM-DD"
    const busyByDate = {};
    for (const t of turnos) {
      const dateStr = t.fecha.toISOString().split('T')[0];
      if (!busyByDate[dateStr]) {
        busyByDate[dateStr] = [];
      }
      busyByDate[dateStr].push({
        start: timeToMinutes(t.horaInicio),
        end: timeToMinutes(t.horaFin)
      });
    }

    // Days in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const daysResult = {};

    const workStartMin = timeToMinutes(globalWorkStart);
    const workEndMin = timeToMinutes(globalWorkEnd);

    // Apply user filters for range (defaults to 14:00 - 22:00)
    const filterStartMin = timeToMinutes(horaDesde);
    const filterEndMin = timeToMinutes(horaHasta);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const dayOfWeek = dateObj.getUTCDay(); // 0-6
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const isPast = dateStr < todayStr;
      const isAllowedDay = allowedDays.includes(dayOfWeek);

      if (isPast || !isAllowedDay) {
        daysResult[dateStr] = {
          date: dateStr,
          day,
          dayOfWeek,
          disponible: false,
          motivo: isPast ? 'PASADO' : 'DIA_NO_SELECCIONADO',
          slots: []
        };
        continue;
      }

      // Check if filter range is valid
      if (filterStartMin + duracion > filterEndMin) {
        daysResult[dateStr] = {
          date: dateStr,
          day,
          dayOfWeek,
          disponible: false,
          motivo: 'RANGO_INVALIDO',
          slots: []
        };
        continue;
      }

      const dayBusy = busyByDate[dateStr] || [];

      // 1. Clamp busy intervals to [filterStartMin, filterEndMin]
      const clampedBusy = [];
      for (const b of dayBusy) {
        const bStart = Math.max(filterStartMin, b.start);
        const bEnd = Math.min(filterEndMin, b.end);
        if (bStart < bEnd) {
          clampedBusy.push({ start: bStart, end: bEnd });
        }
      }

      // 2. Sort by start ascending
      clampedBusy.sort((a, b) => a.start - b.start);

      // 3. Merge overlapping/adjacent intervals
      const mergedBusy = [];
      for (const b of clampedBusy) {
        if (mergedBusy.length === 0) {
          mergedBusy.push({ ...b });
        } else {
          const last = mergedBusy[mergedBusy.length - 1];
          if (b.start <= last.end) {
            last.end = Math.max(last.end, b.end);
          } else {
            mergedBusy.push({ ...b });
          }
        }
      }

      // 4. Invert to get free gaps within the window
      const gaps = [];
      let cursor = filterStartMin;

      for (const b of mergedBusy) {
        if (b.start > cursor) {
          gaps.push({ start: cursor, end: b.start });
        }
        cursor = Math.max(cursor, b.end);
      }

      if (cursor < filterEndMin) {
        gaps.push({ start: cursor, end: filterEndMin });
      }

      // 5. Generate slots: either step 10 (granular) or step 30 (default smart slots without dead gaps)
      const slots = [];

      if (intervalo === 10) {
        for (let cur = filterStartMin; cur + duracion <= filterEndMin; cur += 10) {
          const slotStart = cur;
          const slotEnd = cur + duracion;
          const hasOverlap = dayBusy.some(b => slotStart < b.end && slotEnd > b.start);
          if (!hasOverlap) {
            slots.push({
              horaInicio: minutesToTime(slotStart),
              horaFin: minutesToTime(slotEnd)
            });
          }
        }
      } else {
        // Step 30: Smart anchored slots (advancing every 30 min, preventing 10/20-min dead gaps)
        for (const gap of gaps) {
          const gapLen = gap.end - gap.start;
          if (gapLen < duracion) continue;

          const candidateStarts = new Set();

          // Forward: anchored to gap.start, step 30
          for (let s = gap.start; s + duracion <= gap.end; s += 30) {
            const remAfter = gap.end - (s + duracion);
            if (remAfter === 0 || remAfter >= 30) {
              candidateStarts.add(s);
            }
          }

          // Backward: anchored to gap.end, step 30
          for (let e = gap.end; e - duracion >= gap.start; e -= 30) {
            const s = e - duracion;
            const remBefore = s - gap.start;
            if (remBefore === 0 || remBefore >= 30) {
              candidateStarts.add(s);
            }
          }

          // Fallback: if no slot satisfies the clean condition, offer start and end so gap is not lost
          if (candidateStarts.size === 0) {
            candidateStarts.add(gap.start);
            if (gap.end - duracion !== gap.start) {
              candidateStarts.add(gap.end - duracion);
            }
          }

          const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);
          for (const s of sortedStarts) {
            slots.push({
              horaInicio: minutesToTime(s),
              horaFin: minutesToTime(s + duracion)
            });
          }
        }
      }

      const disponible = slots.length > 0;
      const lleno = !disponible && dayBusy.length > 0;

      daysResult[dateStr] = {
        date: dateStr,
        day,
        dayOfWeek,
        disponible,
        lleno,
        motivo: disponible ? 'OK' : (lleno ? 'DIA_LLENO' : 'SIN_HUECO'),
        slots
      };
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      config: {
        work_start: globalWorkStart,
        work_end: globalWorkEnd
      },
      days: daysResult
    });
  } catch (error) {
    console.error('Error in alta-turno disponibilidad API:', error);
    return NextResponse.json({ error: 'Error al calcular disponibilidad' }, { status: 500 });
  }
}
