import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  } else if (t.estado === 'CANCELADO') {
    ultimoEstadoLabel = 'Cancelado';
  } else if (t.estado === 'NO_ASISTIO') {
    ultimoEstadoLabel = 'Ausente';
  } else if (t.subEstado === 'VA_A_AVISAR') {
    ultimoEstadoLabel = 'Va a avisar';
  } else if (t.subEstado === 'MANTENIMIENTO') {
    ultimoEstadoLabel = 'Mantenimiento';
  } else if (t.subEstado === 'FINALIZADO') {
    ultimoEstadoLabel = 'Finalizó';
  } else if (t.estado === 'REALIZADO') {
    ultimoEstadoLabel = 'Realizado';
  }

  let estadoTurnoLabel = 'Realizado';
  if (extra.subtipoGanancia) {
    if (extra.subtipoGanancia.includes('siguiente') && !extra.subtipoGanancia.includes('sin siguiente')) {
      estadoTurnoLabel = 'Turno siguiente';
    } else if (extra.subtipoGanancia.includes('sin siguiente')) {
      estadoTurnoLabel = 'Realizado (Sin sig. turno)';
    } else if (extra.subtipoGanancia.includes('nuevo')) {
      estadoTurnoLabel = 'Turno nuevo (Señado)';
    }
  } else if (t.subEstado === 'SIGUIENTE_TURNO') {
    estadoTurnoLabel = 'Turno siguiente';
  } else if (t.subEstado === 'VA_A_AVISAR') {
    estadoTurnoLabel = 'Va a avisar';
  } else if (t.subEstado === 'MANTENIMIENTO') {
    estadoTurnoLabel = 'Mantenimiento';
  } else if (t.subEstado === 'FINALIZADO') {
    estadoTurnoLabel = 'Finalizó';
  } else if (t.estado === 'SEÑADO') {
    estadoTurnoLabel = 'Señado';
  } else if (t.estado === 'REPROGRAMADO') {
    estadoTurnoLabel = 'Reprogramado';
  } else if (t.estado === 'PENDIENTE_AUTORIZACION') {
    estadoTurnoLabel = 'Pendiente aut.';
  } else if (t.estado === 'CANCELADO') {
    estadoTurnoLabel = 'Cancelado';
  } else if (t.estado === 'NO_ASISTIO') {
    estadoTurnoLabel = 'Ausente';
  } else if (t.estado === 'REALIZADO') {
    if (extra.hasFutureTurno) {
      estadoTurnoLabel = 'Turno siguiente';
    } else {
      estadoTurnoLabel = 'Realizado';
    }
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
    ingresoCobradoPeriodo: extra.ingresoCobradoPeriodo !== undefined ? Number(extra.ingresoCobradoPeriodo) : (extra.overrideValorTotal !== undefined ? Number(extra.overrideValorTotal) : valorTotal),
    señaCobradaPeriodo: extra.señaCobradaPeriodo !== undefined ? Number(extra.señaCobradaPeriodo) : 0,
    saldoCobradoPeriodo: extra.saldoCobradoPeriodo !== undefined ? Number(extra.saldoCobradoPeriodo) : 0,
    estado: t.estado,
    subEstado: t.subEstado || null,
    señaEstado: t.señaEstado || null,
    ultimoEstadoLabel,
    estadoTurnoLabel,
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
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const currentHourMin = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    const [currentYear, currentMonth] = todayStr.split('-').map(Number);

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let startPeriodStr, endPeriodStr;
    let year, month;

    if (startParam && endParam) {
      startPeriodStr = startParam;
      endPeriodStr = endParam;
      const parts = startParam.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      year = yearParam ? parseInt(yearParam, 10) : currentYear;
      month = monthParam ? parseInt(monthParam, 10) : currentMonth;
      const monthStr = String(month).padStart(2, '0');
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const lastDayStr = String(lastDayOfMonth).padStart(2, '0');
      startPeriodStr = `${year}-${monthStr}-01`;
      endPeriodStr = `${year}-${monthStr}-${lastDayStr}`;
    }

    // 1. Rango para 'fecha' (almacenado como fecha normalizada a las 00:00:00.000Z en PostgreSQL)
    const startFechaPeriodo = new Date(`${startPeriodStr}T00:00:00.000Z`);
    const endFechaPeriodo = new Date(`${endPeriodStr}T23:59:59.999Z`);

    // 2. Rango para 'createdAt' (timestamps reales UTC en zona horaria Argentina UTC-3)
    // El día en Argentina arranca a las 00:00:00-03:00 (03:00:00Z) y cierra a las 23:59:59.999-03:00 (02:59:59.999Z del día siguiente)
    // Esto evita que turnos agendados o realizados después de las 21:00 hs (00:00 UTC) se salten al día siguiente
    const startCreatedPeriodo = new Date(`${startPeriodStr}T00:00:00.000-03:00`);
    const endCreatedPeriodo = new Date(`${endPeriodStr}T23:59:59.999-03:00`);

    // Rangos para 'Hoy' (Argentina)
    const startFechaToday = new Date(`${todayStr}T00:00:00.000Z`);
    const endFechaToday = new Date(`${todayStr}T23:59:59.999Z`);
    const startCreatedToday = new Date(`${todayStr}T00:00:00.000-03:00`);
    const endCreatedToday = new Date(`${todayStr}T23:59:59.999-03:00`);

    // Rangos para 'Esta Semana' (Lunes a Domingo en Argentina)
    const [y, m, d] = todayStr.split('-').map(Number);
    const todayDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = todayDateObj.getUTCDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const mondayObj = new Date(todayDateObj);
    mondayObj.setUTCDate(todayDateObj.getUTCDate() + diffToMonday);
    const mondayStr = mondayObj.toISOString().split('T')[0];
    const sundayObj = new Date(mondayObj);
    sundayObj.setUTCDate(mondayObj.getUTCDate() + 6);
    const sundayStr = sundayObj.toISOString().split('T')[0];

    const startFechaSemana = new Date(`${mondayStr}T00:00:00.000Z`);
    const endFechaSemana = new Date(`${sundayStr}T23:59:59.999Z`);
    const startCreatedSemana = new Date(`${mondayStr}T00:00:00.000-03:00`);
    const endCreatedSemana = new Date(`${sundayStr}T23:59:59.999-03:00`);

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
        where: { fecha: { gte: startFechaPeriodo, lte: endFechaPeriodo } },
        include: { cliente: true, operador: true },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startCreatedPeriodo, lte: endCreatedPeriodo } },
        include: { cliente: true, operador: true },
        orderBy: [{ createdAt: 'asc' }]
      }),
      prisma.turno.findMany({
        where: { fecha: { gte: startFechaToday, lte: endFechaToday } },
        include: { cliente: true, operador: true }
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startCreatedToday, lte: endCreatedToday } },
        include: { cliente: true, operador: true }
      }),
      prisma.turno.findMany({
        where: { fecha: { gte: startFechaSemana, lte: endFechaSemana } },
        include: { cliente: true, operador: true }
      }),
      prisma.turno.findMany({
        where: { createdAt: { gte: startCreatedSemana, lte: endCreatedSemana } },
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
      if (!t || t.estado === 'CANCELADO' || t.estado === 'NO_ASISTIO' || t.estado === 'BLOQUEADO') {
        return false;
      }
      return t.estado === 'REALIZADO';
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

    // Helper: verificar si un cliente tiene un turno activo/señado posterior a su última sesión realizada
    const hasFutureActiveTurno = (c, lastRealizadoFecha) => {
      if (!c) return false;
      const lastTime = new Date(lastRealizadoFecha).getTime();
      return (c.turnos || []).some(t => {
        if (!['SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION'].includes(t.estado)) return false;
        return new Date(t.fecha).getTime() > lastTime;
      });
    };

    // 1. Turnos Realizados (Solo el valor de las sesiones realizadas en el período)
    const itemsRealizados = turnosPeriodo.filter(t => isCompletedSession(t)).map(t => {
      const fullClient = t.clienteId ? allClients.find(c => c.id === t.clienteId) : null;
      const hasFutureTurno = t.subEstado === 'SIGUIENTE_TURNO' || hasFutureActiveTurno(fullClient || t.cliente, t.fecha);
      return formatTurnoItem(t, { hasFutureTurno });
    });
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
            ingresoCobradoPeriodo: ingresoTotalFila,
            señaCobradaPeriodo: senaSiguiente + senaPropiaEnPeriodo,
            saldoCobradoPeriodo: saldo,
            subtipoGanancia: `Turno siguiente (Saldo $${saldo.toLocaleString('es-AR')} + Seña próx. $${senaSiguiente.toLocaleString('es-AR')})`
          })
        );
      } else {
        const senaPropiaEnPeriodo = fueCreadoEnPeriodo ? vSena : 0;
        const ingresoTotalFila = saldo + senaPropiaEnPeriodo;
        montoTurnosSinSiguiente += ingresoTotalFila;

        itemsGananciaNeta.push(
          formatTurnoItem(t, {
            ingresoCobradoPeriodo: ingresoTotalFila,
            señaCobradaPeriodo: senaPropiaEnPeriodo,
            saldoCobradoPeriodo: saldo,
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
            ingresoCobradoPeriodo: vSena,
            señaCobradaPeriodo: vSena,
            saldoCobradoPeriodo: 0,
            subtipoGanancia: 'Turno nuevo (Seña cobrada en el período)'
          })
        );
      });

    const totalGananciaNeta = montoTurnosNuevos + montoTurnosSiguientes + montoTurnosSinSiguiente;
    const ticketPromedioGananciaNeta = itemsGananciaNeta.length > 0 ? Math.round(totalGananciaNeta / itemsGananciaNeta.length) : 0;

    // 2. Turnos Señados / Confirmados (Solo turnos que están en estado SEÑADO / REPROGRAMADO / PENDIENTE_AUTORIZACION y aún NO fueron realizados)
    const itemsSenados = turnosPeriodo
      .filter(t => !isCompletedSession(t) && ['SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION'].includes(t.estado))
      .map(t => formatTurnoItem(t));
    const totalSenados = itemsSenados.reduce((acc, item) => acc + (item.valorSeña || 0), 0);
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
    // 12. CUMPLEAÑOS DE CLIENTES EN EL PERÍODO
    // ==========================================
    const itemsCumpleanos = [];
    const MESES_NOMBRES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const [startYearPeriod, startMonthPeriod, startDayPeriod] = startPeriodStr.split('-').map(Number);
    const [endYearPeriod, endMonthPeriod, endDayPeriod] = endPeriodStr.split('-').map(Number);

    allClients.forEach(c => {
      if (!c.fechaNacimiento) return;
      const bDate = new Date(c.fechaNacimiento);
      if (isNaN(bDate.getTime())) return;

      const birthMonth = bDate.getUTCMonth() + 1; // 1-12
      const birthDay = bDate.getUTCDate();       // 1-31
      const birthYear = bDate.getUTCFullYear();

      // Verificar si el cumpleaños cae dentro del rango de fechas del período
      for (let y = startYearPeriod; y <= endYearPeriod; y++) {
        let safeDay = birthDay;
        if (birthMonth === 2 && birthDay === 29) {
          const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
          if (!isLeap) safeDay = 28;
        }

        const mStr = String(birthMonth).padStart(2, '0');
        const dStr = String(safeDay).padStart(2, '0');
        const candidateDateStr = `${y}-${mStr}-${dStr}`;

        if (candidateDateStr >= startPeriodStr && candidateDateStr <= endPeriodStr) {
          let edad = null;
          if (birthYear > 1900 && birthYear !== 2000) {
            edad = y - birthYear;
          }

          const mesNombre = MESES_NOMBRES[birthMonth - 1] || '';
          const fechaCumpleDisplay = `${safeDay} de ${mesNombre}`;
          const diaMesCompact = `${String(safeDay).padStart(2, '0')}/${mStr}`;

          itemsCumpleanos.push({
            id: `cumple-${c.id}-${y}`,
            clienteId: c.id,
            clienteNombre: c.nombreCompleto || 'Cliente',
            whatsapp: c.whatsapp || '',
            email: c.email || '',
            fechaNacimiento: c.fechaNacimiento,
            fechaCumpleanosPeriodo: candidateDateStr,
            fechaCumpleanosDisplay: fechaCumpleDisplay,
            diaMesCompact,
            diaCumple: safeDay,
            mesCumple: mesNombre,
            edad,
            canalAdquisicion: c.canalAdquisicion || 'ORGANICO',
            estado: c.estado || 'ACTIVO',
            notifEmail: Boolean(c.notifEmail && c.enviarNotificaciones),
            notifWhatsapp: Boolean(c.notifWhatsapp && c.enviarNotificaciones),
            turnosCount: (c.turnos || []).length,
            // Campos de compatibilidad con grilla y tarjetas
            fecha: candidateDateStr,
            horaInicio: '00:00',
            valorTotal: 0,
            valorSeña: 0,
            saldoPendiente: 0,
            zonasTexto: `Cumpleaños: ${fechaCumpleDisplay}`,
            estadoTurnoLabel: `🎂 Cumple ${diaMesCompact}`,
            ultimoEstadoLabel: c.estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
            operadorNombre: 'Gonzalo'
          });
          break;
        }
      }
    });

    // Ordenar cronológicamente por día de cumpleaños dentro del período
    itemsCumpleanos.sort((a, b) => a.fechaCumpleanosPeriodo.localeCompare(b.fechaCumpleanosPeriodo));

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
        start: startPeriodStr,
        end: endPeriodStr,
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
        operador: operadorData,
        cumpleanos: {
          count: itemsCumpleanos.length,
          items: itemsCumpleanos
        }
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json({ error: 'Error interno al generar estadísticas' }, { status: 500 });
  }
}
