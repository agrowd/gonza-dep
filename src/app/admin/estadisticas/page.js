'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './estadisticas.module.css';

// SVG Icons
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);

const METRIC_DEFINITIONS = [
  { id: 'realizados', label: '✅ Turnos Realizados', desc: 'Sesiones completadas (incluye Siguiente turno, Mantenimiento, Va a avisar y Finalizado)' },
  { id: 'senados', label: '💳 Turnos Señados / Confirmados', desc: 'Citas activas con seña registrada para fechas futuras' },
  { id: 'cancelados', label: '❌ Turnos Cancelados', desc: 'Citas canceladas y pérdida económica estimada' },
  { id: 'ausentes', label: '⚠️ Turnos Ausentes (No Asistió)', desc: 'Pacientes que faltaron a su turno y saldo perdido' },
  { id: 'sinMarcar', label: '⏳ Turnos Sin Marcar', desc: 'Turnos pasados que quedaron sin actualizar (requieren regularización)' },
  { id: 'vaAAvisar', label: '💬 Clientes "Va a avisar"', desc: 'Clientes cuyo último turno finalizó en "Va a avisar" (pérdida de turno no agendado)' },
  { id: 'mantenimiento', label: '🔄 Clientes "Mantenimiento"', desc: 'Clientes en etapa de mantenimiento (recordatorio a los 2.5 meses)' },
  { id: 'finalizo', label: '🏁 Clientes "Finalizó"', desc: 'Clientes con tratamiento completo finalizado' },
  { id: 'nuevos', label: '🌱 Clientes Nuevos', desc: 'Clientes que agendaron su primer turno, con desglose por canal de adquisición' },
  { id: 'zonas', label: '📍 Zonas Más Demandadas', desc: 'Ranking de zonas solicitadas con histograma y facturación' },
  { id: 'operador', label: '👤 Operador (Gonzalo)', desc: 'Desempeño, sesiones atendidas y comisiones' }
];

const CANAL_LABELS = {
  TODOS: 'Todos los canales',
  ORGANICO: 'Orgánico / Directo',
  PUBLICIDAD_IG: 'Instagram Ads',
  PUBLICIDAD_FB: 'Facebook Ads',
  GOOGLE: 'Google Search / Ads',
  RECOMENDACION: 'Recomendación',
  OTRO: 'Otro Canal'
};

