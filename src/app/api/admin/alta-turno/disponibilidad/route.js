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
    const horaDesde = searchParams.get('horaDesde') || '';
    const horaHasta = searchParams.get('horaHasta') || '';
    const diasSemanaParam = searchParams.get('diasSemana'); // e.g. "1,2,3,4,5"

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

    // Fetch all active appointments for the month
    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startDate,
          lt: endDate
        },
        estado: {
          notIn: ['CANCELADO', 'REPROGRAMADO', 'NO_ASISTIO']
        }
      },
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

    // Apply user filters for range; fallback to global configured work hours only if not specified
    const filterStartMin = horaDesde ? timeToMinutes(horaDesde) : workStartMin;
    const filterEndMin = horaHasta ? timeToMinutes(horaHasta) : workEndMin;

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
      const slots = [];
      const STEP = 10; // 10-minute intervals

      for (let cur = filterStartMin; cur + duracion <= filterEndMin; cur += STEP) {
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
