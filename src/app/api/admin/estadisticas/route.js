import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month'); // 0-indexed or 1-indexed? Let's use 1-indexed (1 = Jan, 12 = Dec)

    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1; // 1-12

    // Calculate date range for the selected month
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Calculate dates for current day and current week for dashboard quick indicators
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    // Current week (Monday to Sunday)
    const currentDay = now.getDay();
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    // 1. Fetch appointments for the selected month
    const turnosMes = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        cliente: true
      }
    });

    // 2. Fetch appointments for today
    const turnosHoy = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });

    // 3. Fetch appointments for this week
    const turnosSemana = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    });

    // 4. Fetch clients details to calculate client counts (new vs recurrent)
    // We get all clients and will categorize them in memory
    const clientes = await prisma.cliente.findMany({
      include: {
        turnos: true
      }
    });

    // --- REVENUE CALCULATIONS ---
    // Ganancia del día: Sum of valorTotal of REALIZADO + valorSeña of other paid appointments today
    const gananciaDia = turnosHoy.reduce((acc, t) => {
      if (t.estado === 'REALIZADO') return acc + t.valorTotal;
      if (t.estado === 'SEÑADO' || t.estado === 'REPROGRAMADO' || t.estado === 'NO_ASISTIO') return acc + t.valorSeña;
      return acc;
    }, 0);

    // Ganancia de la semana
    const gananciaSemana = turnosSemana.reduce((acc, t) => {
      if (t.estado === 'REALIZADO') return acc + t.valorTotal;
      if (t.estado === 'SEÑADO' || t.estado === 'REPROGRAMADO' || t.estado === 'NO_ASISTIO') return acc + t.valorSeña;
      return acc;
    }, 0);

    // Ganancia del mes (selected month)
    const gananciaMes = turnosMes.reduce((acc, t) => {
      if (t.estado === 'REALIZADO') return acc + t.valorTotal;
      if (t.estado === 'SEÑADO' || t.estado === 'REPROGRAMADO' || t.estado === 'NO_ASISTIO') return acc + t.valorSeña;
      return acc;
    }, 0);

    // Señas cobradas en el mes (selected)
    const senasCobradasMes = turnosMes.reduce((acc, t) => {
      // If the turn has a status indicating payment of seña (anything except PENDIENTE_PAGO)
      if (t.estado !== 'PENDIENTE_PAGO' && t.estado !== 'PENDIENTE_AUTORIZACION') {
        return acc + t.valorSeña;
      }
      return acc;
    }, 0);

    // --- APPOINTMENT COUNTS FOR THE MONTH ---
    const turnosTotalesMes = turnosMes.length;
    const turnosRealizadosMes = turnosMes.filter(t => t.estado === 'REALIZADO').length;
    const turnosCanceladosMes = turnosMes.filter(t => t.estado === 'CANCELADO').length;
    const turnosReprogramadosMes = turnosMes.filter(t => t.estado === 'REPROGRAMADO').length;
    const turnosNoAsistioMes = turnosMes.filter(t => t.estado === 'NO_ASISTIO').length;
    const turnosSenadosMes = turnosMes.filter(t => t.estado === 'SEÑADO').length;
    const turnosPendientesPagoMes = turnosMes.filter(t => t.estado === 'PENDIENTE_PAGO').length;
    const turnosPendientesAutMes = turnosMes.filter(t => t.estado === 'PENDIENTE_AUTORIZACION').length;

    // --- CLIENT CLASSIFICATION ---
    // Clientes nuevos creados en este mes
    const clientesNuevosMes = clientes.filter(c => {
      const alta = new Date(c.fechaAlta);
      return alta >= startOfMonth && alta <= endOfMonth;
    }).length;

    // Total clients who had a turn in this month
    const distinctClientIdsInMonth = [...new Set(turnosMes.map(t => t.clienteId))];
    const activeClientsInMonth = clientes.filter(c => distinctClientIdsInMonth.includes(c.id));

    // Clients categorized by recurrence overall (recurrent = > 1 session total)
    const clientesRecurrentes = clientes.filter(c => {
      const realizadas = c.turnos.filter(t => t.estado === 'REALIZADO').length;
      return realizadas > 1;
    }).length;

    const clientesNuevosTotales = clientes.filter(c => {
      const realizadas = c.turnos.filter(t => t.estado === 'REALIZADO').length;
      return realizadas <= 1;
    }).length;

    // --- REVENUE BY CLIENT GROUP IN MONTH ---
    // Ganancia por clientes nuevos (aquellos con <= 1 sesion realizada en total)
    let gananciaNuevosMes = 0;
    let gananciaRecurrentesMes = 0;

    turnosMes.forEach(t => {
      const cl = clientes.find(c => c.id === t.clienteId);
      const isNew = cl ? cl.turnos.filter(x => x.estado === 'REALIZADO').length <= 1 : true;
      let revenue = 0;
      if (t.estado === 'REALIZADO') revenue = t.valorTotal;
      else if (t.estado === 'SEÑADO' || t.estado === 'REPROGRAMADO' || t.estado === 'NO_ASISTIO') revenue = t.valorSeña;

      if (isNew) {
        gananciaNuevosMes += revenue;
      } else {
        gananciaRecurrentesMes += revenue;
      }
    });

    // Average revenue per client in the month
    const gananciaPorClientePromedio = activeClientsInMonth.length > 0 
      ? gananciaMes / activeClientsInMonth.length 
      : 0;

    // --- LOSSES TRACKING ---
    // 1. Turnos cancelados sin reemplazo: total loss of session value (valorTotal - valorSeña)
    //    If canceled, the client paid the seña (or not), so loss = valorTotal - (did they pay seña? if yes, valorSeña, otherwise 0)
    //    Let's assume if canceled, they lost the seña (so that's captured revenue), but we lost the rest of the turn value: valorTotal - valorSeña.
    const perdidasCancelaciones = turnosMes
      .filter(t => t.estado === 'CANCELADO')
      .reduce((acc, t) => acc + (t.valorTotal - t.valorSeña), 0);

    // 2. Clientes que no asistieron (no_asistio): similar to cancellation, we lost the remaining balance (saldoPendiente)
    const perdidasAusencias = turnosMes
      .filter(t => t.estado === 'NO_ASISTIO')
      .reduce((acc, t) => acc + t.saldoPendiente, 0);

    // 3. Saldos pendientes: Realizado turnos that still have pending balances (if they unpaid part of it)
    const saldosPendientes = turnosMes
      .filter(t => t.estado === 'REALIZADO')
      .reduce((acc, t) => acc + t.saldoPendiente, 0);

    // 4. Señas no abonadas: Turnos in PENDIENTE_PAGO or CANCELADO (where seña was never paid)
    const senasNoAbonadas = turnosMes
      .filter(t => t.estado === 'PENDIENTE_PAGO')
      .reduce((acc, t) => acc + t.valorSeña, 0);

    // Total losses sum
    const perdidasTotales = perdidasCancelaciones + perdidasAusencias + saldosPendientes + senasNoAbonadas;

    return NextResponse.json({
      selectedPeriod: { year, month },
      quickStats: {
        gananciaDia,
        gananciaSemana,
        gananciaMes,
        senasCobradasMes
      },
      turnosMes: {
        total: turnosTotalesMes,
        realizados: turnosRealizadosMes,
        cancelados: turnosCanceladosMes,
        reprogramados: turnosReprogramadosMes,
        noAsistio: turnosNoAsistioMes,
        senados: turnosSenadosMes,
        pendientesPago: turnosPendientesPagoMes,
        pendientesAutorizacion: turnosPendientesAutMes
      },
      clientesMes: {
        nuevosCreados: clientesNuevosMes,
        activosConTurno: activeClientsInMonth.length,
        globalRecurrentes: clientesRecurrentes,
        globalNuevos: clientesNuevosTotales
      },
      gananciasDetalle: {
        deClientesNuevos: gananciaNuevosMes,
        deClientesRecurrentes: gananciaRecurrentesMes,
        promedioPorCliente: gananciaPorClientePromedio
      },
      perdidasDetalle: {
        porCancelaciones: perdidasCancelaciones,
        porAusencias: perdidasAusencias,
        saldosPendientes,
        senasNoAbonadas,
        total: perdidasTotales
      }
    });

  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
