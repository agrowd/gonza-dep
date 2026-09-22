import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

function parseTurnoZonas(zonasRaw) {
  if (!zonasRaw) return [];
  if (Array.isArray(zonasRaw)) return zonasRaw;
  if (typeof zonasRaw !== 'string') return [];
  const trimmed = zonasRaw.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // fallback
    }
  }
  return trimmed.split(',').map(s => ({ nombre: s.trim() })).filter(z => z.nombre);
}

function getZonasLabel(zonasRaw) {
  const list = parseTurnoZonas(zonasRaw);
  return list.map(z => typeof z === 'string' ? z : (z.nombre || z.name || '')).filter(Boolean).join(', ') || 'Sin zonas especificadas';
}

function formatTurnoItem(t) {
  return {
    id: t.id,
    clienteId: t.clienteId,
    clienteNombre: t.cliente?.nombreCompleto || 'Sin nombre',
    clienteWhatsapp: t.cliente?.whatsapp || '',
    clienteEmail: t.cliente?.email || '',
    canalAdquisicion: t.cliente?.canalAdquisicion || 'ORGANICO',
    fecha: typeof t.fecha === 'string' ? t.fecha.split('T')[0] : t.fecha.toISOString().split('T')[0],
    horaInicio: t.horaInicio,
    horaFin: t.horaFin,
    duracionMinutos: t.duracionMinutos,
    zonasTexto: getZonasLabel(t.zonas),
    zonas: parseTurnoZonas(t.zonas),
    valorTotal: Number(t.valorTotal || 0),
    valorSeña: Number(t.valorSeña || 0),
    saldoPendiente: Number(t.saldoPendiente || 0),
    estado: t.estado,
    subEstado: t.subEstado || null,
    señaEstado: t.señaEstado || null,
    notasGonzalo: t.notasGonzalo || t.cliente?.notasGonzalo || '',
    observaciones: t.observaciones || ''
  };
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Argentina local date (UTC-3)
    const now = new Date();
    const offsetBuenosAires = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowLocal = new Date(utc + (3600000 * offsetBuenosAires));
    const todayStr = nowLocal.toISOString().split('T')[0];
    const currentHourMin = `${String(nowLocal.getHours()).padStart(2, '0')}:${String(nowLocal.getMinutes()).padStart(2, '0')}`;

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let startOfPeriod, endOfPeriod;
    let year, month;

    if (startParam && endParam) {
      startOfPeriod = new Date(startParam + 'T00:00:00');
      endOfPeriod = new Date(endParam + 'T23:59:59.999');
      year = startOfPeriod.getFullYear();
      month = startOfPeriod.getMonth() + 1;
    } else {
      year = yearParam ? parseInt(yearParam, 10) : nowLocal.getFullYear();
      month = monthParam ? parseInt(monthParam, 10) : nowLocal.getMonth() + 1;
      const monthStr = String(month).padStart(2, '0');
      startOfPeriod = new Date(`${year}-${monthStr}-01T00:00:00`);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const lastDayStr = String(lastDayOfMonth).padStart(2, '0');
      endOfPeriod = new Date(`${year}-${monthStr}-${lastDayStr}T23:59:59.999`);
    }

    // Quick range dates (Argentina time)
    const startOfToday = new Date(todayStr + 'T00:00:00');
    const endOfToday = new Date(todayStr + 'T23:59:59.999');

    // Current week (Monday to Sunday)
    const dayOfWeek = nowLocal.getDay();
    const diffToMonday = nowLocal.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mondayDate = new Date(nowLocal);
    mondayDate.setDate(diffToMonday);
    const mondayStr = mondayDate.toISOString().split('T')[0];
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const sundayStr = sundayDate.toISOString().split('T')[0];

    const startOfWeek = new Date(mondayStr + 'T00:00:00');
    const endOfWeek = new Date(sundayStr + 'T23:59:59.999');

    // Parallel DB Queries
    const [
      turnosPeriodo,
      turnosCreatedPeriodo,
      turnosHoyFecha,
      turnosHoyCreated,
      turnosSemanaFecha,
      turnosSemanaCreated,
      allClients,
      zonasCatalog
    ] = await Promise.all([
      prisma.turno.findMany({
        where: { fecha: { gte: startOfPeriod, lte: endOfPeriod } },
        include: { cliente: true },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startOfPeriod, lte: endOfPeriod } },
        include: { cliente: true }
      }),
      prisma.turno.findMany({
        where: { fecha: { gte: startOfToday, lte: endOfToday } },
        include: { cliente: true }
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
        include: { cliente: true }
      }),
      prisma.turno.findMany({
        where: { fecha: { gte: startOfWeek, lte: endOfWeek } },
        include: { cliente: true }
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startOfWeek, lte: endOfWeek } },
        include: { cliente: true }
      }),
      prisma.cliente.findMany({
        include: {
          turnos: {
            orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }]
          }
        }
      }),
      prisma.zona.findMany({
        orderBy: { nombre: 'asc' }
      })
    ]);

    // ==========================================
    // REVENUE & CASHFLOW ACCOUNTING (GONZALO RULE)
    // Señas se computan en fecha de creación (createdAt)
    // Saldos de turnos se computan en fecha de sesión (fecha)
    // ==========================================

    // Helper: calculate session balance collected (valorTotal - valorSeña)
    const isCompletedSession = (t) => {
      return t.estado === 'REALIZADO' || 
             ['SIGUIENTE_TURNO', 'VA_A_AVISAR', 'MANTENIMIENTO', 'FINALIZADO'].includes(t.subEstado);
    };

    // Hoy
    const entradasTurnosHoy = turnosHoyFecha
      .filter(t => isCompletedSession(t))
      .reduce((acc, t) => acc + Math.max(0, (t.valorTotal || 0) - (t.valorSeña || 0)), 0);

    const entradasSenasHoy = turnosHoyCreated
      .filter(t => (t.valorSeña || 0) > 0 && t.estado !== 'CANCELADO')
      .reduce((acc, t) => acc + (t.valorSeña || 0), 0);

    const totalHoy = entradasTurnosHoy + entradasSenasHoy;

    // Esta Semana
    const entradasTurnosSemana = turnosSemanaFecha
      .filter(t => isCompletedSession(t))
      .reduce((acc, t) => acc + Math.max(0, (t.valorTotal || 0) - (t.valorSeña || 0)), 0);

    const entradasSenasSemana = turnosSemanaCreated
      .filter(t => (t.valorSeña || 0) > 0 && t.estado !== 'CANCELADO')
      .reduce((acc, t) => acc + (t.valorSeña || 0), 0);

    const totalSemana = entradasTurnosSemana + entradasSenasSemana;

    // Período Seleccionado
    const entradasTurnosPeriodo = turnosPeriodo
      .filter(t => isCompletedSession(t))
      .reduce((acc, t) => acc + Math.max(0, (t.valorTotal || 0) - (t.valorSeña || 0)), 0);

    const entradasSenasPeriodo = turnosCreatedPeriodo
      .filter(t => (t.valorSeña || 0) > 0 && t.estado !== 'CANCELADO')
      .reduce((acc, t) => acc + (t.valorSeña || 0), 0);

    const totalPeriodo = entradasTurnosPeriodo + entradasSenasPeriodo;

    const bonificacionPeriodo = turnosPeriodo.reduce((acc, t) => acc + (t.bonificacion || 0), 0);

    // ==========================================
    // 11 CATEGORÍAS DE ESTADÍSTICAS AVANZADAS
    // ==========================================

    // 1. Turnos Realizados
    const itemsRealizados = turnosPeriodo.filter(t => isCompletedSession(t)).map(formatTurnoItem);
    const totalRealizados = itemsRealizados.reduce((acc, item) => acc + item.valorTotal, 0);
    const ticketPromedioRealizados = itemsRealizados.length > 0 ? Math.round(totalRealizados / itemsRealizados.length) : 0;

    // 2. Turnos Señados / Confirmados
    const itemsSenados = turnosPeriodo.filter(t => t.estado === 'SEÑADO' || t.estado === 'PENDIENTE_AUTORIZACION').map(formatTurnoItem);
    const totalSenados = itemsSenados.reduce((acc, item) => acc + item.valorTotal, 0);
    const ticketPromedioSenados = itemsSenados.length > 0 ? Math.round(totalSenados / itemsSenados.length) : 0;

    // 3. Turnos Cancelados (con cálculo de pérdida)
    const itemsCancelados = turnosPeriodo.filter(t => t.estado === 'CANCELADO').map(formatTurnoItem);
    const totalPerdidaCancelados = itemsCancelados.reduce((acc, item) => {
      // Si la seña se conservó para otro turno, la sesión actual fue pérdida total
      if (item.señaEstado === 'CONSERVADA') return acc + item.valorTotal;
      // Si la seña se perdió o no hubo seña:
      if (item.señaEstado === 'PERDIDA') return acc + Math.max(0, item.valorTotal - item.valorSeña);
      return acc + (item.valorTotal || 0);
    }, 0);

    // 4. Turnos Ausentes (No asistió)
    const itemsAusentes = turnosPeriodo.filter(t => t.estado === 'NO_ASISTIO').map(formatTurnoItem);
    const totalPerdidaAusentes = itemsAusentes.reduce((acc, item) => {
      return acc + (item.saldoPendiente > 0 ? item.saldoPendiente : Math.max(0, item.valorTotal - item.valorSeña));
    }, 0);

    // 5. Turnos Sin Marcar (ya pasaron de fecha/hora pero siguen en SEÑADO, PENDIENTE_PAGO o PENDIENTE_AUTORIZACION)
    const itemsSinMarcar = turnosPeriodo.filter(t => {
      if (!['SEÑADO', 'PENDIENTE_PAGO', 'PENDIENTE_AUTORIZACION', 'CONSULTA'].includes(t.estado)) return false;
      const tFechaStr = typeof t.fecha === 'string' ? t.fecha.split('T')[0] : t.fecha.toISOString().split('T')[0];
      if (tFechaStr < todayStr) return true;
      if (tFechaStr === todayStr && t.horaFin && t.horaFin < currentHourMin) return true;
      return false;
    }).map(formatTurnoItem);

    // 6. Clientes "Va a avisar"
    // Clientes cuyo último turno realizado terminó en VA_A_AVISAR (o turnos del período)
    const itemsVaAAvisar = [];
    let totalPerdidaVaAAvisar = 0;
    allClients.forEach(c => {
      const turnosRealizadosCliente = (c.turnos || []).filter(isCompletedSession);
      if (turnosRealizadosCliente.length > 0) {
        const lastRealizado = turnosRealizadosCliente[0]; // ordenado desc
        if (lastRealizado.subEstado === 'VA_A_AVISAR') {
          const item = formatTurnoItem({ ...lastRealizado, cliente: c });
          itemsVaAAvisar.push(item);
          totalPerdidaVaAAvisar += item.valorTotal;
        }
      }
    });

    // 7. Clientes "Mantenimiento"
    const itemsMantenimiento = [];
    let totalValorMantenimiento = 0;
    allClients.forEach(c => {
      const turnosRealizadosCliente = (c.turnos || []).filter(isCompletedSession);
      if (turnosRealizadosCliente.length > 0) {
        const lastRealizado = turnosRealizadosCliente[0];
        if (lastRealizado.subEstado === 'MANTENIMIENTO') {
          const item = formatTurnoItem({ ...lastRealizado, cliente: c });
          itemsMantenimiento.push(item);
          totalValorMantenimiento += item.valorTotal;
        }
      }
    });

    // 8. Clientes "Finalizó"
    const itemsFinalizo = [];
    let totalValorFinalizo = 0;
    allClients.forEach(c => {
      const turnosRealizadosCliente = (c.turnos || []).filter(isCompletedSession);
      if (turnosRealizadosCliente.length > 0) {
        const lastRealizado = turnosRealizadosCliente[0];
        if (lastRealizado.subEstado === 'FINALIZADO') {
          const item = formatTurnoItem({ ...lastRealizado, cliente: c });
          itemsFinalizo.push(item);
          totalValorFinalizo += item.valorTotal;
        }
      }
    });

    // 9. Clientes Nuevos con turno en el período
    // Clientes cuya fechaAlta o primer turno coincide con el período
    const clientesNuevosMap = new Map();
    turnosPeriodo.forEach(t => {
      const cl = t.cliente;
      if (!cl) return;
      const allClientTurnos = (cl.turnos || allClients.find(c => c.id === cl.id)?.turnos || []);
      const isFirstTurno = allClientTurnos.length <= 1 || (cl.fechaPrimerTurno && new Date(cl.fechaPrimerTurno) >= startOfPeriod && new Date(cl.fechaPrimerTurno) <= endOfPeriod);
      if (isFirstTurno && !clientesNuevosMap.has(cl.id)) {
        clientesNuevosMap.set(cl.id, {
          cliente: cl,
          primerTurno: t
        });
      }
    });

    const itemsNuevos = Array.from(clientesNuevosMap.values()).map(({ primerTurno }) => formatTurnoItem(primerTurno));
    const totalNuevos = itemsNuevos.reduce((acc, item) => acc + item.valorTotal, 0);
    const ticketPromedioNuevos = itemsNuevos.length > 0 ? Math.round(totalNuevos / itemsNuevos.length) : 0;

    // Conteo por canal de adquisición
    const canalesStats = {
      ORGANICO: 0,
      PUBLICIDAD_IG: 0,
      PUBLICIDAD_FB: 0,
      GOOGLE: 0,
      RECOMENDACION: 0,
      OTRO: 0
    };

    itemsNuevos.forEach(item => {
      const canal = item.canalAdquisicion || 'ORGANICO';
      if (canalesStats[canal] !== undefined) {
        canalesStats[canal]++;
      } else {
        canalesStats.OTRO++;
      }
    });

    // 10. Zonas (Histograma y desglose)
    const zonasMap = {};
    zonasCatalog.forEach(z => {
      zonasMap[z.nombre] = {
        nombre: z.nombre,
        realizados: 0,
        senados: 0,
        cancelados: 0,
        total: 0,
        ingresos: 0,
        items: []
      };
    });

    turnosPeriodo.forEach(t => {
      const parsedZ = parseTurnoZonas(t.zonas);
      const item = formatTurnoItem(t);
      parsedZ.forEach(pz => {
        const zName = typeof pz === 'string' ? pz : (pz.nombre || pz.name || '');
        if (!zName) return;
        if (!zonasMap[zName]) {
          zonasMap[zName] = {
            nombre: zName,
            realizados: 0,
            senados: 0,
            cancelados: 0,
            total: 0,
            ingresos: 0,
            items: []
          };
        }
        zonasMap[zName].total++;
        zonasMap[zName].items.push(item);
        if (isCompletedSession(t)) {
          zonasMap[zName].realizados++;
          zonasMap[zName].ingresos += (pz.precio || (t.valorTotal / (parsedZ.length || 1)));
        } else if (t.estado === 'SEÑADO') {
          zonasMap[zName].senados++;
        } else if (t.estado === 'CANCELADO') {
          zonasMap[zName].cancelados++;
        }
      });
    });

    const histogramaZonas = Object.values(zonasMap).sort((a, b) => b.total - a.total);

    // 11. Operador (Gonzalo Siri)
    const itemsOperador = turnosPeriodo.map(formatTurnoItem);
    const operadorData = {
      nombre: 'Gonzalo Siri',
      rol: 'Administrador / Operador Principal',
      totalTurnos: itemsOperador.length,
      turnosRealizados: itemsRealizados.length,
      turnosSenados: itemsSenados.length,
      facturacionTotal: totalRealizados,
      comisionEstimada: totalRealizados, // 100% propio
      items: itemsOperador
    };

    // ==========================================
    // ESTADÍSTICAS GENERALES (RENOVADAS)
    // ==========================================
    const turnosTotalesPeriodo = turnosPeriodo.length;
    const turnosRealizadosPeriodo = itemsRealizados.length;
    const turnosCanceladosPeriodo = itemsCancelados.length;
    const turnosNoAsistioPeriodo = itemsAusentes.length;
    const turnosSenadosPeriodo = itemsSenados.length;
    const turnosPendientesPagoPeriodo = turnosPeriodo.filter(t => t.estado === 'PENDIENTE_PAGO').length;
    const turnosPendientesAutPeriodo = turnosPeriodo.filter(t => t.estado === 'PENDIENTE_AUTORIZACION').length;
    const turnosReprogramadosPeriodo = turnosPeriodo.filter(t => t.estado === 'REPROGRAMADO').length;

    // Clientes clasificados
    const distinctClientIdsInPeriod = [...new Set(turnosPeriodo.map(t => t.clienteId))];
    const clientesRecurrentes = allClients.filter(c => {
      const completadas = (c.turnos || []).filter(isCompletedSession).length;
      return completadas > 1;
    }).length;
    const clientesNuevosTotales = allClients.filter(c => {
      const completadas = (c.turnos || []).filter(isCompletedSession).length;
      return completadas <= 1;
    }).length;

    // Ganancia por nuevos vs recurrentes en el período
    let gananciaNuevosPeriodo = 0;
    let gananciaRecurrentesPeriodo = 0;

    turnosPeriodo.forEach(t => {
      if (!isCompletedSession(t)) return;
      const cl = allClients.find(c => c.id === t.clienteId);
      const isNew = cl ? (cl.turnos || []).filter(isCompletedSession).length <= 1 : true;
      if (isNew) gananciaNuevosPeriodo += (t.valorTotal || 0);
      else gananciaRecurrentesPeriodo += (t.valorTotal || 0);
    });

    const gananciaPorClientePromedio = distinctClientIdsInPeriod.length > 0
      ? Math.round(totalRealizados / distinctClientIdsInPeriod.length)
      : 0;

    // Pérdidas globales
    const perdidasTotalesPeriodo = totalPerdidaCancelados + totalPerdidaAusentes;

    return NextResponse.json({
      selectedPeriod: {
        start: startOfPeriod.toISOString().split('T')[0],
        end: endOfPeriod.toISOString().split('T')[0],
        year,
        month
      },
      // Desglose de Caja Diaria, Semanal y Mensual (Gonzalo Rule)
      caja: {
        hoy: {
          entradasTurnos: entradasTurnosHoy,
          entradasSenas: entradasSenasHoy,
          total: totalHoy
        },
        semana: {
          entradasTurnos: entradasTurnosSemana,
          entradasSenas: entradasSenasSemana,
          total: totalSemana
        },
        periodo: {
          entradasTurnos: entradasTurnosPeriodo,
          entradasSenas: entradasSenasPeriodo,
          total: totalPeriodo,
          bonificaciones: bonificacionPeriodo
        }
      },
      // 11 Categorías de Estadísticas Avanzadas
      avanzadas: {
        realizados: {
          count: itemsRealizados.length,
          total: totalRealizados,
          ticketPromedio: ticketPromedioRealizados,
          items: itemsRealizados
        },
        senados: {
          count: itemsSenados.length,
          total: totalSenados,
          ticketPromedio: ticketPromedioSenados,
          items: itemsSenados
        },
        cancelados: {
          count: itemsCancelados.length,
          totalPerdida: totalPerdidaCancelados,
          items: itemsCancelados
        },
        ausentes: {
          count: itemsAusentes.length,
          totalPerdida: totalPerdidaAusentes,
          items: itemsAusentes
        },
        sinMarcar: {
          count: itemsSinMarcar.length,
          items: itemsSinMarcar
        },
        vaAAvisar: {
          count: itemsVaAAvisar.length,
          totalPerdida: totalPerdidaVaAAvisar,
          items: itemsVaAAvisar
        },
        mantenimiento: {
          count: itemsMantenimiento.length,
          totalValor: totalValorMantenimiento,
          items: itemsMantenimiento
        },
        finalizo: {
          count: itemsFinalizo.length,
          totalValor: totalValorFinalizo,
          items: itemsFinalizo
        },
        nuevos: {
          count: itemsNuevos.length,
          total: totalNuevos,
          ticketPromedio: ticketPromedioNuevos,
          canales: canalesStats,
          items: itemsNuevos
        },
        zonas: {
          histograma: histogramaZonas,
          catalog: zonasCatalog.map(z => z.nombre)
        },
        operador: operadorData
      },
      // Estadísticas Generales (Renovadas)
      generales: {
        turnos: {
          total: turnosTotalesPeriodo,
          realizados: turnosRealizadosPeriodo,
          cancelados: turnosCanceladosPeriodo,
          ausentes: turnosNoAsistioPeriodo,
          senados: turnosSenadosPeriodo,
          reprogramados: turnosReprogramadosPeriodo,
          pendientesPago: turnosPendientesPagoPeriodo,
          pendientesAutorizacion: turnosPendientesAutPeriodo,
          vaAAvisar: itemsVaAAvisar.length,
          finalizado: itemsFinalizo.length
        },
        clientes: {
          nuevosCreados: itemsNuevos.length,
          activosConTurno: distinctClientIdsInPeriod.length,
          globalRecurrentes: clientesRecurrentes,
          globalNuevos: clientesNuevosTotales
        },
        ganancias: {
          deClientesNuevos: gananciaNuevosPeriodo,
          deClientesRecurrentes: gananciaRecurrentesPeriodo,
          promedioPorCliente: gananciaPorClientePromedio
        },
        perdidas: {
          porCancelaciones: totalPerdidaCancelados,
          porAusencias: totalPerdidaAusentes,
          total: perdidasTotalesPeriodo
        }
      }
    });

  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json({ error: 'Error interno al generar estadísticas' }, { status: 500 });
  }
}