export default function EstadisticasPage() {
  const router = useRouter();

  // Date Range State
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [activePreset, setActivePreset] = useState('mes'); // 'hoy', 'semana', 'mes', 'mes_pasado', 'custom'
  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(lastDayStr);

  // Tabs: 'avanzadas' (default) vs 'generales'
  const [activeTab, setActiveTab] = useState('avanzadas');

  // Advanced View: Active Metric & Exclusions
  const [selectedMetric, setSelectedMetric] = useState('realizados');
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [showDetailsTable, setShowDetailsTable] = useState(true);

  // Sub-filters for Nuevos and Zonas
  const [canalFilter, setCanalFilter] = useState('TODOS');
  const [zonaFilter, setZonaFilter] = useState('TODAS');
  const [zonaStateFilter, setZonaStateFilter] = useState('todos'); // 'todos', 'realizados', 'senados'

  // Data & Loading
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal Ficha del Cliente
  const [modalClient, setModalClient] = useState(null);
  const [loadingModalClient, setLoadingModalClient] = useState(false);

  // Helper date preset changer
  const applyPreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'hoy') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'semana') {
      const dayOfWeek = today.getDay();
      const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(sunday.toISOString().split('T')[0]);
    } else if (preset === 'mes') {
      const f = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const l = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(f);
      setEndDate(l);
    } else if (preset === 'mes_pasado') {
      const f = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const l = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(f);
      setEndDate(l);
    }
  };

  const fetchStats = () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    fetch(`/api/admin/estadisticas?start=${startDate}&end=${endDate}`)
      .then(res => res.json())
      .then(resData => {
        if (!resData.error) {
          setData(resData);
          setExcludedIds(new Set()); // reset exclusions on date change
        }
      })
      .catch(err => console.error('Error loading stats:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPercent = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Exclusion handler
  const handleExcludeItem = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleResetExclusions = () => {
    setExcludedIds(new Set());
  };

  // Navigation to Agenda
  const handleGoToTurnoInAgenda = (item) => {
    if (!item) return;
    router.push(`/admin/agenda?date=${item.fecha}&view=day&turnoId=${item.id}&fromStats=true`);
  };

  // Open Client Modal
  const handleOpenClientFicha = async (clienteId) => {
    if (!clienteId) return;
    setLoadingModalClient(true);
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}`);
      if (res.ok) {
        const cData = await res.json();
        setModalClient(cData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalClient(false);
    }
  };

  // Compute Active Metric Items and Dynamic KPIs
  const activeMetricData = useMemo(() => {
    if (!data || !data.avanzadas) return { items: [], count: 0, total: 0, ticketPromedio: 0, isLoss: false };

    let rawItems = [];
    let isLoss = false;

    if (selectedMetric === 'realizados') {
      rawItems = data.avanzadas.realizados?.items || [];
    } else if (selectedMetric === 'senados') {
      rawItems = data.avanzadas.senados?.items || [];
    } else if (selectedMetric === 'cancelados') {
      rawItems = data.avanzadas.cancelados?.items || [];
      isLoss = true;
    } else if (selectedMetric === 'ausentes') {
      rawItems = data.avanzadas.ausentes?.items || [];
      isLoss = true;
    } else if (selectedMetric === 'sinMarcar') {
      rawItems = data.avanzadas.sinMarcar?.items || [];
    } else if (selectedMetric === 'vaAAvisar') {
      rawItems = data.avanzadas.vaAAvisar?.items || [];
      isLoss = true;
    } else if (selectedMetric === 'mantenimiento') {
      rawItems = data.avanzadas.mantenimiento?.items || [];
    } else if (selectedMetric === 'finalizo') {
      rawItems = data.avanzadas.finalizo?.items || [];
    } else if (selectedMetric === 'nuevos') {
      rawItems = data.avanzadas.nuevos?.items || [];
      if (canalFilter !== 'TODOS') {
        rawItems = rawItems.filter(i => (i.canalAdquisicion || 'ORGANICO') === canalFilter);
      }
    } else if (selectedMetric === 'zonas') {
      // Find items in selected zone
      const allHist = data.avanzadas.zonas?.histograma || [];
      if (zonaFilter === 'TODAS') {
        rawItems = allHist.flatMap(z => z.items || []);
      } else {
        const matchedZ = allHist.find(z => z.nombre === zonaFilter);
        rawItems = matchedZ ? (matchedZ.items || []) : [];
      }
      if (zonaStateFilter === 'realizados') {
        rawItems = rawItems.filter(i => i.estado === 'REALIZADO' || ['SIGUIENTE_TURNO', 'VA_A_AVISAR', 'MANTENIMIENTO', 'FINALIZADO'].includes(i.subEstado));
      } else if (zonaStateFilter === 'senados') {
        rawItems = rawItems.filter(i => i.estado === 'SEÑADO');
      }
    } else if (selectedMetric === 'operador') {
      rawItems = data.avanzadas.operador?.items || [];
    }

    // Filter out user-excluded items
    const filteredItems = rawItems.filter(item => !excludedIds.has(item.id));

    // Calculate dynamic totals
    let computedTotal = 0;
    filteredItems.forEach(item => {
      if (selectedMetric === 'cancelados') {
        if (item.señaEstado === 'CONSERVADA') computedTotal += item.valorTotal;
        else if (item.señaEstado === 'PERDIDA') computedTotal += Math.max(0, item.valorTotal - item.valorSeña);
        else computedTotal += (item.valorTotal || 0);
      } else if (selectedMetric === 'ausentes') {
        computedTotal += (item.saldoPendiente > 0 ? item.saldoPendiente : Math.max(0, item.valorTotal - item.valorSeña));
      } else {
        computedTotal += (item.valorTotal || 0);
      }
    });

    const count = filteredItems.length;
    const ticketPromedio = count > 0 ? Math.round(computedTotal / count) : 0;

    return {
      items: filteredItems,
      count,
      total: computedTotal,
      ticketPromedio,
      isLoss
    };
  }, [data, selectedMetric, excludedIds, canalFilter, zonaFilter, zonaStateFilter]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Estadísticas & Reportes</h2>
          <p>Control financiero, métricas de fidelización y desglose operativo.</p>
        </div>

        {/* Date Presets and Controls */}
        <div className={styles.controls}>
          <div className={styles.presetsGroup}>
            <button
              className={`${styles.presetBtn} ${activePreset === 'hoy' ? styles.presetBtnActive : ''}`}
              onClick={() => applyPreset('hoy')}
            >
              Hoy
            </button>
            <button
              className={`${styles.presetBtn} ${activePreset === 'semana' ? styles.presetBtnActive : ''}`}
              onClick={() => applyPreset('semana')}
            >
              Esta Semana
            </button>
            <button
              className={`${styles.presetBtn} ${activePreset === 'mes' ? styles.presetBtnActive : ''}`}
              onClick={() => applyPreset('mes')}
            >
              Este Mes
            </button>
            <button
              className={`${styles.presetBtn} ${activePreset === 'mes_pasado' ? styles.presetBtnActive : ''}`}
              onClick={() => applyPreset('mes_pasado')}
            >
              Mes Anterior
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className={styles.dateInputGroup}>
              <label>Desde</label>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={(e) => {
                  setActivePreset('custom');
                  setStartDate(e.target.value);
                }}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label>Hasta</label>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                onChange={(e) => {
                  setActivePreset('custom');
                  setEndDate(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'avanzadas' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('avanzadas')}
        >
          ⚡ Estadísticas Avanzadas (Principal)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'generales' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('generales')}
        >
          📊 Estadísticas Generales (Renovada)
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Procesando métricas y contabilidad de señas...</p>
        </div>
      ) : !data ? (
        <div className={styles.loadingWrapper}>
          <p>No se encontraron datos para el período seleccionado.</p>
        </div>
      ) : (
        <>
          {/* BANNER DE CAJA DIARIA & FLUJO (REGLA GONZALO) */}
          <div className={styles.cajaBanner}>
            <div className={styles.cajaItem}>
              <span className={styles.cajaTitle}>Caja del Día (Hoy)</span>
              <span className={styles.cajaValue}>{formatMoney(data.caja?.hoy?.total)}</span>
              <div className={styles.cajaSub}>
                <span>🔹 Turnos cobrados hoy: <strong>{formatMoney(data.caja?.hoy?.entradasTurnos)}</strong></span>
                <span>🔸 Señas recibidas hoy: <strong>{formatMoney(data.caja?.hoy?.entradasSenas)}</strong></span>
              </div>
            </div>

            <div className={styles.cajaItem}>
              <span className={styles.cajaTitle}>Caja de la Semana</span>
              <span className={styles.cajaValue}>{formatMoney(data.caja?.semana?.total)}</span>
              <div className={styles.cajaSub}>
                <span>🔹 Saldos de turnos: <strong>{formatMoney(data.caja?.semana?.entradasTurnos)}</strong></span>
                <span>🔸 Señas de la semana: <strong>{formatMoney(data.caja?.semana?.entradasSenas)}</strong></span>
              </div>
            </div>

            <div className={styles.cajaItem}>
              <span className={styles.cajaTitle}>Total Período Seleccionado</span>
              <span className={styles.cajaValue} style={{ color: 'var(--color-gold)' }}>
                {formatMoney(data.caja?.periodo?.total)}
              </span>
              <div className={styles.cajaSub}>
                <span>🔹 Turnos realizados: <strong>{formatMoney(data.caja?.periodo?.entradasTurnos)}</strong></span>
                <span>🔸 Señas captadas: <strong>{formatMoney(data.caja?.periodo?.entradasSenas)}</strong></span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: ESTADÍSTICAS AVANZADAS (VISTA PRINCIPAL)          */}
          {/* ======================================================== */}
          {activeTab === 'avanzadas' && (
            <>
              {/* Selector de Métrica */}
              <div className={styles.metricSelectorCard}>
                <div className={styles.metricSelectorHeader}>
                  <label>
                    <CalendarIcon /> Seleccionar Métrica a Analizar:
                  </label>
                  <select
                    className={styles.metricDropdown}
                    value={selectedMetric}
                    onChange={(e) => {
                      setSelectedMetric(e.target.value);
                      setExcludedIds(new Set()); // reset exclusions
                    }}
                  >
                    {METRIC_DEFINITIONS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {METRIC_DEFINITIONS.find(m => m.id === selectedMetric)?.desc}
                </div>
              </div>

              {/* KPI Cards de la Métrica Seleccionada */}
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Cantidad de Registros</div>
                  <div className={styles.kpiValue}>{activeMetricData.count}</div>
                  <div className={styles.kpiSub}>
                    {excludedIds.size > 0 ? `(${excludedIds.size} temporalmente excluidos)` : 'Total en período'}
                  </div>
                </div>

                <div className={`${styles.kpiCard} ${activeMetricData.isLoss ? styles.kpiCardDanger : ''}`}>
                  <div className={styles.kpiLabel}>
                    {activeMetricData.isLoss ? 'Pérdida Económica Estimada' : 'Facturación / Valor Total'}
                  </div>
                  <div className={styles.kpiValue} style={{ color: activeMetricData.isLoss ? '#ff4d4f' : 'var(--color-gold)' }}>
                    {formatMoney(activeMetricData.total)}
                  </div>
                  <div className={styles.kpiSub}>
                    {activeMetricData.isLoss ? 'Ingresos no percibidos' : 'Suma de importes'}
                  </div>
                </div>

                {!activeMetricData.isLoss && selectedMetric !== 'sinMarcar' && (
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Ticket Promedio</div>
                    <div className={styles.kpiValue}>{formatMoney(activeMetricData.ticketPromedio)}</div>
                    <div className={styles.kpiSub}>Por turno / cliente</div>
                  </div>
                )}
              </div>

              {/* Sub-filtros específicos e Histogramas */}
              {selectedMetric === 'nuevos' && (
                <div className={styles.histogramCard}>
                  <div className={styles.histogramTitle}>
                    <span>📊 Clientes Nuevos por Canal de Adquisición</span>
                  </div>

                  {/* Filter Pills */}
                  <div className={styles.pillsRow}>
                    {Object.keys(CANAL_LABELS).map(k => (
                      <button
                        key={k}
                        className={`${styles.pillBtn} ${canalFilter === k ? styles.pillBtnActive : ''}`}
                        onClick={() => setCanalFilter(k)}
                      >
                        {CANAL_LABELS[k]} {data.avanzadas?.nuevos?.canales?.[k] !== undefined && `(${data.avanzadas.nuevos.canales[k]})`}
                      </button>
                    ))}
                  </div>

                  {/* Bars */}
                  <div className={styles.barsContainer}>
                    {Object.entries(data.avanzadas?.nuevos?.canales || {}).map(([canalKey, count]) => {
                      const totalNuevos = data.avanzadas?.nuevos?.count || 1;
                      const pct = Math.round((count / (totalNuevos || 1)) * 100);
                      return (
                        <div key={canalKey} className={styles.barRow}>
                          <div className={styles.barName}>{CANAL_LABELS[canalKey] || canalKey}</div>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${Math.max(2, pct)}%` }}></div>
                          </div>
                          <div className={styles.barStat}>
                            {count} <span className={styles.barStatSub}>({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedMetric === 'zonas' && (
                <div className={styles.histogramCard}>
                  <div className={styles.histogramTitle}>
                    <span>📍 Ranking de Zonas Más Solicitadas</span>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className={styles.pillsRow}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', alignSelf: 'center', fontWeight: 600 }}>
                        Estado:
                      </span>
                      <button
                        className={`${styles.pillBtn} ${zonaStateFilter === 'todos' ? styles.pillBtnActive : ''}`}
                        onClick={() => setZonaStateFilter('todos')}
                      >
                        Todos
                      </button>
                      <button
                        className={`${styles.pillBtn} ${zonaStateFilter === 'realizados' ? styles.pillBtnActive : ''}`}
                        onClick={() => setZonaStateFilter('realizados')}
                      >
                        Solo Realizados
                      </button>
                      <button
                        className={`${styles.pillBtn} ${zonaStateFilter === 'senados' ? styles.pillBtnActive : ''}`}
                        onClick={() => setZonaStateFilter('senados')}
                      >
                        Solo Señados
                      </button>
                    </div>

                    <div className={styles.pillsRow}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', alignSelf: 'center', fontWeight: 600 }}>
                        Zona:
                      </span>
                      <button
                        className={`${styles.pillBtn} ${zonaFilter === 'TODAS' ? styles.pillBtnActive : ''}`}
                        onClick={() => setZonaFilter('TODAS')}
                      >
                        Todas las zonas
                      </button>
                      {(data.avanzadas?.zonas?.catalog || []).map(zName => (
                        <button
                          key={zName}
                          className={`${styles.pillBtn} ${zonaFilter === zName ? styles.pillBtnActive : ''}`}
                          onClick={() => setZonaFilter(zName)}
                        >
                          {zName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bars Ranking */}
                  <div className={styles.barsContainer}>
                    {(data.avanzadas?.zonas?.histograma || [])
                      .filter(z => zonaFilter === 'TODAS' || z.nombre === zonaFilter)
                      .slice(0, 10)
                      .map((z) => {
                        const maxCount = data.avanzadas?.zonas?.histograma?.[0]?.total || 1;
                        const pct = Math.round((z.total / (maxCount || 1)) * 100);
                        return (
                          <div key={z.nombre} className={styles.barRow}>
                            <div className={styles.barName} title={z.nombre}>{z.nombre}</div>
                            <div className={styles.barTrack}>
                              <div className={styles.barFill} style={{ width: `${Math.max(2, pct)}%` }}></div>
                            </div>
                            <div className={styles.barStat}>
                              {z.total} <span className={styles.barStatSub}>turnos</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* SECCIÓN DESPLEGABLE "DETALLES" */}
              <div className={styles.detailsSection}>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsTitle}>
                    <span>📋 DETALLES ({activeMetricData.items.length} turnos)</span>
                  </div>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setShowDetailsTable(!showDetailsTable)}
                  >
                    {showDetailsTable ? '▲ Ocultar Detalles' : '▼ Mostrar Detalles'}
                  </button>
                </div>

                {/* Exclusion Alert Banner */}
                {excludedIds.size > 0 && (
                  <div className={styles.exclusionBanner}>
                    <span>
                      ⚠️ Has excluido temporalmente a <strong>{excludedIds.size}</strong> turno(s)/cliente(s). Los totales se recalcularon en vivo.
                    </span>
                    <button className={styles.btnResetExclusion} onClick={handleResetExclusions}>
                      🔄 Restablecer Lista Original
                    </button>
                  </div>
                )}

                {showDetailsTable && (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Fecha & Hora</th>
                          <th className={styles.th}>Cliente</th>
                          <th className={styles.th}>Zonas</th>
                          <th className={styles.th}>Valor</th>
                          <th className={styles.th}>Seña</th>
                          <th className={styles.th}>Saldo</th>
                          <th className={styles.th}>Estado</th>
                          <th className={styles.th} style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMetricData.items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className={styles.td} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                              No hay turnos para mostrar con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          activeMetricData.items.map(item => (
                            <tr key={item.id} className={styles.tr}>
                              <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, color: '#fff' }}>{item.fecha}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {item.horaInicio} - {item.horaFin} ({item.duracionMinutos} min)
                                </div>
                              </td>

                              <td className={styles.td}>
                                <div style={{ fontWeight: 700, color: 'var(--color-gold)' }}>
                                  {item.clienteNombre}
                                </div>
                                {item.clienteWhatsapp && (
                                  <a
                                    href={`https://wa.me/${item.clienteWhatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#4cd964', textDecoration: 'none' }}
                                  >
                                    <WhatsAppIcon /> {item.clienteWhatsapp}
                                  </a>
                                )}
                              </td>

                              <td className={styles.td} style={{ maxWidth: '200px' }}>
                                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', whiteSpace: 'normal' }}>
                                  {item.zonasTexto}
                                </div>
                              </td>

                              <td className={styles.td} style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                {formatMoney(item.valorTotal)}
                              </td>

                              <td className={styles.td} style={{ color: 'var(--color-gold)', whiteSpace: 'nowrap' }}>
                                {formatMoney(item.valorSeña)}
                              </td>

                              <td className={styles.td} style={{ color: item.saldoPendiente > 0 ? '#ffc107' : '#4cd964', whiteSpace: 'nowrap' }}>
                                {formatMoney(item.saldoPendiente)}
                              </td>

                              <td className={styles.td}>
                                <span className={`${styles.badgeStatus} ${
                                  item.estado === 'REALIZADO' ? styles.statusRealizado :
                                  item.estado === 'SEÑADO' ? styles.statusSenado :
                                  item.estado === 'CANCELADO' ? styles.statusCancelado :
                                  styles.statusNoAsistio
                                }`}>
                                  {item.estado}
                                </span>
                                {item.subEstado && (
                                  <span className={`${styles.badgeStatus} ${styles.statusSubEstado}`}>
                                    {item.subEstado.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </td>

                              <td className={styles.td}>
                                <div className={styles.actionsCell}>
                                  {/* Botón X para excluir del cálculo */}
                                  <button
                                    className={styles.btnActionX}
                                    title="Excluir temporalmente este turno del cálculo de estadísticas"
                                    onClick={() => handleExcludeItem(item.id)}
                                  >
                                    ✕
                                  </button>

                                  {/* Botón Turno a Agenda */}
                                  <button
                                    className={styles.btnActionTurno}
                                    title="Abrir este turno en la Agenda"
                                    onClick={() => handleGoToTurnoInAgenda(item)}
                                  >
                                    <ExternalLinkIcon /> Turno
                                  </button>

                                  {/* Botón Ficha */}
                                  <button
                                    className={styles.btnActionFicha}
                                    title="Ver Ficha Histórica del Paciente"
                                    onClick={() => handleOpenClientFicha(item.clienteId)}
                                  >
                                    <UserIcon /> Ficha
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ESTADÍSTICAS GENERALES (RENOVADA)                  */}
          {/* ======================================================== */}
          {activeTab === 'generales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Total Turnos Período</div>
                  <div className={styles.kpiValue}>{data.generales?.turnos?.total}</div>
                  <div className={styles.kpiSub}>Citas agendadas</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Turnos Realizados</div>
                  <div className={styles.kpiValue} style={{ color: '#4cd964' }}>
                    {data.generales?.turnos?.realizados}
                  </div>
                  <div className={styles.kpiSub}>
                    {getPercent(data.generales?.turnos?.realizados, data.generales?.turnos?.total)}% de efectividad
                  </div>
                </div>

                <div className={`${styles.kpiCard} ${styles.kpiCardDanger}`}>
                  <div className={styles.kpiLabel}>Cancelados + Ausencias</div>
                  <div className={styles.kpiValue} style={{ color: '#ff4d4f' }}>
                    {(data.generales?.turnos?.cancelados || 0) + (data.generales?.turnos?.ausentes || 0)}
                  </div>
                  <div className={styles.kpiSub}>
                    Pérdida total: {formatMoney(data.generales?.perdidas?.total)}
                  </div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Clientes "Va a avisar"</div>
                  <div className={styles.kpiValue} style={{ color: '#ffc107' }}>
                    {data.generales?.turnos?.vaAAvisar}
                  </div>
                  <div className={styles.kpiSub}>Pendientes de agendar</div>
                </div>
              </div>

              {/* Grid 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Desglose de Clientes */}
                <div className={styles.histogramCard}>
                  <div className={styles.histogramTitle}>
                    <span>👥 Rendimiento de Clientes</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Clientes Atendidos en Período:</span>
                      <strong style={{ color: '#fff' }}>{data.generales?.clientes?.activosConTurno}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Clientes Nuevos:</span>
                      <strong style={{ color: '#4cd964' }}>{data.generales?.clientes?.nuevosCreados}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Clientes en Mantenimiento:</span>
                      <strong style={{ color: 'var(--color-gold)' }}>{data.avanzadas?.mantenimiento?.count || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Clientes Finalizados:</span>
                      <strong style={{ color: '#fff' }}>{data.generales?.turnos?.finalizado}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Ticket Promedio por Paciente:</span>
                      <strong style={{ color: 'var(--color-gold)' }}>{formatMoney(data.generales?.ganancias?.promedioPorCliente)}</strong>
                    </div>
                  </div>
                </div>

                {/* Desglose de Pérdidas */}
                <div className={styles.histogramCard}>
                  <div className={styles.histogramTitle}>
                    <span>⚠️ Desglose de Pérdidas Económicas</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pérdidas por Cancelaciones:</span>
                      <strong style={{ color: '#ff4d4f' }}>{formatMoney(data.generales?.perdidas?.porCancelaciones)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pérdidas por Ausencias (No Asistió):</span>
                      <strong style={{ color: '#ff4d4f' }}>{formatMoney(data.generales?.perdidas?.porAusencias)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pérdida Potencial Clientes "Va a avisar":</span>
                      <strong style={{ color: '#ffc107' }}>{formatMoney(data.avanzadas?.vaAAvisar?.totalPerdida)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Total Pérdidas Directas:</span>
                      <strong style={{ color: '#ff4d4f', fontSize: '1.1rem' }}>{formatMoney(data.generales?.perdidas?.total)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
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
                  <span className={styles.modalFieldValue} style={{ color: 'var(--color-gold)' }}>{modalClient.estado}</span>
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

              {/* Botón para ver la ficha completa en Clientes */}
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
