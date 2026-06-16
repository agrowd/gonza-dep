import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';

// Convert HH:MM string to minutes from midnight
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes from midnight to HH:MM string
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaStr = searchParams.get('fecha'); // e.g., "2026-06-20"
    const duracion = Number(searchParams.get('duracion') || 30); // in minutes

    if (!fechaStr) {
      return NextResponse.json({ error: 'Fecha es requerida' }, { status: 400 });
    }

    // 1. Parse date range for the selected day (midnight to 23:59:59)
    const targetDate = new Date(fechaStr + 'T00:00:00');
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    // 2. Query all existing active/confirmed/pending turns for that day
    const turns = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: targetDate,
          lt: nextDate
        },
        estado: {
          notIn: ['CANCELADO', 'REPROGRAMADO', 'NO_ASISTIO'] // skip cancelled slots
        }
      },
      select: {
        horaInicio: true,
        horaFin: true
      }
    });

    // Map existing turns to interval minutes
    const busyIntervals = turns.map(t => ({
      start: timeToMinutes(t.horaInicio),
      end: timeToMinutes(t.horaFin)
    }));

    // 3. Define work hours from database configuration
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    
    const workStartStr = startConfig?.value || '10:00';
    const workEndStr = endConfig?.value || '20:00';

    const WORK_START = timeToMinutes(workStartStr);
    const WORK_END = timeToMinutes(workEndStr);
    const SLOT_STEP = 10; // 10-minute slots

    const availableSlots = [];

    // 4. Generate candidate slots every 10 minutes
    for (let current = WORK_START; current + duracion <= WORK_END; current += SLOT_STEP) {
      const candidateStart = current;
      const candidateEnd = current + duracion;

      // Check overlap with any busy interval
      const hasOverlap = busyIntervals.some(busy => {
        return candidateStart < busy.end && candidateEnd > busy.start;
      });

      if (!hasOverlap) {
        availableSlots.push({
          horaInicio: minutesToTime(candidateStart),
          horaFin: minutesToTime(candidateEnd)
        });
      }
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
