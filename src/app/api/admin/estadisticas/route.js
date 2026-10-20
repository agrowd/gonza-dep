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
  return list.map(z => typeof z === 'string' ? z : (z.nombre || z.name || '')).filter(Boolean).join(' / ') || 'Sin zonas especificadas';
}

function mapOrigenCategoria(canalRaw) {
  const c = (canalRaw || 'ORGANICO').toUpperCase();
  if (['PUBLICIDAD', 'PUBLICIDAD_IG', 'PUBLICIDAD_FB', 'GOOGLE'].includes(c)) return 'Publicidad';
  if (['REDES', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'REDES_SOCIALES'].includes(c)) return 'Redes sociales';
  return 'Orgánico';
}

function formatTurnoItem(t, extra = {}) {
  const valorTotal = Number(t.valorTotal || 0);
  const valorSeña = Number(t.valorSeña || 0);
  const saldoDelTurno = Math.max(0, valorTotal - valorSeña);
  const metodoPagoRaw = t.metodoPago || 'TRANSFERENCIA';
  const metodoPagoLabel = metodoPagoRaw === 'EFECTIVO' ? 'Efectivo' : 'Transferencia';
  const canalAdquisicion = t.cliente?.canalAdquisicion || 'ORGANICO';
  const origenCategoria = mapOrigenCategoria(canalAdquisicion);
  const operadorNombre = t.operador?.nombre || 'Gonzalo';

  // Campos para Informe de Cancelaciones y Seguimiento (Modelo B)
  const esSeguimiento = Boolean(extra.esSeguimiento);
  const tipoValor = esSeguimiento ? 'Última sesión' : 'Turno no realizado';

  let ultimoEstadoLabel = t.estado || '';
  if (extra.ultimoEstadoLabel) {
    ultimoEstadoLabel = extra.ultimoEstadoLabel;
  } else if (t.subEstado === 'VA_A_AVISAR') {
    ultimoEstadoLabel = 'Va a avisar';
  } else if (t.subEstado === 'MANTENIMIENTO') {
    ultimoEstadoLabel = 'Mantenimiento';
  } else if (t.subEstado === 'FINALIZADO') {
    ultimoEstadoLabel = 'Finalizó';
  } else if (t.estado === 'NO_ASISTIO') {
    ultimoEstadoLabel = 'Ausente';
  } else if (t.estado === 'CANCELADO') {
    ultimoEstadoLabel = 'Cancelado';
  }

  let señaDelTurnoReporte = valorSeña;
  let señaRetenida = 0;
  let oportunidadNoConcretada = valorTotal;

  if (esSeguimiento) {
    // En seguimiento se muestra la seña que tuvo ese turno, seña retenida es 0,
    // y se toma el valor completo de la última sesión sin descontar su seña (como en captura 7.png)
    señaDelTurnoReporte = valorSeña;
    señaRetenida = 0;
    oportunidadNoConcretada = valorTotal;
  } else if (t.estado === 'CANCELADO' || t.estado === 'NO_ASISTIO') {
    // Si la seña quedó guardada (CONSERVADA), seña retenida es 0 y la pérdida es el valor total
    // Si la seña se perdió (retenida por el centro), se resta del valor del turno
    if (t.señaEstado === 'CONSERVADA') {
      señaRetenida = 0;
    } else {
      señaRetenida = valorSeña;
    }
    oportunidadNoConcretada = Math.max(0, valorTotal - señaRetenida);
  }

  return {
    id: extra.customId || t.id,
    turnoOriginalId: t.id,
    clienteId: t.clienteId,
    clienteNombre: t.cliente?.nombreCompleto || 'Sin nombre',
    clienteWhatsapp: t.cliente?.whatsapp || '',
    clienteEmail: t.cliente?.email || '',
    canalAdquisicion,
    origenCategoria,
    metodoPago: metodoPagoRaw,
    metodoPagoLabel,
    operadorId: t.operadorId || null,
    operadorNombre,
    fecha: typeof t.fecha === 'string' ? t.fecha.split('T')[0] : t.fecha.toISOString().split('T')[0],
    horaInicio: t.horaInicio,
    horaFin: t.horaFin,
    duracionMinutos: t.duracionMinutos,
    zonasTexto: getZonasLabel(t.zonas),
    zonas: parseTurnoZonas(t.zonas),
    valorTotal: extra.overrideValorTotal !== undefined ? extra.overrideValorTotal : valorTotal,
    valorSeña: extra.overrideValorSeña !== undefined ? extra.overrideValorSeña : valorSeña,
    saldoPendiente: extra.overrideSaldo !== undefined ? extra.overrideSaldo : saldoDelTurno,
    estado: t.estado,
    subEstado: t.subEstado || null,
    señaEstado: t.señaEstado || null,
    ultimoEstadoLabel,
    tipoValor,
    señaDelTurnoReporte,
    señaRetenida,
    oportunidadNoConcretada,
    subtipoGanancia: extra.subtipoGanancia || null,
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
        include: { cliente: true, operador: true },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startOfPeriod, lte: endOfPeriod } },
        include: { cliente: true, operador: true },
        orderBy: [{ createdAt: 'asc' }]
      }),
      prisma.turno.findMany({
        where: { fecha: { gte: startOfToday, lte: endOfToday } },
        include: { cliente: true, operador: true }
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
        include: { cliente: true, operador: true }
      }),
      prisma.turno.findMany({
        where: { fecha: { gte: startOfWeek, lte: endOfWeek } },
        include: { cliente: true, operador: true }
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startOfWeek, lte: endOfWeek } },
        include: { cliente: true, operador: true }
      }),
      prisma.cliente.findMany({
        include: {
          turnos: {
            include: { operador: true },
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
    // 12 CATEGORÍAS DE ESTADÍSTICAS AVANZADAS
    // ==========================================

    // 1. Turnos Realizados (Solo el valor de las sesiones realizadas en el período)
    const itemsRealizados = turnosPeriodo.filter(t => isCompletedSession(t)).map(t => formatTurnoItem(t));
    const totalRealizados = itemsRealizados.reduce((acc, item) => acc + item.valorTotal, 0);
    const ticketPromedioRealizados = itemsRealizados.length > 0 ? Math.round(totalRealizados / itemsRealizados.length) : 0;

    // 1B. Ganancia Neta (Dinero que realmente ingresa en el período seleccionado)
    // - Turnos nuevos: Si hoy se agenda un cliente y paga la seña, la seña se contabiliza en el período aunque el turno sea para otro día.
    // - Turnos siguientes: Si un cliente que se atendió en el período pidió nuevo turno, se suma el saldo pendiente del turno realizado + la seña del siguiente turno.
    // - Turnos sin siguiente: Si un cliente se atendió y no agendó nuevo turno, solo se suma el saldo pendiente abonado en la sesión.
    const createdInPeriodIds = new Set(
      turnosCreatedPeriodo
        .filter(t => Number(t.valorSeña || 0) > 0 && t.estado !== 'CANCELADO')
        .map(t => t.id)
    );
    const completedInPeriodIds = new Set(
      turnosPeriodo.filter(t => isCompletedSession(t)).map(t => t.id)
    );

    // Mapear señas de próximos turnos creados en el período por clienteId (que no sean sesiones ya realizadas en el período)
    const futureSenasByClient = new Map();
    turnosCreatedPeriodo
      .filter(t => Number(t.valorSeña || 0) > 0 && t.estado !== 'CANCELADO' && !completedInPeriodIds.has(t.id))
      .forEach(t => {
        const list = futureSenasByClient.get(t.clienteId) || [];
        list.push(t);
        futureSenasByClient.set(t.clienteId, list);
      });

    const itemsGananciaNeta = [];
    let montoTurnosNuevos = 0;
    let montoTurnosSiguientes = 0;
    let montoTurnosSinSiguiente = 0;
    const consumedFutureTurnoIds = new Set();

    // A) Sesiones realizadas dentro del período
    turnosPeriodo.filter(t => isCompletedSession(t)).forEach(t => {
      const vTotal = Number(t.valorTotal || 0);
      const vSena = Number(t.valorSeña || 0);
      const saldo = Math.max(0, vTotal - vSena);
      const fueCreadoEnPeriodo = createdInPeriodIds.has(t.id);

      // Verificar si este cliente agendó un próximo turno con seña durante este período
      const clientFutureTurnos = (futureSenasByClient.get(t.clienteId) || []).filter(ft => !consumedFutureTurnoIds.has(ft.id));
      const nextTurnoBooked = clientFutureTurnos.length > 0 ? clientFutureTurnos[0] : null;

      if (nextTurnoBooked) {
        consumedFutureTurnoIds.add(nextTurnoBooked.id);
        const senaSiguiente = Number(nextTurnoBooked.valorSeña || 0);
        const senaPropiaEnPeriodo = fueCreadoEnPeriodo ? vSena : 0;
        const ingresoTotalFila = saldo + senaSiguiente + senaPropiaEnPeriodo;
        montoTurnosSiguientes += ingresoTotalFila;

        itemsGananciaNeta.push(
          formatTurnoItem(t, {
            overrideValorTotal: ingresoTotalFila,
            overrideValorSeña: senaSiguiente + senaPropiaEnPeriodo,
            overrideSaldo: saldo,
            subtipoGanancia: `Turno siguiente (Saldo $${saldo.toLocaleString('es-AR')} + Seña próx. $${senaSiguiente.toLocaleString('es-AR')})`
          })
        );
      } else {
        const senaPropiaEnPeriodo = fueCreadoEnPeriodo ? vSena : 0;
        const ingresoTotalFila = saldo + senaPropiaEnPeriodo;
        montoTurnosSinSiguiente += ingresoTotalFila;

        itemsGananciaNeta.push(
          formatTurnoItem(t, {
            overrideValorTotal: ingresoTotalFila,
            overrideValorSeña: senaPropiaEnPeriodo,
            overrideSaldo: saldo,
            subtipoGanancia: fueCreadoEnPeriodo
              ? 'Turno realizado en período (Seña + Saldo)'
              : 'Turno sin siguiente (Solo Saldo cobrado)'
          })
        );
      }
    });

    // B) Turnos nuevos / señas agendadas en el período (sin sesión realizada en el período)
    turnosCreatedPeriodo
      .filter(t => Number(t.valorSeña || 0) > 0 && t.estado !== 'CANCELADO' && !completedInPeriodIds.has(t.id) && !consumedFutureTurnoIds.has(t.id))
      .forEach(t => {
        const vSena = Number(t.valorSeña || 0);
        montoTurnosNuevos += vSena;
        itemsGananciaNeta.push(
          formatTurnoItem(t, {
            customId: `sena-${t.id}`,
            overrideValorTotal: vSena,
            overrideValorSeña: vSena,
            overrideSaldo: 0,
            subtipoGanancia: 'Turno nuevo (Seña cobrada en el período)'
          })
        );
      });

    const totalGananciaNeta = itemsGananciaNeta.reduce((acc, item) => acc + item.valorTotal, 0);
    const ticketPromedioGananciaNeta = itemsGananciaNeta.length > 0 ? Math.round(totalGananciaNeta / itemsGananciaNeta.length) : 0;

    // 2. Turnos Señados / Confirmados (Solo turnos que están en estado SEÑADO / REPROGRAMADO / PENDIENTE_AUTORIZACION y aún NO fueron realizados)
    const itemsSenados = turnosPeriodo
      .filter(t => !isCompletedSession(t) && ['SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION'].includes(t.estado))
      .map(t => formatTurnoItem(t));
    const totalSenados = itemsSenados.reduce((acc, item) => acc + item.valorTotal, 0);
    const ticketPromedioSenados = itemsSenados.length > 0 ? Math.round(totalSenados / itemsSenados.length) : 0;

    // 3. Turnos Cancelados (Pérdida = Valor del turno - Seña retenida)
    const itemsCancelados = turnosPeriodo.filter(t => t.estado === 'CANCELADO').map(t => formatTurnoItem(t));
    const totalPerdidaCancelados = itemsCancelados.reduce((acc, item) => acc + item.oportunidadNoConcretada, 0);

    // 4. Turnos Ausentes (No asistió: Pérdida = Valor del turno - Seña retenida)
    const itemsAusentes = turnosPeriodo.filter(t => t.estado === 'NO_ASISTIO').map(t => formatTurnoItem(t));
    const totalPerdidaAusentes = itemsAusentes.reduce((acc, item) => acc + item.oportunidadNoConcretada, 0);

    // 5. Turnos Sin Marcar (ya pasaron de fecha/hora pero siguen en SEÑADO, PENDIENTE_PAGO o PENDIENTE_AUTORIZACION)
    const itemsSinMarcar = turnosPeriodo.filter(t => {
      if (!['SEÑADO', 'PENDIENTE_PAGO', 'PENDIENTE_AUTORIZACION', 'CONSULTA'].includes(t.estado)) return false;
      const tFechaStr = typeof t.fecha === 'string' ? t.fecha.split('T')[0] : t.fecha.toISOString().split('T')[0];
      if (tFechaStr < todayStr) return true;
      if (tFechaStr === todayStr && t.horaFin && t.horaFin < currentHourMin) return true;
      return false;
    }).map(t => formatTurnoItem(t));

    // Helper: verificar si un cliente tiene un turno activo/señado posterior a su última sesión realizada
    const hasFutureActiveTurno = (c, lastRealizadoFecha) => {
      const lastTime = new Date(lastRealizadoFecha).getTime();
      return (c.turnos || []).some(t => {
        if (!['SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION'].includes(t.estado)) return false;
        return new Date(t.fecha).getTime() > lastTime;
      });
    };

    // 6. Clientes "Va a avisar" (Clientes que actualmente están en ese estado y aún no agendaron un nuevo turno)
    const itemsVaAAvisar = [];
    let totalPerdidaVaAAvisar = 0;
    allClients.forEach(c => {
      const turnosRealizadosCliente = (c.turnos || []).filter(isCompletedSession);
      if (turnosRealizadosCliente.length > 0) {
        const lastRealizado = turnosRealizadosCliente[0]; // ordenado desc
        if (lastRealizado.subEstado === 'VA_A_AVISAR' && !hasFutureActiveTurno(c, lastRealizado.fecha)) {
          const item = formatTurnoItem(
            { ...lastRealizado, cliente: c },
            { esSeguimiento: true, ultimoEstadoLabel: 'Va a avisar' }
          );
          itemsVaAAvisar.push(item);
          totalPerdidaVaAAvisar += item.valorTotal;
        }
      }
    });

    // 7. Clientes "Mantenimiento" (Se toma el valor del último turno realizado sin descontar su seña)
    const itemsMantenimiento = [];
    let totalValorMantenimiento = 0;
    allClients.forEach(c => {
      const turnosRealizadosCliente = (c.turnos || []).filter(isCompletedSession);
      if (turnosRealizadosCliente.length > 0) {
        const lastRealizado = turnosRealizadosCliente[0];
        if (lastRealizado.subEstado === 'MANTENIMIENTO' && !hasFutureActiveTurno(c, lastRealizado.fecha)) {
          const item = formatTurnoItem(
            { ...lastRealizado, cliente: c },
            { esSeguimiento: true, ultimoEstadoLabel: 'Mantenimiento' }
          );
          itemsMantenimiento.push(item);
          totalValorMantenimiento += item.valorTotal;
        }
      }
    });

    // 8. Clientes "Finalizó" (Clientes cuyo tratamiento fue marcado como finalizado; valor de última sesión)
    const itemsFinalizo = [];
    let totalValorFinalizo = 0;
    allClients.forEach(c => {
      const turnosRealizadosCliente = (c.turnos || []).filter(isCompletedSession);
      if (turnosRealizadosCliente.length > 0) {
        const lastRealizado = turnosRealizadosCliente[0];
        if (lastRealizado.subEstado === 'FINALIZADO' && !hasFutureActiveTurno(c, lastRealizado.fecha)) {
          const item = formatTurnoItem(
            { ...lastRealizado, cliente: c },
            { esSeguimiento: true, ultimoEstadoLabel: 'Finalizó' }
          );
          itemsFinalizo.push(item);
          totalValorFinalizo += item.valorTotal;
        }
      }
    });

    // 9. Clientes Nuevos en el período
    // Se contabilizan tanto los clientes agendados sin sesiones realizadas (0 sesiones)
    // como los que realizaron su primera sesión dentro del período (1 sesión)
    const clientesNuevosMap = new Map();
    turnosPeriodo.forEach(t => {
      if (t.estado === 'CANCELADO' || t.estado === 'NO_ASISTIO') return;
      const cl = t.cliente;
      if (!cl) return;
      const fullClient = allClients.find(c => c.id === cl.id) || cl;
      const previas = Number(fullClient.sesionesPrevias || 0);
      if (previas > 0) return;

      const allClientTurnos = fullClient.turnos || [];
      const completedTurnos = [...allClientTurnos]
        .filter(isCompletedSession)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      // Caso A: Cliente agendado con 0 sesiones realizadas en total
      const isZeroSessionsBooked = completedTurnos.length === 0;
      // Caso B: Cliente cuya 1ra sesión realizada ocurre dentro del período (es este turno)
      const isFirstCompletedInPeriod = completedTurnos.length >= 1 && completedTurnos[0].id === t.id;

      if ((isZeroSessionsBooked || isFirstCompletedInPeriod) && !clientesNuevosMap.has(cl.id)) {
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
    const itemsOperador = turnosPeriodo.map(t => formatTurnoItem(t));
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
      // 12 Categorías de Estadísticas Avanzadas
      avanzadas: {
        realizados: {
          count: itemsRealizados.length,
          total: totalRealizados,
          ticketPromedio: ticketPromedioRealizados,
          items: itemsRealizados
        },
        gananciaNeta: {
          count: itemsGananciaNeta.length,
          total: totalGananciaNeta,
          ticketPromedio: ticketPromedioGananciaNeta,
          entradasTurnos: entradasTurnosPeriodo,
          entradasSenas: entradasSenasPeriodo,
          desglose: {
            turnosNuevos: montoTurnosNuevos,
            turnosSiguientes: montoTurnosSiguientes,
            turnosSinSiguiente: montoTurnosSinSiguiente
          },
          items: itemsGananciaNeta
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
