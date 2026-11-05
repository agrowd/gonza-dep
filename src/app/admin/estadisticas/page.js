'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './estadisticas.module.css';

// ==========================================
// DEFINICIÓN DE MÉTRICAS DEL DESPLEGABLE
// ==========================================
const METRIC_DEFINITIONS = [
  {
    id: 'consolidado_mensual',
    label: '📊 Consolidado Mensual (Informe Ejecutivo y PDF 13 Meses)',
    valueLabel: 'Mes Seleccionado',
    isDanger: false,
    hasAvg: false,
    excelModel: null,
    description: 'Informe mensual consolidado y evolución histórica de 13 meses con turnos atendidos, facturación bruta, gastos, facturación neta, % de ocupación de agenda, clientes nuevos y bajas. Permite generar y descargar el reporte PDF exacto de 2 páginas.'
  },
  {
    id: 'realizados',
    label: 'Turnos Realizados',
    valueLabel: 'Facturación Realizada',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Sesiones completadas dentro del período seleccionado (suma el valor total de los turnos realizados, sin señas futuras).'
  },
  {
    id: 'gananciaNeta',
    label: 'Ganancia Neta (Ingresos Reales del Período)',
    valueLabel: 'Ganancia Neta Ingresada',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Dinero que realmente ingresa en el período: saldos cobrados en sesiones realizadas + señas abonadas en el período (incluyendo próximos turnos y turnos nuevos).'
  },
  {
    id: 'senados',
    label: 'Turnos Señados / Confirmados',
    valueLabel: 'Total de Señas (Turnos Señados)',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Turnos agendados en estado Señado, Reprogramado o Pendiente que aún no fueron realizados.'
  },
  {
    id: 'cancelados',
    label: 'Turnos Cancelados (Pérdidas)',
    valueLabel: 'Pérdida por Cancelaciones',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Turnos cancelados en el período. Se descuenta la seña si quedó retenida; si la seña se guardó para otro turno, se toma el valor completo.'
  },
  {
    id: 'ausentes',
    label: 'Turnos Ausentes (No asistió)',
    valueLabel: 'Pérdida por Inasistencias',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes que no asistieron a su turno. Se calcula el valor del turno menos la seña retenida.'
  },
  {
    id: 'vaAAvisar',
    label: 'Clientes en "Va a avisar"',
    valueLabel: 'Oportunidad Pendiente (Última Sesión)',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes que actualmente están en estado "Va a avisar" y aún no agendaron un nuevo turno (valor completo de su última sesión).'
  },
  {
    id: 'mantenimiento',
    label: 'Clientes en "Mantenimiento"',
    valueLabel: 'Valor Referencia (Última Sesión)',
    isDanger: false,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes actualmente en etapa de sesiones de mantenimiento periódico (se toma el valor completo de su última sesión realizada).'
  },
  {
    id: 'finalizo',
    label: 'Clientes que "Finalizaron Tratamiento"',
    valueLabel: 'Valor Referencia (Última Sesión)',
    isDanger: false,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes cuyo tratamiento fue marcado como finalizado (se toma el valor completo de su última sesión realizada).'
  },
  {
    id: 'nuevos',
    label: 'Clientes Nuevos en el Período',
    valueLabel: 'Facturación de Clientes Nuevos',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Contabiliza tanto los clientes agendados sin sesiones previas (0 sesiones) como los que realizaron su primera sesión en el período (1 sesión).'
  },
  {
    id: 'sinMarcar',
    label: 'Turnos Sin Marcar (Pasados de hora)',
    valueLabel: 'Monto Pendiente de Cierre',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Turnos cuya fecha y horario ya pasaron pero continúan abiertos sin marcar como Realizado o Ausente.'
  },
  {
    id: 'zonas',
    label: 'Zonas Más Demandadas (Histograma y Filtros)',
    valueLabel: 'Facturación de Zonas Seleccionadas',
    isDanger: false,
    hasAvg: true,
    excelModel: null,
    description: 'Análisis detallado por zona corporal, frecuencia de aplicación e ingresos.'
  },
  {
    id: 'cumpleanos',
    label: 'Clientes que Cumplen Años en el Período',
    valueLabel: 'Total Cumpleañeros',
    isDanger: false,
    hasAvg: false,
    excelModel: 'C',
    description: 'Clientes registrados que cumplen años dentro del rango de fechas seleccionado (según día y mes de nacimiento).'
  }
];

const CANAL_LABELS = {
  ORGANICO: '🌱 Orgánico',
  PUBLICIDAD_IG: '📸 Publicidad Instagram',
  PUBLICIDAD_FB: '📘 Publicidad Facebook',
  GOOGLE: '🔍 Google / Web',
  RECOMENDACION: '🗣️ Recomendación',
  OTRO: '✨ Otro'
};

// Iconos SVG
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

function getLocalTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function EstadisticasPage() {
  const router = useRouter();

  // Rango de fechas (por defecto: mes actual)
  const defaultRange = useMemo(() => getMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  // Estado de carga y datos del backend
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selector de métrica
  const [selectedMetric, setSelectedMetric] = useState('realizados');

  // Exclusiones dinámicas (botón X para recalcular en vivo)
  const [excludedIds, setExcludedIds] = useState(new Set());

  // Filtros multi-selección para Zonas y Canales
  const [selectedZonesFilter, setSelectedZonesFilter] = useState([]);
  const [selectedCanalesFilter, setSelectedCanalesFilter] = useState([]);

  // Consolidado Mensual State (D-157)
  const [selectedConsolidadoMonth, setSelectedConsolidadoMonth] = useState(() => {
    const nowBA = new Date(Date.now() - 3 * 3600 * 1000);
    return `${nowBA.getUTCFullYear()}-${String(nowBA.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  const [consolidadoData, setConsolidadoData] = useState(null);
  const [loadingConsolidado, setLoadingConsolidado] = useState(false);

  const fetchConsolidado = useCallback(async () => {
    if (!selectedConsolidadoMonth) return;
    setLoadingConsolidado(true);
    try {
      const res = await fetch(`/api/admin/estadisticas/consolidado-mensual?mes=${selectedConsolidadoMonth}&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setConsolidadoData(json);
      }
    } catch (err) {
      console.error('Error fetching consolidado:', err);
    } finally {
      setLoadingConsolidado(false);
    }
  }, [selectedConsolidadoMonth]);

  useEffect(() => {
    if (selectedMetric === 'consolidado_mensual') {
      fetchConsolidado();
    }
  }, [selectedMetric, selectedConsolidadoMonth, fetchConsolidado]);


  // Modales: Ficha de Cliente, Listado Ampliado y Vista/Descarga Excel
  const [modalClient, setModalClient] = useState(null);
  const [loadingClientModal, setLoadingClientModal] = useState(false);
  const [expandedListModalOpen, setExpandedListModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);

  // Cargar estadísticas al cambiar fechas
  const fetchEstadisticas = useCallback(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    fetch(`/api/admin/estadisticas?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
      cache: 'no-store'
    })
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          setData(json);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando estadísticas:', err);
        setLoading(false);
      });
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEstadisticas();
  }, [fetchEstadisticas]);

  // Limpiar exclusiones y subfiltros cuando se cambia de métrica
  const handleMetricChange = (newMetric) => {
    setSelectedMetric(newMetric);
    setExcludedIds(new Set());
    setSelectedZonesFilter([]);
    setSelectedCanalesFilter([]);
  };

  const toggleExcludeId = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetExclusions = () => {
    setExcludedIds(new Set());
  };

  const toggleZoneFilter = (zoneName) => {
    setSelectedZonesFilter(prev =>
      prev.includes(zoneName) ? prev.filter(z => z !== zoneName) : [...prev, zoneName]
    );
  };

  const toggleCanalFilter = (canalKey) => {
    setSelectedCanalesFilter(prev =>
      prev.includes(canalKey) ? prev.filter(c => c !== canalKey) : [...prev, canalKey]
    );
  };

  // Abrir modal de ficha de cliente
  const handleOpenFicha = async (clienteId) => {
    if (!clienteId) return;
    setLoadingClientModal(true);
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}`);
      const cl = await res.json();
      if (cl && !cl.error) {
        setModalClient(cl);
      }
    } catch (e) {
      console.error('Error abriendo ficha de cliente:', e);
    } finally {
      setLoadingClientModal(false);
    }
  };

  // Navegar al turno exacto en la agenda (Día y hora del turno)
  const handleGoToTurno = (item) => {
    if (!item || !item.fecha) return;
    const targetId = item.turnoOriginalId || item.id;
    router.push(`/admin/agenda?date=${item.fecha}&view=day&turnoId=${targetId}&fromStats=true`);
  };

  const formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-AR')}`;

  const formatDateDisplay = (yyyyMmDd) => {
    if (!yyyyMmDd) return '-';
    const parts = yyyyMmDd.split('-');
    if (parts.length !== 3) return yyyyMmDd;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getEstadoTurnoLabel = (item) => {
    if (!item) return '-';
    if (item.estadoTurnoLabel) return item.estadoTurnoLabel;
    if (item.subtipoGanancia) {
      if (item.subtipoGanancia.includes('siguiente') && !item.subtipoGanancia.includes('sin siguiente')) {
        return 'Turno siguiente';
      }
      if (item.subtipoGanancia.includes('sin siguiente')) {
        return 'Realizado (Sin sig. turno)';
      }
      if (item.subtipoGanancia.includes('nuevo')) {
        return 'Turno nuevo (Señado)';
      }
    }
    if (item.subEstado === 'SIGUIENTE_TURNO') return 'Turno siguiente';
    if (item.subEstado === 'VA_A_AVISAR') return 'Va a avisar';
    if (item.subEstado === 'MANTENIMIENTO') return 'Mantenimiento';
    if (item.subEstado === 'FINALIZADO') return 'Finalizó';
    if (item.estado === 'SEÑADO') return 'Señado';
    if (item.estado === 'REPROGRAMADO') return 'Reprogramado';
    if (item.estado === 'PENDIENTE_AUTORIZACION') return 'Pendiente aut.';
    if (item.estado === 'CANCELADO') return 'Cancelado';
    if (item.estado === 'NO_ASISTIO') return 'Ausente';
    if (item.estado === 'REALIZADO') return 'Realizado';
    return item.ultimoEstadoLabel || item.estado || '-';
  };

  // ==========================================
  // CÁLCULO DINÁMICO DE ITEMS Y TOTALES (CON EXCLUSIÓN 'X' Y FILTROS)
  // ==========================================
  const currentMetricDef = useMemo(
    () => METRIC_DEFINITIONS.find(m => m.id === selectedMetric) || METRIC_DEFINITIONS[0],
    [selectedMetric]
  );

  const activeMetricData = useMemo(() => {
    if (!data || !data.avanzadas) {
      return { rawItems: [], filteredItems: [], count: 0, totalMoney: 0, avgTicket: 0 };
    }

    const av = data.avanzadas;
    let rawItems = [];

    if (selectedMetric === 'zonas') {
      const seenTurnoIds = new Set();
      const hist = (av.zonas?.histograma || []).filter(z => !z.nombre.toLowerCase().startsWith('otros'));
      hist.forEach(zGroup => {
        if (selectedZonesFilter.length > 0 && !selectedZonesFilter.includes(zGroup.nombre)) {
          return;
        }
        (zGroup.items || []).forEach(item => {
          if (!seenTurnoIds.has(item.id)) {
            seenTurnoIds.add(item.id);
            rawItems.push(item);
          }
        });
      });
    } else if (selectedMetric === 'nuevos') {
      const baseItems = av.nuevos?.items || [];
      rawItems = selectedCanalesFilter.length > 0
        ? baseItems.filter(i => selectedCanalesFilter.includes(i.canalAdquisicion || 'ORGANICO'))
        : baseItems;
    } else if (selectedMetric === 'cumpleanos') {
      rawItems = av.cumpleanos?.items || [];
    } else {
      rawItems = av[selectedMetric]?.items || [];
    }

    // Filtrar los excluidos con el botón 'X'
    const filteredItems = rawItems.filter(item => !excludedIds.has(item.id));

    // Recalcular monto según la naturaleza de la métrica
    let totalMoney = 0;
    filteredItems.forEach(item => {
      if (selectedMetric === 'cancelados' || selectedMetric === 'ausentes') {
        totalMoney += Number(item.oportunidadNoConcretada ?? item.valorTotal ?? 0);
      } else if (selectedMetric === 'gananciaNeta') {
        totalMoney += Number(item.ingresoCobradoPeriodo ?? item.valorTotal ?? 0);
      } else if (selectedMetric === 'senados') {
        totalMoney += Number(item.valorSeña || 0);
      } else {
        totalMoney += Number(item.valorTotal || 0);
      }
    });

    const count = filteredItems.length;
    const avgTicket = count > 0 ? Math.round(totalMoney / count) : 0;

    return {
      rawItems,
      filteredItems,
      count,
      totalMoney,
      avgTicket
    };
  }, [data, selectedMetric, excludedIds, selectedZonesFilter, selectedCanalesFilter]);

  // ==========================================
  // CÁLCULO DE RESÚMENES PARA EL INFORME EXCEL (MODELOS A y B)
  // ==========================================
  const excelSummary = useMemo(() => {
    const items = activeMetricData.filteredItems || [];
    const model = currentMetricDef.excelModel;

    if (model === 'A') {
      const uniqueClientIds = new Set();
      const clientOriginMap = new Map();

      let valorTotalTurnos = 0;
      let totalSenasAplicadas = 0;
      let totalSaldos = 0;
      let valorEfectivo = 0;
      let valorTransferencia = 0;

      const isGN = selectedMetric === 'gananciaNeta';

      items.forEach(item => {
        if (item.clienteId) {
          uniqueClientIds.add(item.clienteId);
          if (!clientOriginMap.has(item.clienteId)) {
            clientOriginMap.set(item.clienteId, item.origenCategoria || 'Orgánico');
          }
        }
        const vFinal = isGN
          ? Number(item.ingresoCobradoPeriodo ?? item.valorTotal ?? 0)
          : Number(item.valorTotal || 0);
        const vSena = isGN
          ? Number(item.señaCobradaPeriodo ?? 0)
          : Number(item.valorSeña || 0);
        const vSaldo = isGN
          ? Number(item.saldoCobradoPeriodo ?? Math.max(0, vFinal - vSena))
          : Number(item.saldoPendiente ?? Math.max(0, vFinal - vSena));

        valorTotalTurnos += vFinal;
        totalSenasAplicadas += vSena;
        totalSaldos += vSaldo;

        if (item.metodoPago === 'EFECTIVO' || item.metodoPagoLabel === 'Efectivo') {
          valorEfectivo += vFinal;
        } else {
          valorTransferencia += vFinal;
        }
      });

      let clientesOrganico = 0;
      let clientesRedes = 0;
      let clientesPublicidad = 0;
      clientOriginMap.forEach((orig) => {
        if (orig === 'Publicidad') clientesPublicidad++;
        else if (orig === 'Redes sociales') clientesRedes++;
        else clientesOrganico++;
      });

      const cantClientesUnicos = uniqueClientIds.size || items.length;
      const ticketPromedioCliente = cantClientesUnicos > 0 ? Math.round(valorTotalTurnos / cantClientesUnicos) : 0;

      return {
        model: 'A',
        title: selectedMetric === 'gananciaNeta'
          ? 'INFORME DE GANANCIA NETA (INGRESOS REALES DEL PERÍODO)'
          : selectedMetric === 'senados'
            ? 'INFORME DE TURNOS SEÑADOS Y CONFIRMADOS'
            : selectedMetric === 'nuevos'
              ? 'INFORME DE CLIENTES NUEVOS EN EL PERÍODO'
              : 'INFORME DE CLIENTES Y TURNOS REALIZADOS',
        cantidadTurnos: items.length,
        cantidadClientesUnicos: cantClientesUnicos,
        clientesOrganico,
        clientesRedes,
        clientesPublicidad,
        valorTotalTurnos,
        totalSenasAplicadas,
        totalSaldos,
        valorEfectivo,
        valorTransferencia,
        ticketPromedioCliente
      };
    }

    if (currentMetricDef.excelModel === 'C' || selectedMetric === 'cumpleanos') {
      let conEmail = 0;
      let conWpp = 0;
      items.forEach(item => {
        if (item.notifEmail) conEmail++;
        if (item.whatsapp) conWpp++;
      });
      return {
        model: 'C',
        title: 'INFORME DE CUMPLEAÑOS DE CLIENTES EN EL PERÍODO',
        cantidadCumpleaneros: items.length,
        conEmail,
        conWpp
      };
    }

    // Modelo B: Cancelaciones y Seguimiento
    let clientesAusentes = 0;
    let clientesVaAAvisar = 0;
    let clientesCancelados = 0;
    let clientesMantenimiento = 0;
    let clientesFinalizados = 0;

    let valorReferenciaTotal = 0;
    let totalSenasRetenidas = 0;
    let oportunidadTotalNoConcretada = 0;

    items.forEach(item => {
      const est = item.ultimoEstadoLabel || '';
      if (est === 'Ausente' || item.estado === 'NO_ASISTIO') clientesAusentes++;
      else if (est === 'Va a avisar' || item.subEstado === 'VA_A_AVISAR') clientesVaAAvisar++;
      else if (est === 'Cancelado' || item.estado === 'CANCELADO') clientesCancelados++;
      else if (est === 'Mantenimiento' || item.subEstado === 'MANTENIMIENTO') clientesMantenimiento++;
      else if (est === 'Finalizó' || item.subEstado === 'FINALIZADO') clientesFinalizados++;

      const val = Number(item.valorTotal || 0);
      const ret = Number(item.señaRetenida || 0);
      const opNoConc = Number(item.oportunidadNoConcretada ?? Math.max(0, val - ret));

      valorReferenciaTotal += val;
      totalSenasRetenidas += ret;
      oportunidadTotalNoConcretada += opNoConc;
    });

    return {
      model: 'B',
      title: 'INFORME DE CANCELACIONES Y SEGUIMIENTO',
      cantidadClientes: items.length,
      clientesAusentes,
      clientesVaAAvisar,
      clientesCancelados,
      clientesMantenimiento,
      clientesFinalizados,
      valorReferenciaTotal,
      totalSenasRetenidas,
      oportunidadTotalNoConcretada
    };
  }, [activeMetricData.filteredItems, currentMetricDef, selectedMetric]);

  // ==========================================
  // DESCARGA DE ARCHIVO EXCEL (.XLSX REAL OPENXML COMPATIBLE CON CELULARES Y PC)
  // ==========================================
  const handleDownloadExcel = () => {
    const items = activeMetricData.filteredItems || [];
    const payload = {
      startDate,
      endDate,
      selectedMetric,
      summary: excelSummary,
      items
    };

    // Usamos envío de formulario nativo POST para que Android / iOS / WhatsApp Browser
    // y navegadores de escritorio descarguen el binario .xlsx directamente sin bloqueos de Blob URL.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/admin/estadisticas/exportar-excel';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(payload);

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 2000);
  };

  // Renderizado reutilizable de la tabla de registros (para la vista normal y el modal ampliado)
  const renderTurnosTable = () => {
    if (activeMetricData.filteredItems.length === 0) {
      return (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
          No se encontraron registros para esta métrica en el período seleccionado ({formatDateDisplay(startDate)} al {formatDateDisplay(endDate)}).
        </div>
      );
    }

    return (
      <>
        {/* VISTA ESCRITORIO (Tabla horizontal) */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            {selectedMetric === 'cumpleanos' ? (
              <thead>
                <tr>
                  <th className={styles.th}>Acciones</th>
                  <th className={styles.th}>🎂 Fecha Cumpleaños</th>
                  <th className={styles.th}>Cliente</th>
                  <th className={styles.th}>Edad</th>
                  <th className={styles.th}>WhatsApp</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Notificación de Saludo</th>
                  <th className={styles.th}>Canal / Estado</th>
                </tr>
              </thead>
            ) : (
              <thead>
                <tr>
                  <th className={styles.th}>Acciones</th>
                  <th className={styles.th}>Fecha y Hora</th>
                  <th className={styles.th}>Cliente</th>
                  <th className={styles.th}>Zonas</th>
                  <th className={styles.th}>Estado</th>
                  <th className={styles.th}>Pago / Operador</th>
                  <th className={styles.th}>
                    {selectedMetric === 'gananciaNeta' ? 'Ingreso Real' : 'Valor Turno'}
                  </th>
                  <th className={styles.th}>
                    {selectedMetric === 'gananciaNeta' ? 'Seña / Saldo' : 'Seña / Saldo'}
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              {activeMetricData.filteredItems.map(item => {
                if (selectedMetric === 'cumpleanos') {
                  const cleanWpp = (item.whatsapp || '').replace(/\D/g, '');
                  const wppLink = cleanWpp ? `https://wa.me/${cleanWpp}` : null;
                  return (
                    <tr key={item.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.btnActionX}
                            title="Excluir del cálculo"
                            onClick={() => toggleExcludeId(item.id)}
                          >
                            ✕
                          </button>
                          <button
                            type="button"
                            className={styles.btnActionFicha}
                            title="Ver ficha clínica del cliente"
                            onClick={() => handleOpenFicha(item.clienteId)}
                          >
                            <UserIcon /> Ficha
                          </button>
                          {wppLink && (
                            <a
                              href={wppLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.btnActionTurno}
                              style={{ textDecoration: 'none', background: '#15803d', borderColor: '#15803d', color: '#fff' }}
                              title="Abrir chat de WhatsApp"
                            >
                              💬 Wpp
                            </a>
                          )}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 800, color: '#7a1f1e', fontSize: '0.98rem' }}>
                          🎂 {item.fechaCumpleanosDisplay}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                          Día {item.diaCumple} de {item.mesCumple}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 800, color: '#1d1d1d' }}>{item.clienteNombre}</div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                          {item.turnosCount || 0} turnos históricos
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 700, color: '#1d1d1d' }}>
                          {item.edad ? `${item.edad} años` : '-'}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 700, color: '#1d1d1d', fontSize: '0.86rem' }}>
                          📱 {item.whatsapp || 'Sin WhatsApp'}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 600, color: '#1d1d1d', fontSize: '0.84rem' }}>
                          ✉️ {item.email || 'Sin Email'}
                        </div>
                      </td>
                      <td className={styles.td}>
                        {item.notifEmail ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#dcfce7',
                            color: '#15803d'
                          }}>
                            ✓ Email Activo
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#fee2e2',
                            color: '#b91c1c'
                          }}>
                            ✕ Email Apagado
                          </span>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Envío auto. 10:00 AM
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 700, color: '#1d1d1d', fontSize: '0.82rem' }}>
                          {CANAL_LABELS[item.canalAdquisicion] || item.canalAdquisicion || 'Orgánico'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: item.estado === 'ACTIVO' ? '#15803d' : '#64748b', fontWeight: 700 }}>
                          {item.estado === 'ACTIVO' ? '🟢 Activo' : '🔒 Inactivo'}
                        </div>
                      </td>
                    </tr>
                  );
                }

                let badgeClass = styles.statusSenado;
                if (item.estado === 'REALIZADO') badgeClass = styles.statusRealizado;
                else if (item.estado === 'CANCELADO') badgeClass = styles.statusCancelado;
                else if (item.estado === 'NO_ASISTIO') badgeClass = styles.statusNoAsistio;

                return (
                  <tr key={item.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.btnActionX}
                          title="Excluir registro del cálculo actual"
                          onClick={() => toggleExcludeId(item.id)}
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          className={styles.btnActionTurno}
                          title="Ir al día y hora exacta de este turno en la Agenda"
                          onClick={() => handleGoToTurno(item)}
                        >
                          <CalendarIcon /> Turno
                        </button>
                        <button
                          type="button"
                          className={styles.btnActionFicha}
                          title="Ver ficha clínica del cliente sin salir de Estadísticas"
                          onClick={() => handleOpenFicha(item.clienteId)}
                        >
                          <UserIcon /> Ficha
                        </button>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 800, color: '#1d1d1d' }}>{formatDateDisplay(item.fecha)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                        {item.horaInicio} - {item.horaFin}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 800, color: '#1d1d1d' }}>{item.clienteNombre}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                        {item.clienteWhatsapp || 'Sin WhatsApp'} • {item.origenCategoria || 'Orgánico'}
                      </div>
                    </td>
                    <td className={styles.td} style={{ maxWidth: '250px' }}>
                      <div style={{ fontSize: '0.84rem', color: '#1d1d1d', fontWeight: 600, lineHeight: 1.35 }}>
                        {item.zonasTexto}
                      </div>
                      {item.subtipoGanancia && (
                        <div style={{ fontSize: '0.74rem', color: '#7a1f1e', fontWeight: 700, marginTop: '0.2rem' }}>
                          • {item.subtipoGanancia}
                        </div>
                      )}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badgeStatus} ${badgeClass}`}>
                        {item.estado}
                      </span>
                      {item.subEstado && (
                        <span className={`${styles.badgeStatus} ${styles.statusSubEstado}`}>
                          {item.subEstado}
                        </span>
                      )}
                      {item.señaEstado && (
                        <div style={{ fontSize: '0.73rem', color: '#475569', fontWeight: 700, marginTop: '0.25rem' }}>
                          Seña: {item.señaEstado}
                        </div>
                      )}
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 700, color: '#1d1d1d', fontSize: '0.82rem' }}>
                        💳 {item.metodoPagoLabel || 'Transferencia'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                        👤 {item.operadorNombre || 'Gonzalo'}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1d1d1d' }}>
                        {formatMoney(
                          selectedMetric === 'cancelados' || selectedMetric === 'ausentes'
                            ? item.oportunidadNoConcretada
                            : selectedMetric === 'gananciaNeta'
                              ? item.ingresoCobradoPeriodo
                              : item.valorTotal
                        )}
                      </div>
                      {(selectedMetric === 'cancelados' || selectedMetric === 'ausentes') && item.señaRetenida > 0 && (
                        <div style={{ fontSize: '0.73rem', color: '#b91c1c', fontWeight: 700 }}>
                          (Turno {formatMoney(item.valorTotal)} - Seña ret. {formatMoney(item.señaRetenida)})
                        </div>
                      )}
                      {selectedMetric === 'gananciaNeta' && item.subtipoGanancia?.includes('sin siguiente') && (
                        <div style={{ fontSize: '0.73rem', color: '#15803d', fontWeight: 700 }}>
                          (Solo saldo en sesión)
                        </div>
                      )}
                    </td>
                    <td className={styles.td}>
                      {selectedMetric === 'gananciaNeta' ? (
                        <>
                          <div style={{ fontSize: '0.8rem', color: (item.señaCobradaPeriodo || 0) > 0 ? '#15803d' : '#64748b', fontWeight: 700 }}>
                            Seña: {formatMoney(item.señaCobradaPeriodo || 0)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                            Saldo: {formatMoney(item.saldoCobradoPeriodo || 0)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>
                            Seña: {formatMoney(item.valorSeña)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                            Saldo: {formatMoney(item.saldoPendiente)}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* VISTA MÓVIL (Tarjetas oscuras compactas sin scroll horizontal) */}
        <div className={styles.mobileTurnosList}>
          {activeMetricData.filteredItems.map(item => {
            if (selectedMetric === 'cumpleanos') {
              const cleanWpp = (item.whatsapp || '').replace(/\D/g, '');
              const wppLink = cleanWpp ? `https://wa.me/${cleanWpp}` : null;
              return (
                <div key={item.id} className={styles.mobileTurnoCard}>
                  <div className={styles.mobileCardTopRow}>
                    <div className={styles.mobileCardClientName}>
                      {item.clienteNombre}
                    </div>
                    <div className={styles.mobileCardTotalVal} style={{ color: '#d4a54d' }}>
                      🎂 {item.diaMesCompact || item.fechaCumpleanosDisplay}
                    </div>
                  </div>

                  <div className={styles.mobileCardSecondRow}>
                    <div className={styles.mobileCardDateTime}>
                      {item.fechaCumpleanosDisplay}
                    </div>
                    <div className={styles.mobileCardSenaVal} style={{ color: '#93c5fd' }}>
                      {item.edad ? `${item.edad} años` : 'Cumpleaños'}
                    </div>
                  </div>

                  <div className={styles.mobileCardZonas} style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    📱 {item.whatsapp || 'Sin WhatsApp'} &nbsp;•&nbsp; ✉️ {item.email || 'Sin Email'}
                  </div>

                  <div className={styles.mobileCardBottomRow}>
                    <div className={styles.mobileCardStatus} style={{ fontSize: '0.76rem' }}>
                      {item.notifEmail ? '✉️ Email activo (10:00 hs)' : '✕ Email apagado'}
                    </div>
                    <div className={styles.mobileCardActions}>
                      <button
                        type="button"
                        className={styles.mobileCardActionBtn}
                        title="Excluir de cálculo"
                        onClick={() => toggleExcludeId(item.id)}
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        className={styles.mobileCardActionBtn}
                        title="Ver Ficha Clínica"
                        onClick={() => handleOpenFicha(item.clienteId)}
                      >
                        <UserIcon />
                      </button>
                      {wppLink && (
                        <a
                          href={wppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.mobileCardActionBtn}
                          style={{ textDecoration: 'none', background: '#15803d', borderColor: '#15803d', color: '#fff' }}
                          title="Contactar por WhatsApp"
                        >
                          💬
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const isGN = selectedMetric === 'gananciaNeta';
            const moneyVal = formatMoney(
              selectedMetric === 'cancelados' || selectedMetric === 'ausentes'
                ? item.oportunidadNoConcretada
                : isGN
                  ? (item.ingresoCobradoPeriodo ?? item.valorTotal)
                  : item.valorTotal
            );

            // Formatear fecha y hora como "01/10/26 · 13:50"
            let dateFormatted = item.fecha || '';
            try {
              if (item.fecha) {
                const [y, m, d] = item.fecha.split('T')[0].split('-');
                const shortYear = y ? y.slice(-2) : '26';
                dateFormatted = `${d}/${m}/${shortYear}`;
              }
            } catch {
              dateFormatted = item.fecha;
            }
            const dateTimeDisplay = `${dateFormatted} · ${item.horaInicio}`;
            const estadoLabel = item.estadoTurnoLabel || getEstadoTurnoLabel(item);

            return (
              <div key={item.id} className={styles.mobileTurnoCard}>
                <div className={styles.mobileCardTopRow}>
                  <div className={styles.mobileCardClientName}>
                    {item.clienteNombre}
                  </div>
                  <div className={styles.mobileCardTotalVal}>
                    {moneyVal}
                  </div>
                </div>

                <div className={styles.mobileCardSecondRow}>
                  <div className={styles.mobileCardDateTime}>
                    {dateTimeDisplay}
                  </div>
                  <div className={styles.mobileCardSenaVal}>
                    {isGN ? (
                      item.subtipoGanancia?.includes('sin siguiente')
                        ? `Saldo cobrado: ${formatMoney(item.saldoCobradoPeriodo ?? item.ingresoCobradoPeriodo)}`
                        : item.subtipoGanancia?.includes('nuevo')
                          ? `Seña cobrada: ${formatMoney(item.señaCobradaPeriodo ?? item.ingresoCobradoPeriodo)}`
                          : `Saldo: ${formatMoney(item.saldoCobradoPeriodo || 0)} · Seña sig.: ${formatMoney(item.señaCobradaPeriodo || 0)}`
                    ) : (
                      `Seña: ${formatMoney(item.valorSeña)}`
                    )}
                  </div>
                </div>

                <div className={styles.mobileCardZonas}>
                  {item.zonasTexto}
                </div>

                <div className={styles.mobileCardBottomRow}>
                  <div className={styles.mobileCardStatus}>
                    {estadoLabel}
                  </div>
                  <div className={styles.mobileCardActions}>
                    <button
                      type="button"
                      className={styles.mobileCardActionBtn}
                      title="Excluir de cálculo"
                      onClick={() => toggleExcludeId(item.id)}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className={styles.mobileCardActionBtn}
                      title="Ir a Agenda"
                      onClick={() => handleGoToTurno(item)}
                    >
                      <CalendarIcon />
                    </button>
                    <button
                      type="button"
                      className={styles.mobileCardActionBtn}
                      title="Ver Ficha Clínica"
                      onClick={() => handleOpenFicha(item.clienteId)}
                    >
                      <UserIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };


  // Renderizado especial: Consolidado Mensual e Informe Ejecutivo de 13 Meses (D-157)
  const renderConsolidadoMensualView = () => {
    if (loadingConsolidado) {
      return (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#7a1f1e' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>⏳</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Calculando Consolidado Mensual de {selectedConsolidadoMonth}...</div>
        </div>
      );
    }

    if (!consolidadoData) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
          No hay datos disponibles para el mes seleccionado ({selectedConsolidadoMonth}).
        </div>
      );
    }

    const { kpis, resumen, evolucion13Meses, mesLabel } = consolidadoData;
    const maxTurnos = Math.max(...evolucion13Meses.map(m => m.turnosAtendidos), 10);
    const maxFacturacion = Math.max(...evolucion13Meses.map(m => Math.max(m.facturacion, m.gastos, m.facturacionNeta)), 100000);
    const maxAltasBajas = Math.max(...evolucion13Meses.map(m => Math.max(m.clientesNuevos, m.totalBajas)), 5);
    const maxDetalleBajas = Math.max(...evolucion13Meses.map(m => Math.max(m.finalizados, m.cancelados, m.ausentes)), 5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1.25rem' }}>
        {/* 4 KPI CARDS DEL CONSOLIDADO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #7a1f1e', borderRadius: '10px', padding: '1rem 1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              TURNOS ATENDIDOS
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {kpis.turnosAtendidos.valor}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: kpis.turnosAtendidos.comparacion ? '#16a34a' : '#64748b', marginTop: '0.35rem' }}>
              {kpis.turnosAtendidos.comparacion ? `${kpis.turnosAtendidos.comparacion} vs mes anterior` : 's/d vs mes anterior'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #d97706', borderRadius: '10px', padding: '1rem 1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              FACTURACIÓN
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {formatMoney(kpis.facturacion.valor)}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: kpis.facturacion.comparacion ? '#16a34a' : '#64748b', marginTop: '0.35rem' }}>
              {kpis.facturacion.comparacion ? `${kpis.facturacion.comparacion} vs mes anterior` : 's/d vs mes anterior'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #16a34a', borderRadius: '10px', padding: '1rem 1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              FACTURACIÓN NETA
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
              {formatMoney(kpis.facturacionNeta.valor)}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginTop: '0.35rem' }}>
              {kpis.facturacionNeta.porcentajeFacturacion}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #2563eb', borderRadius: '10px', padding: '1rem 1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              CLIENTES NUEVOS
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {kpis.clientesNuevos.valor}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: kpis.clientesNuevos.comparacion ? '#16a34a' : '#64748b', marginTop: '0.35rem' }}>
              {kpis.clientesNuevos.comparacion ? `${kpis.clientesNuevos.comparacion} vs mes anterior` : 's/d vs mes anterior'}
            </div>
          </div>
        </div>

        {/* TABLA RESUMEN DEL MES */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📋 Resumen Ejecutivo de {mesLabel}
            </h3>
            <button
              type="button"
              onClick={() => router.push(`/admin/estadisticas/informe-mensual?mes=${selectedConsolidadoMonth}`)}
              style={{
                padding: '0.45rem 0.95rem',
                backgroundColor: '#7a1f1e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📄 Abrir Versión Imprimible PDF
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.9rem', fontWeight: 800, color: '#334155' }}>Indicador</th>
                  <th style={{ textAlign: 'right', padding: '0.65rem 0.9rem', fontWeight: 800, color: '#334155', width: '220px' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Turnos atendidos</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{resumen.turnosAtendidos}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Ocupación de agenda</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>
                    {resumen.ocupacionAgendaPorc.toFixed(1).replace('.', ',')}% <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>({resumen.ocupacionMinutos} min ocup. / {resumen.disponiblesMinutos} min disp.)</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Facturación del mes</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{formatMoney(resumen.facturacionMes)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Gastos del mes</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatMoney(resumen.gastosMes)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f0fdf4' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#166534', fontWeight: 700 }}>Facturación neta</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 800, color: '#166534' }}>{formatMoney(resumen.facturacionNeta)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Clientes nuevos</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{resumen.clientesNuevos}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Valor de los turnos de clientes nuevos</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{formatMoney(resumen.valorTurnosNuevos)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Clientes que finalizaron tratamiento</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{resumen.clientesFinalizaron}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Bajas: turnos cancelados</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{resumen.bajasCancelados}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Bajas: no vinieron (ausentes)</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{resumen.bajasNoVinieron}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fff1f2' }}>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#991b1b', fontWeight: 700 }}>Total bajas</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 800, color: '#991b1b' }}>{resumen.totalBajas}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.55rem 0.9rem', color: '#475569' }}>Valor de los turnos cancelados y no asistidos</td>
                  <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatMoney(resumen.valorBajasPerdido)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* EVOLUCIÓN HISTÓRICA DE 13 MESES */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📈 Evolución Comparativa de los Últimos 13 Meses
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Gráfico 1 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  1. Turnos Atendidos por Mes
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Cantidad mensual de citas realizadas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
                {evolucion13Meses.map((m, idx) => {
                  const heightPct = maxTurnos > 0 ? (m.turnosAtendidos / maxTurnos) * 100 : 0;
                  const isSelected = idx === evolucion13Meses.length - 1;
                  return (
                    <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: m.turnosAtendidos > 0 ? '#0f172a' : '#cbd5e1', marginBottom: '3px' }}>
                        {m.turnosAtendidos > 0 ? m.turnosAtendidos : 's/d'}
                      </span>
                      <div style={{
                        width: '100%',
                        maxWidth: '36px',
                        height: `${Math.max(heightPct, 4)}%`,
                        backgroundColor: m.turnosAtendidos > 0 ? (isSelected ? '#7a1f1e' : '#b45309') : '#e2e8f0',
                        borderRadius: '3px 3px 0 0'
                      }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {evolucion13Meses.map(m => (
                  <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 2 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  2. Facturación, Gastos y Facturación Neta ($)
                </span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#d97706', borderRadius: '2px' }} /> Facturación
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '2px' }} /> Gastos
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#16a34a', borderRadius: '2px' }} /> Neta
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
                {evolucion13Meses.map((m) => {
                  const fPct = maxFacturacion > 0 ? (m.facturacion / maxFacturacion) * 100 : 0;
                  const gPct = maxFacturacion > 0 ? (m.gastos / maxFacturacion) * 100 : 0;
                  const nPct = maxFacturacion > 0 ? (m.facturacionNeta / maxFacturacion) * 100 : 0;
                  return (
                    <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '100%', gap: '1.5px', justifyContent: 'center' }}>
                        <div title={`Facturación: ${formatMoney(m.facturacion)}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(fPct, m.facturacion > 0 ? 4 : 0)}%`, backgroundColor: '#d97706', borderRadius: '2px 2px 0 0' }} />
                        <div title={`Gastos: ${formatMoney(m.gastos)}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(gPct, m.gastos > 0 ? 4 : 0)}%`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0' }} />
                        <div title={`Neta: ${formatMoney(m.facturacionNeta)}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(nPct, m.facturacionNeta > 0 ? 4 : 0)}%`, backgroundColor: '#16a34a', borderRadius: '2px 2px 0 0' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {evolucion13Meses.map(m => (
                  <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 3 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  3. Altas (Clientes Nuevos) vs Total de Bajas
                </span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px' }} /> Altas (Nuevos)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '2px' }} /> Total Bajas
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
                {evolucion13Meses.map((m) => {
                  const aPct = maxAltasBajas > 0 ? (m.clientesNuevos / maxAltasBajas) * 100 : 0;
                  const bPct = maxAltasBajas > 0 ? (m.totalBajas / maxAltasBajas) * 100 : 0;
                  return (
                    <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '100%', gap: '2px', justifyContent: 'center' }}>
                        <div title={`Altas: ${m.clientesNuevos}`} style={{ flex: 1, maxWidth: '14px', height: `${Math.max(aPct, m.clientesNuevos > 0 ? 4 : 0)}%`, backgroundColor: '#2563eb', borderRadius: '2px 2px 0 0' }} />
                        <div title={`Bajas: ${m.totalBajas}`} style={{ flex: 1, maxWidth: '14px', height: `${Math.max(bPct, m.totalBajas > 0 ? 4 : 0)}%`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {evolucion13Meses.map(m => (
                  <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 4 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  4. Detalle de Bajas por Mes
                </span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#64748b', borderRadius: '2px' }} /> Finalizaron
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#d97706', borderRadius: '2px' }} /> Cancelaron
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '2px' }} /> No Vinieron
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
                {evolucion13Meses.map((m) => {
                  const finPct = maxDetalleBajas > 0 ? (m.finalizados / maxDetalleBajas) * 100 : 0;
                  const canPct = maxDetalleBajas > 0 ? (m.cancelados / maxDetalleBajas) * 100 : 0;
                  const ausPct = maxDetalleBajas > 0 ? (m.ausentes / maxDetalleBajas) * 100 : 0;
                  return (
                    <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '100%', gap: '1.5px', justifyContent: 'center' }}>
                        <div title={`Finalizaron: ${m.finalizados}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(finPct, m.finalizados > 0 ? 4 : 0)}%`, backgroundColor: '#64748b', borderRadius: '2px 2px 0 0' }} />
                        <div title={`Cancelaron: ${m.cancelados}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(canPct, m.cancelados > 0 ? 4 : 0)}%`, backgroundColor: '#d97706', borderRadius: '2px 2px 0 0' }} />
                        <div title={`No vinieron: ${m.ausentes}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(ausPct, m.ausentes > 0 ? 4 : 0)}%`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {evolucion13Meses.map(m => (
                  <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
            * s/d: sin datos en meses anteriores al inicio del registro en el sistema.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* HEADER + FILTRO DE FECHAS LIMPIO */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Centro de Estadísticas</h2>
          <p>Análisis de turnos, ingresos reales, seguimiento de clientes e informes exportables</p>
        </div>

        <div className={styles.controls}>
          {selectedMetric === 'consolidado_mensual' ? (
            <div className={styles.dateInputsRow}>
              <div className={styles.dateInputGroup} style={{ minWidth: '220px' }}>
                <label>Mes del Informe</label>
                <input
                  type="month"
                  className={styles.dateInput}
                  value={selectedConsolidadoMonth}
                  onChange={(e) => setSelectedConsolidadoMonth(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className={styles.dateInputsRow}>
              <div className={styles.dateInputGroup}>
                <label>Desde</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className={styles.dateInputGroup}>
                <label>Hasta</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.btnRefresh}
            onClick={fetchEstadisticas}
            title="Recargar datos actualizados en vivo"
            disabled={loading}
          >
            {loading ? '⏳ Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <span>Calculando métricas y armando informes del período...</span>
        </div>
      ) : !data ? (
        <div className={styles.loadingWrapper}>
          <span>No se pudieron obtener los datos estadísticos.</span>
        </div>
      ) : (
        <>
          {/* SELECTOR DE MÉTRICA DIRECTAMENTE DEBAJO DE LAS FECHAS */}
          <div className={styles.metricSelectorCard}>
            <div className={styles.metricSelectorHeader}>
              <label>🔎 Seleccionar Métrica a Analizar:</label>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                {currentMetricDef.description}
              </span>
            </div>

            <div className={styles.metricSelectorRow}>
              <select
                className={styles.metricDropdown}
                value={selectedMetric}
                onChange={(e) => handleMetricChange(e.target.value)}
              >
                {METRIC_DEFINITIONS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <div className={styles.actionButtonsGroup}>
                {selectedMetric === 'consolidado_mensual' ? (
                  <button
                    type="button"
                    className={styles.btnExcel}
                    style={{ backgroundColor: '#7a1f1e', color: '#ffffff', border: 'none' }}
                    onClick={() => router.push(`/admin/estadisticas/informe-mensual?mes=${selectedConsolidadoMonth}`)}
                  >
                    📄 Imprimir / Descargar Informe PDF (2 Páginas)
                  </button>
                ) : (
                  <>
                    {currentMetricDef.excelModel && (
                      <button
                        type="button"
                        className={styles.btnExcel}
                        onClick={() => setExcelModalOpen(true)}
                      >
                        📊 Ver / Descargar Informe Excel
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.btnExpandList}
                      onClick={() => setExpandedListModalOpen(true)}
                    >
                      🔍 Ampliar Listado en Ventana
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

{selectedMetric === 'consolidado_mensual' ? renderConsolidadoMensualView() : (
            <>
          {/* 3 TARJETAS KPI DE LA MÉTRICA SELECCIONADA */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>
                {selectedMetric === 'cumpleanos' ? 'Cumpleañeros en el Período' : 'Cantidad de Registros'}
              </div>
              <div className={styles.kpiValue} style={{ color: selectedMetric === 'cumpleanos' ? '#d4a54d' : undefined }}>
                {activeMetricData.count}
              </div>
              <div className={styles.kpiSub}>
                {excludedIds.size > 0
                  ? `${excludedIds.size} excluido(s) manualmente con [X]`
                  : selectedMetric === 'cumpleanos'
                    ? 'Clientes con cumpleaños en este rango'
                    : 'Total contabilizado en el período'}
              </div>
            </div>

            <div className={`${styles.kpiCard} ${currentMetricDef.isDanger ? styles.kpiCardDanger : ''}`}>
              <div className={styles.kpiLabel}>
                {selectedMetric === 'cumpleanos' ? 'Rango Evaluado' : currentMetricDef.valueLabel}
              </div>
              <div
                className={styles.kpiValue}
                style={{
                  color: selectedMetric === 'cumpleanos' ? '#7a1f1e' : (currentMetricDef.isDanger ? '#dc2626' : '#7a1f1e'),
                  fontSize: selectedMetric === 'cumpleanos' ? '1.35rem' : undefined
                }}
              >
                {selectedMetric === 'cumpleanos'
                  ? `${formatDateDisplay(startDate)} al ${formatDateDisplay(endDate)}`
                  : formatMoney(activeMetricData.totalMoney)}
              </div>
              <div className={styles.kpiSub}>
                {selectedMetric === 'cumpleanos'
                  ? 'Filtro por día y mes de nacimiento'
                  : selectedMetric === 'gananciaNeta'
                    ? `Saldos sesiones: ${formatMoney(data.avanzadas?.gananciaNeta?.entradasTurnos)} + Señas: ${formatMoney(data.avanzadas?.gananciaNeta?.entradasSenas)}`
                    : 'Se actualiza en vivo al filtrar o excluir filas'}
              </div>
            </div>

            {selectedMetric === 'cumpleanos' ? (
              <div className={`${styles.kpiCard} ${styles.kpiCardInfo}`}>
                <div className={styles.kpiLabel}>Canal de Saludo</div>
                <div className={styles.kpiValue} style={{ fontSize: '1.25rem', color: '#15803d' }}>
                  ✉️ Solo por Email
                </div>
                <div className={styles.kpiSub}>Envío automático diario a las 10:00 AM</div>
              </div>
            ) : (
              <div className={`${styles.kpiCard} ${styles.kpiCardInfo}`}>
                <div className={styles.kpiLabel}>% Ocupación de Agenda</div>
                <div
                  className={styles.kpiValue}
                  style={{
                    color: Number(data?.ocupacionAgenda?.porcentaje || 0) >= 70 ? '#15803d' : '#7a1f1e'
                  }}
                >
                  {data?.ocupacionAgenda?.porcentajeFormateado || '0%'}
                </div>
                <div className={styles.kpiSub}>
                  {data?.ocupacionAgenda?.minutosDisponibles > 0
                    ? `${data.ocupacionAgenda.minutosOcupados} min de ${data.ocupacionAgenda.minutosDisponibles} min (${data.ocupacionAgenda.horasOcupadas} hs de ${data.ocupacionAgenda.horasDisponibles} hs)`
                    : 'Calculado en horario 14 a 22 hs · Lunes a Viernes'}
                </div>
              </div>
            )}
          </div>

          {/* DESGLOSE DE LOS 3 CONCEPTOS DE GANANCIA NETA (CAPTURA 10.PNG DE LUCIANO) */}
          {selectedMetric === 'gananciaNeta' && data.avanzadas?.gananciaNeta?.desglose && (
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Turnos Nuevos (Señas Cobradas)</div>
                <div className={styles.kpiValue} style={{ fontSize: '1.45rem', color: '#15803d' }}>
                  {formatMoney(data.avanzadas.gananciaNeta.desglose.turnosNuevos)}
                </div>
                <div className={styles.kpiSub}>
                  Señas abonadas en el período por reservas nuevas (aunque el turno sea otro día)
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Turnos Siguientes (Saldo + Seña Próx.)</div>
                <div className={styles.kpiValue} style={{ fontSize: '1.45rem', color: '#15803d' }}>
                  {formatMoney(data.avanzadas.gananciaNeta.desglose.turnosSiguientes)}
                </div>
                <div className={styles.kpiSub}>
                  Clientes atendidos en el período que agendaron próximo turno (saldo + nueva seña)
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Turnos Sin Siguiente (Solo Saldo)</div>
                <div className={styles.kpiValue} style={{ fontSize: '1.45rem', color: '#15803d' }}>
                  {formatMoney(data.avanzadas.gananciaNeta.desglose.turnosSinSiguiente)}
                </div>
                <div className={styles.kpiSub}>
                  Clientes atendidos en el período que no agendaron nuevo turno (solo saldo cobrado)
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN ESPECIAL: ZONAS (FILTROS PÍLDORA + HISTOGRAMA LEGIBLE) */}
          {selectedMetric === 'zonas' && data.avanzadas?.zonas && (
            <>
              <div className={styles.filtersCard}>
                <div className={styles.filtersHeader}>
                   Filtrar Zonas (Seleccioná una o varias para recalcular):
                </div>
                <div className={styles.pillsRow}>
                  <button
                    type="button"
                    className={`${styles.pillBtn} ${selectedZonesFilter.length === 0 ? styles.pillBtnActive : ''}`}
                    onClick={() => setSelectedZonesFilter([])}
                  >
                    Todas las Zonas
                  </button>
                  {(data.avanzadas.zonas.histograma || [])
                    .filter(z => !z.nombre.toLowerCase().startsWith('otros'))
                    .map(z => (
                      <button
                        type="button"
                        key={z.nombre}
                        className={`${styles.pillBtn} ${selectedZonesFilter.includes(z.nombre) ? styles.pillBtnActive : ''}`}
                        onClick={() => toggleZoneFilter(z.nombre)}
                      >
                        {z.nombre} ({z.total})
                      </button>
                    ))}
                </div>
              </div>

              <div className={styles.histogramCard}>
                <div className={styles.histogramTitle}>
                  <span>📊 Histograma de Demanda por Zona</span>
                  <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                    Turnos agendados / realizados en el período
                  </span>
                </div>
                <div className={styles.barsContainer}>
                  {(() => {
                    const list = (data.avanzadas.zonas.histograma || [])
                      .filter(z => !z.nombre.toLowerCase().startsWith('otros'));
                    const maxCount = Math.max(1, ...list.map(i => i.total));
                    return list
                      .filter(z => selectedZonesFilter.length === 0 || selectedZonesFilter.includes(z.nombre))
                      .map(z => {
                        const pct = Math.round((z.total / maxCount) * 100);
                        return (
                          <div key={z.nombre} className={styles.barRow}>
                            <div className={styles.barName} title={z.nombre}>{z.nombre}</div>
                            <div className={styles.barTrack}>
                              <div className={styles.barFill} style={{ width: `${pct}%` }} />
                            </div>
                            <div className={styles.barStat}>
                              {z.total} t.
                              <div className={styles.barStatSub}>{formatMoney(z.ingresos)}</div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            </>
          )}

          {/* SECCIÓN ESPECIAL: CLIENTES NUEVOS (FILTROS POR CANAL + GRÁFICO DE BARRAS) */}
          {selectedMetric === 'nuevos' && data.avanzadas?.nuevos?.canales && (
            <>
              <div className={styles.filtersCard}>
                <div className={styles.filtersHeader}>
                  📣 Filtrar Clientes Nuevos por Canal de Adquisición:
                </div>
                <div className={styles.pillsRow}>
                  <button
                    type="button"
                    className={`${styles.pillBtn} ${selectedCanalesFilter.length === 0 ? styles.pillBtnActive : ''}`}
                    onClick={() => setSelectedCanalesFilter([])}
                  >
                    Todos los Canales
                  </button>
                  {Object.entries(data.avanzadas.nuevos.canales).map(([key, count]) => (
                    <button
                      type="button"
                      key={key}
                      className={`${styles.pillBtn} ${selectedCanalesFilter.includes(key) ? styles.pillBtnActive : ''}`}
                      onClick={() => toggleCanalFilter(key)}
                    >
                      {CANAL_LABELS[key] || key} ({count})
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.histogramCard}>
                <div className={styles.histogramTitle}>
                  <span>📈 Distribución por Canal de Adquisición</span>
                </div>
                <div className={styles.barsContainer}>
                  {(() => {
                    const entries = Object.entries(data.avanzadas.nuevos.canales);
                    const maxVal = Math.max(1, ...entries.map(([, c]) => c));
                    return entries.map(([key, count]) => {
                      const pct = Math.round((count / maxVal) * 100);
                      return (
                        <div key={key} className={styles.barRow}>
                          <div className={styles.barName}>{CANAL_LABELS[key] || key}</div>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={styles.barStat}>{count} clientes</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}

          {excludedIds.size > 0 && (
            <div className={styles.exclusionBanner} style={{ marginTop: '1rem' }}>
              <span>
                ⚠️ Has excluido <strong>{excludedIds.size}</strong> registro(s) del cálculo actual usando el botón [X].
              </span>
              <button type="button" className={styles.btnResetExclusion} onClick={resetExclusions}>
                Restaurar Todos ({excludedIds.size})
              </button>
            </div>
          )}

          {/* LISTADO PRINCIPAL DE REGISTROS (TABLA EN DESKTOP / TARJETAS EN MOBILE) */}
          <div style={{ marginTop: '1.25rem' }}>
            {renderTurnosTable()}
          </div>
            </>
          )}
        </>
      )}

      {/* MODAL DE LISTADO AMPLIADO EN VENTANA */}
      {expandedListModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setExpandedListModalOpen(false)}>
          <div className={styles.modalCardWide} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                📋 {currentMetricDef.label} — Listado Ampliado ({activeMetricData.count} registros | Total: {formatMoney(activeMetricData.totalMoney)})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {currentMetricDef.excelModel && (
                  <button
                    type="button"
                    className={styles.btnExcel}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      setExpandedListModalOpen(false);
                      setExcelModalOpen(true);
                    }}
                  >
                    📊 Ver Informe Excel
                  </button>
                )}
                <button className={styles.modalCloseBtn} onClick={() => setExpandedListModalOpen(false)}>
                  ✕ Cerrar
                </button>
              </div>
            </div>
            <div className={styles.modalBody} style={{ padding: 0 }}>
              {excludedIds.size > 0 && (
                <div className={styles.exclusionBanner}>
                  <span>
                    ⚠️ Has excluido <strong>{excludedIds.size}</strong> registro(s) del cálculo actual.
                  </span>
                  <button type="button" className={styles.btnResetExclusion} onClick={resetExclusions}>
                    Restaurar Todos ({excludedIds.size})
                  </button>
                </div>
              )}
              {renderTurnosTable()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INFORME EXCEL (MODELO A: GANANCIAS / MODELO B: PÉRDIDAS Y SEGUIMIENTO) */}
      {excelModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setExcelModalOpen(false)}>
          <div className={styles.modalCardWide} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                📊 Vista de Planilla Excel — {excelSummary.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnExcel}
                  onClick={handleDownloadExcel}
                >
                  📥 Descargar Archivo Excel (.xlsx)
                </button>
                <button className={styles.modalCloseBtn} onClick={() => setExcelModalOpen(false)}>
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.excelSheet}>
                <div className={styles.excelTitleBanner}>{excelSummary.title}</div>

                <div className={styles.excelPeriodRow}>
                  <span className={styles.excelPeriodLabel}>Desde</span>
                  <span className={styles.excelPeriodValue}>{formatDateDisplay(startDate)}</span>
                  <span className={styles.excelPeriodLabel}>Hasta</span>
                  <span className={styles.excelPeriodValue}>{formatDateDisplay(endDate)}</span>
                </div>

                <div className={styles.tableWrapper}>
                  {excelSummary.model === 'A' ? (
                    <table className={styles.excelTable}>
                      <thead>
                        <tr>
                          <th>Fecha de turno</th>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Origen</th>
                          <th>Tipo de pago</th>
                          <th>{selectedMetric === 'gananciaNeta' ? 'Ingreso real' : 'Valor final'}</th>
                          <th>{selectedMetric === 'gananciaNeta' ? 'Seña cobrada' : 'Seña aplicada'}</th>
                          <th>Estado de turno</th>
                          <th>Zonas</th>
                          <th>Operador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMetricData.filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem' }}>
                              Sin registros en el período seleccionado.
                            </td>
                          </tr>
                        ) : (
                          activeMetricData.filteredItems.map(item => {
                            const isGN = selectedMetric === 'gananciaNeta';
                            const vFinal = isGN ? Number(item.ingresoCobradoPeriodo ?? item.valorTotal ?? 0) : Number(item.valorTotal || 0);
                            const vSena = isGN ? Number(item.señaCobradaPeriodo ?? 0) : Number(item.valorSeña || 0);
                            const estadoTurno = getEstadoTurnoLabel(item);
                            return (
                              <tr key={item.id}>
                                <td style={{ textAlign: 'center' }}>{formatDateDisplay(item.fecha)}</td>
                                <td style={{ textAlign: 'center' }}>{item.horaInicio}</td>
                                <td style={{ fontWeight: 700 }}>{item.clienteNombre}</td>
                                <td>{item.origenCategoria || 'Orgánico'}</td>
                                <td>{item.metodoPagoLabel || 'Transferencia'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(vFinal)}</td>
                                <td style={{ textAlign: 'right' }}>{formatMoney(vSena)}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: '#7a1f1e' }}>{estadoTurno}</td>
                                <td>{item.zonasTexto}</td>
                                <td>{item.operadorNombre || 'Gonzalo'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className={styles.excelTable}>
                      <thead>
                        <tr>
                          <th>Fecha de turno</th>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Último estado</th>
                          <th>Tipo de valor</th>
                          <th>Valor</th>
                          <th>Seña del turno</th>
                          <th>Seña retenida</th>
                          <th>Oportunidad no concretada</th>
                          <th>Operador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMetricData.filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem' }}>
                              Sin registros en el período seleccionado.
                            </td>
                          </tr>
                        ) : (
                          activeMetricData.filteredItems.map(item => {
                            const val = Number(item.valorTotal || 0);
                            const senaT = Number(item.señaDelTurnoReporte ?? item.valorSeña ?? 0);
                            const ret = Number(item.señaRetenida || 0);
                            const opNoConc = Number(item.oportunidadNoConcretada ?? Math.max(0, val - ret));
                            return (
                              <tr key={item.id}>
                                <td style={{ textAlign: 'center' }}>{formatDateDisplay(item.fecha)}</td>
                                <td style={{ textAlign: 'center' }}>{item.horaInicio}</td>
                                <td style={{ fontWeight: 700 }}>{item.clienteNombre}</td>
                                <td>{item.ultimoEstadoLabel || item.estado}</td>
                                <td>{item.tipoValor || 'Turno no realizado'}</td>
                                <td style={{ textAlign: 'right' }}>{formatMoney(val)}</td>
                                <td style={{ textAlign: 'right' }}>{formatMoney(senaT)}</td>
                                <td style={{ textAlign: 'right' }}>{formatMoney(ret)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(opNoConc)}</td>
                                <td>{item.operadorNombre || 'Gonzalo'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* CUADROS DE RESUMEN INFERIORES (IDÉNTICOS A LAS CAPTURAS 6 y 7 DE LUCIANO) */}
                {excelSummary.model === 'A' ? (
                  <div className={styles.excelSummaryRow}>
                    <table className={styles.excelSummaryTable}>
                      <tbody>
                        <tr>
                          <td>Cantidad de turnos</td>
                          <td>{excelSummary.cantidadTurnos}</td>
                        </tr>
                        <tr>
                          <td>Cantidad de clientes únicos</td>
                          <td>{excelSummary.cantidadClientesUnicos}</td>
                        </tr>
                        <tr>
                          <td>Clientes de Orgánico</td>
                          <td>{excelSummary.clientesOrganico}</td>
                        </tr>
                        <tr>
                          <td>Clientes de Redes sociales</td>
                          <td>{excelSummary.clientesRedes}</td>
                        </tr>
                        <tr>
                          <td>Clientes de Publicidad</td>
                          <td>{excelSummary.clientesPublicidad}</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className={styles.excelSummaryTable}>
                      <tbody>
                        <tr>
                          <td>{selectedMetric === 'gananciaNeta' ? 'Ingreso total real' : 'Valor total de turnos'}</td>
                          <td>{formatMoney(excelSummary.valorTotalTurnos)}</td>
                        </tr>
                        <tr>
                          <td>{selectedMetric === 'gananciaNeta' ? 'Total señas cobradas' : 'Total de señas aplicadas'}</td>
                          <td>{formatMoney(excelSummary.totalSenasAplicadas)}</td>
                        </tr>
                        <tr>
                          <td>{selectedMetric === 'gananciaNeta' ? 'Total saldos cobrados' : 'Total de saldos'}</td>
                          <td>{formatMoney(excelSummary.totalSaldos)}</td>
                        </tr>
                        <tr>
                          <td>{selectedMetric === 'gananciaNeta' ? 'Ingresos en efectivo' : 'Valor en efectivo'}</td>
                          <td>{formatMoney(excelSummary.valorEfectivo)}</td>
                        </tr>
                        <tr>
                          <td>{selectedMetric === 'gananciaNeta' ? 'Ingresos en transferencia' : 'Valor en transferencia'}</td>
                          <td>{formatMoney(excelSummary.valorTransferencia)}</td>
                        </tr>
                        <tr>
                          <td>Ticket promedio por cliente</td>
                          <td>{formatMoney(excelSummary.ticketPromedioCliente)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <div className={styles.excelSummaryRow}>
                      <table className={styles.excelSummaryTable}>
                        <tbody>
                          <tr>
                            <td>Cantidad de clientes</td>
                            <td>{excelSummary.cantidadClientes}</td>
                          </tr>
                          <tr>
                            <td>Clientes ausentes</td>
                            <td>{excelSummary.clientesAusentes}</td>
                          </tr>
                          <tr>
                            <td>Clientes va a avisar</td>
                            <td>{excelSummary.clientesVaAAvisar}</td>
                          </tr>
                          <tr>
                            <td>Clientes cancelados</td>
                            <td>{excelSummary.clientesCancelados}</td>
                          </tr>
                          <tr>
                            <td>Clientes mantenimiento</td>
                            <td>{excelSummary.clientesMantenimiento}</td>
                          </tr>
                          <tr>
                            <td>Clientes finalizados</td>
                            <td>{excelSummary.clientesFinalizados}</td>
                          </tr>
                        </tbody>
                      </table>

                      <table className={styles.excelSummaryTable}>
                        <tbody>
                          <tr>
                            <td>Valor de referencia total</td>
                            <td>{formatMoney(excelSummary.valorReferenciaTotal)}</td>
                          </tr>
                          <tr>
                            <td>Total de señas retenidas</td>
                            <td>{formatMoney(excelSummary.totalSenasRetenidas)}</td>
                          </tr>
                          <tr>
                            <td>Oportunidad total no concretada</td>
                            <td>{formatMoney(excelSummary.oportunidadTotalNoConcretada)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.excelFootnote}>
                      Seña retenida: importe perdido; 0 si quedó guardada. En seguimiento se toma el valor de la última sesión, sin descontar su seña.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHA DEL CLIENTE EMBEBIDO */}
      {modalClient && (
        <div className={styles.modalOverlay} onClick={() => setModalClient(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <UserIcon /> Ficha: {modalClient.nombreCompleto}
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setModalClient(null)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.modalField}>
                  <span className={styles.modalFieldLabel}>WhatsApp</span>
                  <span className={styles.modalFieldValue}>{modalClient.whatsapp || 'No registrado'}</span>
                </div>
                <div className={styles.modalField}>
                  <span className={styles.modalFieldLabel}>Email</span>
                  <span className={styles.modalFieldValue}>{modalClient.email || 'No registrado'}</span>
                </div>
                <div className={styles.modalField}>
                  <span className={styles.modalFieldLabel}>DNI</span>
                  <span className={styles.modalFieldValue}>{modalClient.dni || 'Sin DNI'}</span>
                </div>
                <div className={styles.modalField}>
                  <span className={styles.modalFieldLabel}>Canal de Adquisición</span>
                  <span className={styles.modalFieldValue}>{CANAL_LABELS[modalClient.canalAdquisicion] || modalClient.canalAdquisicion}</span>
                </div>
                <div className={styles.modalField}>
                  <span className={styles.modalFieldLabel}>Estado</span>
                  <span className={styles.modalFieldValue} style={{ color: '#7a1f1e' }}>{modalClient.estado}</span>
                </div>
                <div className={styles.modalField}>
                  <span className={styles.modalFieldLabel}>Frecuencia</span>
                  <span className={styles.modalFieldValue}>Cada {modalClient.frecuencia || 4} semanas</span>
                </div>
              </div>

              <div>
                <span className={styles.modalFieldLabel} style={{ display: 'block', marginBottom: '0.4rem' }}>
                  🛡️ Observaciones del Operador (Potencia / Datos Clínicos)
                </span>
                <div className={styles.modalObsBox}>
                  {modalClient.notasGonzalo || 'Sin notas de operador cargadas.'}
                </div>
              </div>

              <div>
                <span className={styles.modalFieldLabel} style={{ display: 'block', marginBottom: '0.4rem' }}>
                  📝 Observaciones Generales
                </span>
                <div className={styles.modalObsBox}>
                  {modalClient.observaciones || 'Sin observaciones generales.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  className={styles.btnActionTurno}
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    setModalClient(null);
                    router.push(`/admin/clientes?id=${modalClient.id}`);
                  }}
                >
                  <ExternalLinkIcon /> Abrir Ficha Completa en Clientes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
