'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './estadisticas.module.css';

// ==========================================
// DEFINICIÓN DE MÉTRICAS DEL DESPLEGABLE
// ==========================================
const METRIC_DEFINITIONS = [
  {
    id: 'realizados',
    label: '✅ Turnos Realizados',
    valueLabel: 'Facturación Realizada',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Sesiones completadas dentro del período seleccionado (suma el valor total de los turnos realizados, sin señas futuras).'
  },
  {
    id: 'gananciaNeta',
    label: '💰 Ganancia Neta (Ingresos Reales del Período)',
    valueLabel: 'Ganancia Neta Ingresada',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Dinero que realmente ingresa en el período: saldos cobrados en sesiones realizadas + señas abonadas en el período (incluyendo próximos turnos y turnos nuevos).'
  },
  {
    id: 'senados',
    label: '📌 Turnos Señados / Confirmados',
    valueLabel: 'Total Proyectado en Turnos Señados',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Turnos agendados en estado Señado, Reprogramado o Pendiente que aún no fueron realizados.'
  },
  {
    id: 'cancelados',
    label: '❌ Turnos Cancelados (Pérdidas)',
    valueLabel: 'Pérdida por Cancelaciones',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Turnos cancelados en el período. Se descuenta la seña si quedó retenida; si la seña se guardó para otro turno, se toma el valor completo.'
  },
  {
    id: 'ausentes',
    label: '🚫 Turnos Ausentes (No asistió)',
    valueLabel: 'Pérdida por Inasistencias',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes que no asistieron a su turno. Se calcula el valor del turno menos la seña retenida.'
  },
  {
    id: 'vaAAvisar',
    label: '💬 Clientes en "Va a avisar"',
    valueLabel: 'Oportunidad Pendiente (Última Sesión)',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes que actualmente están en estado "Va a avisar" y aún no agendaron un nuevo turno (valor completo de su última sesión).'
  },
  {
    id: 'mantenimiento',
    label: '🔄 Clientes en "Mantenimiento"',
    valueLabel: 'Valor Referencia (Última Sesión)',
    isDanger: false,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes actualmente en etapa de sesiones de mantenimiento periódico (se toma el valor completo de su última sesión realizada).'
  },
  {
    id: 'finalizo',
    label: '🏁 Clientes que "Finalizaron Tratamiento"',
    valueLabel: 'Valor Referencia (Última Sesión)',
    isDanger: false,
    hasAvg: false,
    excelModel: 'B',
    description: 'Clientes cuyo tratamiento fue marcado como finalizado (se toma el valor completo de su última sesión realizada).'
  },
  {
    id: 'nuevos',
    label: '🆕 Clientes Nuevos en el Período',
    valueLabel: 'Facturación de Clientes Nuevos',
    isDanger: false,
    hasAvg: true,
    excelModel: 'A',
    description: 'Contabiliza tanto los clientes agendados sin sesiones previas (0 sesiones) como los que realizaron su primera sesión en el período (1 sesión).'
  },
  {
    id: 'sinMarcar',
    label: '⚠️ Turnos Sin Marcar (Pasados de hora)',
    valueLabel: 'Monto Pendiente de Cierre',
    isDanger: true,
    hasAvg: false,
    excelModel: 'B',
    description: 'Turnos cuya fecha y horario ya pasaron pero continúan abiertos sin marcar como Realizado o Ausente.'
  },
  {
    id: 'zonas',
    label: '📍 Zonas Más Demandadas (Histograma y Filtros)',
    valueLabel: 'Facturación de Zonas Seleccionadas',
    isDanger: false,
    hasAvg: true,
    excelModel: null,
    description: 'Análisis detallado por zona corporal, frecuencia de aplicación e ingresos.'
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
      const hist = av.zonas?.histograma || [];
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

      items.forEach(item => {
        if (item.clienteId) {
          uniqueClientIds.add(item.clienteId);
          if (!clientOriginMap.has(item.clienteId)) {
            clientOriginMap.set(item.clienteId, item.origenCategoria || 'Orgánico');
          }
        }
        const vFinal = Number(item.valorTotal || 0);
        const vSena = Number(item.valorSeña || 0);
        const vSaldo = Number(item.saldoPendiente ?? Math.max(0, vFinal - vSena));

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
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Acciones</th>
              <th className={styles.th}>Fecha y Hora</th>
              <th className={styles.th}>Cliente</th>
              <th className={styles.th}>Zonas</th>
              <th className={styles.th}>Estado</th>
              <th className={styles.th}>Pago / Operador</th>
              <th className={styles.th}>Valor Turno</th>
              <th className={styles.th}>Seña / Saldo</th>
            </tr>
          </thead>
          <tbody>
            {activeMetricData.filteredItems.map(item => {
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
                          : item.valorTotal
                      )}
                    </div>
                    {(selectedMetric === 'cancelados' || selectedMetric === 'ausentes') && item.señaRetenida > 0 && (
                      <div style={{ fontSize: '0.73rem', color: '#b91c1c', fontWeight: 700 }}>
                        (Turno {formatMoney(item.valorTotal)} - Seña ret. {formatMoney(item.señaRetenida)})
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>
                      Seña: {formatMoney(item.valorSeña)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                      Saldo: {formatMoney(item.saldoPendiente)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
              </div>
            </div>
          </div>

          {/* 3 TARJETAS KPI DE LA MÉTRICA SELECCIONADA */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Cantidad de Registros</div>
              <div className={styles.kpiValue}>{activeMetricData.count}</div>
              <div className={styles.kpiSub}>
                {excludedIds.size > 0
                  ? `${excludedIds.size} excluido(s) manualmente con [X]`
                  : 'Total contabilizado en el período'}
              </div>
            </div>

            <div className={`${styles.kpiCard} ${currentMetricDef.isDanger ? styles.kpiCardDanger : ''}`}>
              <div className={styles.kpiLabel}>{currentMetricDef.valueLabel}</div>
              <div
                className={styles.kpiValue}
                style={{ color: currentMetricDef.isDanger ? '#dc2626' : '#7a1f1e' }}
              >
                {formatMoney(activeMetricData.totalMoney)}
              </div>
              <div className={styles.kpiSub}>
                {selectedMetric === 'gananciaNeta'
                  ? `Saldos sesiones: ${formatMoney(data.avanzadas?.gananciaNeta?.entradasTurnos)} + Señas: ${formatMoney(data.avanzadas?.gananciaNeta?.entradasSenas)}`
                  : 'Se actualiza en vivo al filtrar o excluir filas'}
              </div>
            </div>

            {currentMetricDef.hasAvg && (
              <div className={`${styles.kpiCard} ${styles.kpiCardInfo}`}>
                <div className={styles.kpiLabel}>Ticket Promedio</div>
                <div className={styles.kpiValue}>{formatMoney(activeMetricData.avgTicket)}</div>
                <div className={styles.kpiSub}>Promedio por turno / cliente en esta métrica</div>
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
                  {(data.avanzadas.zonas.histograma || []).map(z => (
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
                    const list = data.avanzadas.zonas.histograma || [];
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
                          <th>Valor final</th>
                          <th>Seña aplicada</th>
                          <th>Saldo del turno</th>
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
                            const vFinal = Number(item.valorTotal || 0);
                            const vSena = Number(item.valorSeña || 0);
                            const vSaldo = Number(item.saldoPendiente ?? Math.max(0, vFinal - vSena));
                            return (
                              <tr key={item.id}>
                                <td style={{ textAlign: 'center' }}>{formatDateDisplay(item.fecha)}</td>
                                <td style={{ textAlign: 'center' }}>{item.horaInicio}</td>
                                <td style={{ fontWeight: 700 }}>{item.clienteNombre}</td>
                                <td>{item.origenCategoria || 'Orgánico'}</td>
                                <td>{item.metodoPagoLabel || 'Transferencia'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(vFinal)}</td>
                                <td style={{ textAlign: 'right' }}>{formatMoney(vSena)}</td>
                                <td style={{ textAlign: 'right' }}>{formatMoney(vSaldo)}</td>
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
                          <td>Valor total de turnos</td>
                          <td>{formatMoney(excelSummary.valorTotalTurnos)}</td>
                        </tr>
                        <tr>
                          <td>Total de señas aplicadas</td>
                          <td>{formatMoney(excelSummary.totalSenasAplicadas)}</td>
                        </tr>
                        <tr>
                          <td>Total de saldos</td>
                          <td>{formatMoney(excelSummary.totalSaldos)}</td>
                        </tr>
                        <tr>
                          <td>Valor en efectivo</td>
                          <td>{formatMoney(excelSummary.valorEfectivo)}</td>
                        </tr>
                        <tr>
                          <td>Valor en transferencia</td>
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
