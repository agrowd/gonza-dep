import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function mergeIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

// Helper to calculate growth %
function calcGrowth(current, previous) {
  if (!previous || previous <= 0) return null;
  const growth = ((current - previous) / previous) * 100;
  const rounded = Math.round(growth * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1).replace('.', ',')}%` : `${rounded.toFixed(1).replace('.', ',')}%`;
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session || session.rol === 'OPERADOR') {
      return NextResponse.json({ error: 'Acceso denegado a métricas financieras' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes'); // Format "YYYY-MM", e.g. "2026-10"

    // Default to current month in Argentina timezone (UTC-3)
    const nowBA = new Date(Date.now() - 3 * 3600 * 1000);
    const defaultYear = nowBA.getUTCFullYear();
    const defaultMonth = String(nowBA.getUTCMonth() + 1).padStart(2, '0');
    const selectedMonthStr = (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) ? mesParam : `${defaultYear}-${defaultMonth}`;

    const [selYear, selMonth] = selectedMonthStr.split('-').map(Number);

    // Build list of last 13 months up to selected month (inclusive)
    const months13 = [];
    for (let i = 12; i >= 0; i--) {
      let targetM = selMonth - i;
      let targetY = selYear;
      while (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      const monthKey = `${targetY}-${String(targetM).padStart(2, '0')}`;
      months13.push({
        year: targetY,
        month: targetM,
        key: monthKey,
        label: `${MONTH_SHORT_ES[targetM - 1]} ${String(targetY).slice(-2)}`,
        fullLabel: `${MONTH_NAMES_ES[targetM - 1]} ${targetY}`
      });
    }

    // Range for all 13 months query in DB (D-162: resilient UTC window)
    const oldestMonth = months13[0];
    const newestMonth = months13[months13.length - 1];

    const rangeStart = new Date(`${oldestMonth.year}-${String(oldestMonth.month).padStart(2, '0')}-01T00:00:00.000Z`);
    const lastDayNewest = new Date(newestMonth.year, newestMonth.month, 0).getDate();
    const rangeEnd = new Date(`${newestMonth.year}-${String(newestMonth.month).padStart(2, '0')}-${String(lastDayNewest).padStart(2, '0')}T23:59:59.999Z`);

    // Fetch all turnos and gastos in this 13-month window
    const [allTurnos13, allGastos13, allBloqueos13, allClientes] = await Promise.all([
      prisma.turno.findMany({
        where: {
          fecha: {
            gte: rangeStart,
            lte: rangeEnd
          }
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombreCompleto: true,
              fechaAlta: true,
              fechaPrimerTurno: true
            }
          }
        }
      }),
      prisma.gasto.findMany({
        where: {
          fecha: {
            gte: rangeStart,
            lte: rangeEnd
          }
        }
      }),
      prisma.bloqueo.findMany({
        where: {
          fecha: {
            gte: rangeStart,
            lte: rangeEnd
          }
        }
      }),
      prisma.cliente.findMany({
        select: {
          id: true,
          fechaAlta: true,
          fechaPrimerTurno: true
        }
      })
    ]);

    // Map each client's first appointment date across history to accurately detect "Clientes Nuevos"
    const clientFirstTurnoMap = new Map();
    for (const t of allTurnos13) {
      if (!t.clienteId) continue;
      const tDate = new Date(t.fecha).getTime();
      const existing = clientFirstTurnoMap.get(t.clienteId);
      if (!existing || tDate < existing) {
        clientFirstTurnoMap.set(t.clienteId, tDate);
      }
    }

    // Process each month in the 13-month window
    const monthlyStats = months13.map(mInfo => {
      const lastDay = new Date(mInfo.year, mInfo.month, 0).getDate();

      const turnosMes = allTurnos13.filter(t => {
        const dStr = typeof t.fecha === 'string' ? t.fecha.slice(0, 10) : t.fecha.toISOString().slice(0, 10);
        return dStr.startsWith(mInfo.key);
      });

      const gastosMes = allGastos13.filter(g => {
        const dStr = typeof g.fecha === 'string' ? g.fecha.slice(0, 10) : g.fecha.toISOString().slice(0, 10);
        return dStr.startsWith(mInfo.key);
      });

      const bloqueosMes = allBloqueos13.filter(b => {
        const dStr = typeof b.fecha === 'string' ? b.fecha.slice(0, 10) : b.fecha.toISOString().slice(0, 10);
        return dStr.startsWith(mInfo.key);
      });

      // Atendidos
      const atendidos = turnosMes.filter(t => t.estado === 'REALIZADO');
      const cantAtendidos = atendidos.length;
      const facturacion = atendidos.reduce((sum, t) => sum + Number(t.valorTotal || 0), 0);
      const totalGastos = gastosMes.reduce((sum, g) => sum + Number(g.monto || 0), 0);
      const facturacionNeta = Math.max(0, facturacion - totalGastos);

      // Bajas
      const cancelados = turnosMes.filter(t => t.estado === 'CANCELADO');
      const ausentes = turnosMes.filter(t => t.estado === 'NO_ASISTIO');
      const finalizados = turnosMes.filter(t => t.subEstado === 'FINALIZADO');
      const totalBajas = cancelados.length + ausentes.length + finalizados.length;
      const valorBajas = [...cancelados, ...ausentes].reduce((sum, t) => sum + Number(t.valorTotal || 0), 0);

      // Clientes Nuevos
      const newClientsInMonth = new Set();
      let valorTurnosNuevos = 0;

      for (const t of atendidos) {
        if (!t.clienteId) continue;
        const firstTurnoTime = clientFirstTurnoMap.get(t.clienteId);
        const tTime = new Date(t.fecha).getTime();

        // Is this the first turn of this client, or is client fechaAlta / fechaPrimerTurno in this month?
        const isFirst = (!firstTurnoTime || Math.abs(firstTurnoTime - tTime) < 86400000);
        if (isFirst) {
          newClientsInMonth.add(t.clienteId);
          valorTurnosNuevos += Number(t.valorTotal || 0);
        }
      }

      // Agenda Occupancy (% Ocupación de Agenda según D-155)
      const bloqueosByDate = new Map();
      for (const b of bloqueosMes) {
        const bDateStr = typeof b.fecha === 'string' ? b.fecha.slice(0, 10) : b.fecha.toISOString().slice(0, 10);
        if (!bloqueosByDate.has(bDateStr)) bloqueosByDate.set(bDateStr, []);
        bloqueosByDate.get(bDateStr).push(b);
      }

      const turnosByDate = new Map();
      for (const t of turnosMes) {
        if (t.estado === 'BLOQUEADO') continue;
        const tDateStr = typeof t.fecha === 'string' ? t.fecha.slice(0, 10) : t.fecha.toISOString().slice(0, 10);
        if (!turnosByDate.has(tDateStr)) turnosByDate.set(tDateStr, []);
        turnosByDate.get(tDateStr).push(t);
      }

      let minutosDisponibles = 0;
      let minutosOcupados = 0;

      for (let day = 1; day <= lastDay; day++) {
        const dayDate = new Date(Date.UTC(mInfo.year, mInfo.month - 1, day, 12, 0, 0));
        const dayOfWeek = dayDate.getUTCDay();
        const isWeekday = (dayOfWeek >= 1 && dayOfWeek <= 5);
        const dateStr = dayDate.toISOString().split('T')[0];

        if (isWeekday) {
          const dayBlocks = bloqueosByDate.get(dateStr) || [];
          let isFullDayBlocked = false;
          const clampedBlockIntervals = [];

          for (const b of dayBlocks) {
            if (b.esDiaCompleto) {
              isFullDayBlocked = true;
              break;
            }
            const bStart = timeToMinutes(b.horaInicio);
            const bEnd = timeToMinutes(b.horaFin);
            const overlapStart = Math.max(840, bStart);
            const overlapEnd = Math.min(1320, bEnd);
            if (overlapEnd > overlapStart) {
              clampedBlockIntervals.push([overlapStart, overlapEnd]);
            }
          }

          let minBloqueados = 0;
          if (isFullDayBlocked) {
            minBloqueados = 480;
          } else {
            const merged = mergeIntervals(clampedBlockIntervals);
            minBloqueados = merged.reduce((acc, [s, e]) => acc + (e - s), 0);
          }

          minutosDisponibles += Math.max(0, 480 - minBloqueados);
        }

        const dayTurnos = turnosByDate.get(dateStr) || [];
        const turnoIntervals = [];

        for (const t of dayTurnos) {
          if (!['REALIZADO', 'CANCELADO', 'NO_ASISTIO', 'SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION', 'PENDIENTE_PAGO'].includes(t.estado)) {
            continue;
          }
          const startM = timeToMinutes(t.horaInicio);
          let endM = timeToMinutes(t.horaFin);
          if (!endM || endM <= startM) {
            endM = startM + Number(t.duracionMinutos || 30);
          }
          if (endM > startM) {
            turnoIntervals.push([startM, endM]);
          }
        }

        const mergedTurnos = mergeIntervals(turnoIntervals);
        minutosOcupados += mergedTurnos.reduce((acc, [s, e]) => acc + (e - s), 0);
      }

      const ocupacionPorcentaje = minutosDisponibles > 0
        ? Math.round((minutosOcupados / minutosDisponibles) * 1000) / 10
        : 0;

      const tieneDatos = cantAtendidos > 0 || turnosMes.length > 0 || totalGastos > 0;

      return {
        ...mInfo,
        turnosAtendidos: cantAtendidos,
        facturacion,
        gastos: totalGastos,
        facturacionNeta,
        margenNetoPorc: facturacion > 0 ? Math.round((facturacionNeta / facturacion) * 1000) / 10 : 0,
        ocupacionPorcentaje,
        minutosOcupados,
        minutosDisponibles,
        clientesNuevos: newClientsInMonth.size,
        valorTurnosNuevos,
        finalizados: finalizados.length,
        cancelados: cancelados.length,
        ausentes: ausentes.length,
        totalBajas,
        valorBajas,
        tieneDatos
      };
    });

    // The selected month is the last element in monthlyStats (index 12)
    const currentMonthData = monthlyStats[monthlyStats.length - 1];
    // The previous month is index 11
    const prevMonthData = monthlyStats[monthlyStats.length - 2];

    // Compute KPI cards comparison vs previous month
    const kpis = {
      turnosAtendidos: {
        valor: currentMonthData.turnosAtendidos,
        comparacion: calcGrowth(currentMonthData.turnosAtendidos, prevMonthData?.turnosAtendidos)
      },
      facturacion: {
        valor: currentMonthData.facturacion,
        comparacion: calcGrowth(currentMonthData.facturacion, prevMonthData?.facturacion)
      },
      facturacionNeta: {
        valor: currentMonthData.facturacionNeta,
        porcentajeFacturacion: currentMonthData.facturacion > 0
          ? `${(currentMonthData.margenNetoPorc).toFixed(1).replace('.', ',')}% de la facturación`
          : '0% de la facturación'
      },
      clientesNuevos: {
        valor: currentMonthData.clientesNuevos,
        comparacion: calcGrowth(currentMonthData.clientesNuevos, prevMonthData?.clientesNuevos)
      }
    };

    // Table "Resumen de [mes] [año]"
    const resumen = {
      mesLabel: currentMonthData.fullLabel,
      turnosAtendidos: currentMonthData.turnosAtendidos,
      ocupacionAgendaPorc: currentMonthData.ocupacionPorcentaje,
      ocupacionMinutos: currentMonthData.minutosOcupados,
      disponiblesMinutos: currentMonthData.minutosDisponibles,
      facturacionMes: currentMonthData.facturacion,
      gastosMes: currentMonthData.gastos,
      facturacionNeta: currentMonthData.facturacionNeta,
      clientesNuevos: currentMonthData.clientesNuevos,
      valorTurnosNuevos: currentMonthData.valorTurnosNuevos,
      clientesFinalizaron: currentMonthData.finalizados,
      bajasCancelados: currentMonthData.cancelados,
      bajasNoVinieron: currentMonthData.ausentes,
      totalBajas: currentMonthData.totalBajas,
      valorBajasPerdido: currentMonthData.valorBajas
    };

    return NextResponse.json({
      selectedMonth: selectedMonthStr,
      mesLabel: currentMonthData.fullLabel,
      fechaEmision: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      kpis,
      resumen,
      evolucion13Meses: monthlyStats
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/estadisticas/consolidado-mensual:', error);
    return NextResponse.json({ error: 'Error al generar consolidado mensual' }, { status: 500 });
  }
}
