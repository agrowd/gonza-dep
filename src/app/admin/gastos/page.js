'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './gastos.module.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const PRESET_COLORS = [
  '#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#d4a54d'
];

function formatCurrency(amount) {
  const num = Math.round(Number(amount) || 0);
  return '$' + num.toLocaleString('es-AR');
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

function getCategoryVisuals(nombre, color) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('insumo') || n.includes('compra') || n.includes('descartable')) {
    return { icon: '🛒', bg: '#fee2e2', color: '#ef4444' };
  }
  if (n.includes('comida') || n.includes('bebida') || n.includes('almuerzo') || n.includes('cena')) {
    return { icon: '🍴', bg: '#ffedd5', color: '#f97316' };
  }
  if (n.includes('servicio') || n.includes('alquiler') || n.includes('luz') || n.includes('internet') || n.includes('local')) {
    return { icon: '🏬', bg: '#f3e8ff', color: '#a855f7' };
  }
  if (n.includes('transporte') || n.includes('viaje') || n.includes('auto') || n.includes('combustible')) {
    return { icon: '🚗', bg: '#e0f2fe', color: '#0284c7' };
  }
  if (n.includes('sueldo') || n.includes('honorario') || n.includes('personal')) {
    return { icon: '👥', bg: '#dcfce7', color: '#16a34a' };
  }
  if (n.includes('publicidad') || n.includes('marketing') || n.includes('redes') || n.includes('anuncio')) {
    return { icon: '📣', bg: '#fef9c3', color: '#ca8a04' };
  }
  if (n.includes('transferencia') || n.includes('banco')) {
    return { icon: '⇄', bg: '#ccfbf1', color: '#0d9488' };
  }
  if (n.includes('mantenimiento') || n.includes('máquina') || n.includes('maquina')) {
    return { icon: '🔧', bg: '#fef3c7', color: '#d97706' };
  }
  if (n.includes('impuesto') || n.includes('tasa') || n.includes('afip')) {
    return { icon: '📑', bg: '#fce7f3', color: '#db2777' };
  }
  return {
    icon: '🏷️',
    bg: `${color || '#64748b'}22`,
    color: color || '#64748b'
  };
}

function formatGroupDayTitle(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const day = d;
  const monthName = dateObj.toLocaleDateString('es-AR', { month: 'long' });
  return `${day} de ${monthName}`;
}

export default function GastosPage() {
  const defaultRange = useMemo(() => getMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [activeTab, setActiveTab] = useState('historial'); // 'historial' | 'categorias'
  const [collapsedDays, setCollapsedDays] = useState(new Set());

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('ALL');

  // Gasto Modal
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [gastoForm, setGastoForm] = useState({
    concepto: '',
    monto: '',
    fecha: '',
    categoriaId: '',
    observaciones: ''
  });
  const [savingGasto, setSavingGasto] = useState(false);
  const [gastoError, setGastoError] = useState('');

  // Categoria Modal
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [categoriaForm, setCategoriaForm] = useState({
    nombre: '',
    color: '#0284c7'
  });
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [categoriaError, setCategoriaError] = useState('');

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'gasto' | 'categoria', id: string, name: string }
  const [deleting, setDeleting] = useState(false);

  // Fetch gastos data for the selected date range
  const fetchGastosData = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/gastos?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error('Error fetching gastos');
      }
    } catch (err) {
      console.error('Error in fetchGastosData:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Fetch categories
  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gastos/categorias', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setCategorias(json.categorias || []);
      }
    } catch (err) {
      console.error('Error fetching categorias:', err);
    }
  }, []);

  useEffect(() => {
    fetchGastosData();
    fetchCategorias();
  }, [fetchGastosData, fetchCategorias]);

  // Presets de fechas
  const handlePresetDate = (type) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const formatDateStr = (dateObj) => {
      const yy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    if (type === 'hoy') {
      const todayStr = formatDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'ayer') {
      const yesterday = new Date(y, m, d - 1);
      const yesterdayStr = formatDateStr(yesterday);
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (type === 'semana') {
      const dayOfWeek = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(d - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(formatDateStr(monday));
      setEndDate(formatDateStr(sunday));
    } else if (type === 'mes') {
      const { start, end } = getMonthRange();
      setStartDate(start);
      setEndDate(end);
    } else if (type === 'mes_anterior') {
      const prevY = m === 0 ? y - 1 : y;
      const prevM = m === 0 ? 11 : m - 1;
      const start = `${prevY}-${String(prevM + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(prevY, prevM + 1, 0).getDate();
      const end = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Filtered gastos list
  const filteredGastos = useMemo(() => {
    if (!data?.gastos) return [];
    return data.gastos.filter(g => {
      const matchSearch = !searchQuery.trim() ||
        g.concepto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.observaciones && g.observaciones.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = filterCategoria === 'ALL' || g.categoriaId === filterCategoria;

      return matchSearch && matchCat;
    });
  }, [data?.gastos, searchQuery, filterCategoria]);

  // Agrupación por día para visualización móvil cómoda
  const groupedGastosByDay = useMemo(() => {
    const groups = {};
    filteredGastos.forEach(g => {
      const dateKey = g.fecha;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          total: 0,
          items: []
        };
      }
      groups[dateKey].items.push(g);
      groups[dateKey].total += (Number(g.monto) || 0);
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredGastos]);

  const toggleCollapseDay = (dateKey) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  // Handle open create gasto
  const handleOpenCreateGasto = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const initialDate = (todayStr >= startDate && todayStr <= endDate) ? todayStr : endDate;

    setEditingGasto(null);
    setGastoForm({
      concepto: '',
      monto: '',
      fecha: initialDate,
      categoriaId: categorias[0]?.id || '',
      observaciones: ''
    });
    setGastoError('');
    setShowGastoModal(true);
  };

  // Handle open edit gasto
  const handleOpenEditGasto = (gasto) => {
    setEditingGasto(gasto);
    setGastoForm({
      concepto: gasto.concepto,
      monto: String(gasto.monto),
      fecha: gasto.fecha,
      categoriaId: gasto.categoriaId,
      observaciones: gasto.observaciones || ''
    });
    setGastoError('');
    setShowGastoModal(true);
  };

  // Handle save gasto
  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (!gastoForm.concepto.trim()) {
      setGastoError('Ingresá el concepto del gasto.');
      return;
    }
    const num = parseFloat(gastoForm.monto);
    if (isNaN(num) || num <= 0) {
      setGastoError('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (!gastoForm.categoriaId) {
      setGastoError('Seleccioná una categoría.');
      return;
    }

    setSavingGasto(true);
    setGastoError('');

    try {
      const url = editingGasto
        ? `/api/admin/gastos/${editingGasto.id}`
        : '/api/admin/gastos';

      const method = editingGasto ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gastoForm),
        credentials: 'include'
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al guardar el gasto');
      }

      setShowGastoModal(false);
      await fetchGastosData();
      await fetchCategorias();
    } catch (err) {
      setGastoError(err.message);
    } finally {
      setSavingGasto(false);
    }
  };

  // Handle open create categoria
  const handleOpenCreateCategoria = () => {
    setEditingCategoria(null);
    setCategoriaForm({
      nombre: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
    });
    setCategoriaError('');
    setShowCategoriaModal(true);
  };

  // Handle open edit categoria
  const handleOpenEditCategoria = (cat) => {
    setEditingCategoria(cat);
    setCategoriaForm({
      nombre: cat.nombre,
      color: cat.color || '#0284c7'
    });
    setCategoriaError('');
    setShowCategoriaModal(true);
  };

  // Handle save categoria
  const handleSaveCategoria = async (e) => {
    e.preventDefault();
    if (!categoriaForm.nombre.trim()) {
      setCategoriaError('Ingresá el nombre de la categoría.');
      return;
    }

    setSavingCategoria(true);
    setCategoriaError('');

    try {
      const method = editingCategoria ? 'PUT' : 'POST';
      const bodyPayload = editingCategoria
        ? { id: editingCategoria.id, ...categoriaForm }
        : categoriaForm;

      const res = await fetch('/api/admin/gastos/categorias', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        credentials: 'include'
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al guardar categoría');
      }

      setShowCategoriaModal(false);
      await fetchCategorias();
      await fetchGastosData();
    } catch (err) {
      setCategoriaError(err.message);
    } finally {
      setSavingCategoria(false);
    }
  };

  // Handle execute delete
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      if (deleteTarget.type === 'gasto') {
        const res = await fetch(`/api/admin/gastos/${deleteTarget.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Error al eliminar el gasto');
      } else if (deleteTarget.type === 'categoria') {
        const res = await fetch(`/api/admin/gastos/categorias?id=${deleteTarget.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Error al eliminar categoría');
        }
      }

      setDeleteTarget(null);
      await fetchGastosData();
      await fetchCategorias();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const totales = data?.totales || {
    totalGastosMes: 0,
    totalGastosMesAnterior: 0,
    variacionPorcentual: 0,
    totalEntradasMes: 0,
    balanceNeto: 0
  };

  const topCategory = data?.desgloseCategorias?.[0] || null;

  return (
    <div className={styles.container}>
      {/* Header & Controls */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>💸 Gestión de Gastos y Balance</h2>
          <p>Control de egresos operativos, entradas reales y balance financiero</p>
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

          <div className={styles.quickPresetsRow}>
            <button type="button" onClick={() => handlePresetDate('hoy')} className={styles.btnPreset}>Hoy</button>
            <button type="button" onClick={() => handlePresetDate('ayer')} className={styles.btnPreset}>Ayer</button>
            <button type="button" onClick={() => handlePresetDate('semana')} className={styles.btnPreset}>Esta Semana</button>
            <button type="button" onClick={() => handlePresetDate('mes')} className={styles.btnPreset}>Este Mes</button>
            <button type="button" onClick={() => handlePresetDate('mes_anterior')} className={styles.btnPreset}>Mes Anterior</button>
          </div>

          <button
            type="button"
            className={styles.btnRefresh}
            onClick={fetchGastosData}
            title="Recargar datos actualizados en vivo"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} Actualizar
          </button>

          <button onClick={handleOpenCreateGasto} className={styles.btnPrimary}>
            <span>+</span> Nuevo Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* Gastos */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Gastos</span>
            <span className={styles.kpiIcon}>💸</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#dc2626' }}>
            {formatCurrency(totales.totalGastosMes)}
          </div>
          <div className={styles.kpiSub}>
            {totales.totalGastosMesAnterior > 0 ? (
              <>
                <span className={totales.variacionPorcentual > 0 ? styles.badgeTrendRed : styles.badgeTrendGreen}>
                  {totales.variacionPorcentual > 0 ? `+${totales.variacionPorcentual}%` : `${totales.variacionPorcentual}%`}
                </span>
                <span style={{ color: '#475569' }}>
                  vs período anterior ({formatCurrency(totales.totalGastosMesAnterior)})
                </span>
              </>
            ) : (
              <span style={{ color: '#475569' }}>Sin gastos período anterior</span>
            )}
          </div>
        </div>

        {/* Entradas */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Entradas</span>
            <span className={styles.kpiIcon}>💰</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#16a34a' }}>
            {formatCurrency(totales.totalEntradasMes)}
          </div>
          <div className={styles.kpiSub} style={{ color: '#475569' }}>
            Turnos cobrados + señas recibidas
          </div>
        </div>

        {/* Balance Neto */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Balance Neto</span>
            <span className={styles.kpiIcon}>⚖️</span>
          </div>
          <div className={`${styles.kpiValue} ${totales.balanceNeto >= 0 ? styles.balancePositive : styles.balanceNegative}`}>
            {formatCurrency(totales.balanceNeto)}
          </div>
          <div className={styles.kpiSub} style={{ color: '#475569' }}>
            {totales.balanceNeto >= 0 ? '🟢 Ganancia neta operativa' : '🔴 Déficit operativo en el período'}
          </div>
        </div>
      </div>

      {/* Distribution Section (if any expenses) */}
      {data?.desgloseCategorias?.length > 0 && (
        <div className={styles.categoriesCard}>
          <div className={styles.categoriesHeader}>
            <h3>Distribución de Gastos por Categoría</h3>
            <span style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 700 }}>
              {data.desgloseCategorias.length} categorías activas
            </span>
          </div>

          {/* Bar */}
          <div className={styles.distributionBar}>
            {data.desgloseCategorias.map(cat => (
              <div
                key={cat.id}
                className={styles.distributionSegment}
                style={{
                  width: `${cat.porcentaje}%`,
                  background: cat.color
                }}
                title={`${cat.nombre}: ${formatCurrency(cat.total)} (${cat.porcentaje}%)`}
              />
            ))}
          </div>

          {/* Pills */}
          <div className={styles.categoriesPillsGrid}>
            {data.desgloseCategorias.map(cat => (
              <div key={cat.id} className={styles.categoryPill}>
                <div className={styles.categoryPillLeft}>
                  <div className={styles.categoryDot} style={{ background: cat.color }} />
                  <span className={styles.categoryPillName}>{cat.nombre}</span>
                </div>
                <div className={styles.categoryPillRight}>
                  <span className={styles.categoryPillAmount}>{formatCurrency(cat.total)}</span>
                  <span className={styles.categoryPillPercent}>{cat.porcentaje}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('historial')}
          className={`${styles.tabBtn} ${activeTab === 'historial' ? styles.tabBtnActive : ''}`}
        >
          📋 Historial de Gastos ({filteredGastos.length})
        </button>
        <button
          onClick={() => setActiveTab('categorias')}
          className={`${styles.tabBtn} ${activeTab === 'categorias' ? styles.tabBtnActive : ''}`}
        >
          ⚙️ Categorías ({categorias.length})
        </button>
      </div>

      {/* TAB 1: HISTORIAL DE GASTOS */}
      {activeTab === 'historial' && (
        <div className={styles.tableCard}>
          <div style={{ padding: '1.25rem 1.4rem' }}>
            <div className={styles.tableToolbar}>
              <input
                type="text"
                placeholder="🔍 Buscar por concepto u observación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className={styles.categoryFilterSelect}
                >
                  <option value="ALL">Todas las categorías</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className={styles.emptyState}>
                <p>Cargando gastos del período...</p>
              </div>
            ) : filteredGastos.length === 0 ? (
              <div className={styles.emptyState}>
                <span style={{ fontSize: '2.5rem' }}>🧾</span>
                <p>No hay gastos registrados en el período seleccionado.</p>
                <button
                  onClick={handleOpenCreateGasto}
                  className={styles.btnPrimary}
                  style={{ marginTop: '1rem' }}
                >
                  + Cargar Primer Gasto
                </button>
              </div>
            ) : (
              <>
                {/* VISTA ESCRITORIO (Tabla horizontal) */}
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Categoría</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                        <th>Observaciones</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGastos.map(gasto => {
                        const [y, m, d] = (gasto.fecha || '').split('-');
                        const formattedDate = d && m && y ? `${d}/${m}/${y}` : gasto.fecha;

                        return (
                          <tr key={gasto.id}>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#1d1d1d' }}>
                              {formattedDate}
                            </td>
                            <td style={{ fontWeight: 700, color: '#1d1d1d' }}>
                              {gasto.concepto}
                            </td>
                            <td>
                              <span
                                className={styles.categoryBadge}
                                style={{
                                  background: `${gasto.categoriaColor}22`,
                                  color: '#1d1d1d',
                                  border: `1.5px solid ${gasto.categoriaColor}`
                                }}
                              >
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: gasto.categoriaColor
                                }} />
                                {gasto.categoriaNombre}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626', fontSize: '0.96rem' }}>
                              {formatCurrency(gasto.monto)}
                            </td>
                            <td style={{ color: '#475569', maxWidth: '280px' }}>
                              {gasto.observaciones || '—'}
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => handleOpenEditGasto(gasto)}
                                className={styles.actionBtn}
                                title="Editar gasto"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'gasto', id: gasto.id, name: gasto.concepto })}
                                className={styles.actionBtn}
                                title="Eliminar gasto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* VISTA MÓVIL AGRUPADA POR DÍA (Formato cómodo sin scroll horizontal) */}
                <div className={styles.mobileGastosList}>
                  {groupedGastosByDay.map(group => {
                    const isCollapsed = collapsedDays.has(group.dateKey);
                    return (
                      <div key={group.dateKey} className={styles.mobileDayCard}>
                        <div
                          className={styles.mobileDayHeader}
                          onClick={() => toggleCollapseDay(group.dateKey)}
                        >
                          <div className={styles.mobileDayTitle}>
                            {formatGroupDayTitle(group.dateKey)}
                          </div>
                          <div className={styles.mobileDayHeaderRight}>
                            <span className={styles.mobileDayTotalBadge}>
                              {formatCurrency(group.total)}
                            </span>
                            <span className={styles.mobileDayChevron}>
                              {isCollapsed ? '▾' : '▴'}
                            </span>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className={styles.mobileDayItemsList}>
                            {group.items.map(gasto => {
                              const visuals = getCategoryVisuals(gasto.categoriaNombre, gasto.categoriaColor);
                              return (
                                <div
                                  key={gasto.id}
                                  className={styles.mobileGastoItem}
                                  onClick={() => handleOpenEditGasto(gasto)}
                                  title="Tocar para editar o eliminar gasto"
                                >
                                  <div
                                    className={styles.mobileGastoAvatar}
                                    style={{ background: visuals.bg, color: visuals.color }}
                                  >
                                    <span>{visuals.icon}</span>
                                  </div>
                                  <div className={styles.mobileGastoInfo}>
                                    <div className={styles.mobileGastoCategory}>
                                      {gasto.categoriaNombre}
                                    </div>
                                    <div className={styles.mobileGastoConcept}>
                                      {gasto.concepto}
                                      {gasto.observaciones ? ` • ${gasto.observaciones}` : ''}
                                    </div>
                                  </div>
                                  <div className={styles.mobileGastoAmountCol}>
                                    <div className={styles.mobileGastoMonto}>
                                      - {formatCurrency(gasto.monto)}
                                    </div>
                                    <div className={styles.mobileGastoHora}>
                                      {gasto.hora || '12:00'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <div className={styles.tableCard}>
          <div style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1d1d1d', fontWeight: 800 }}>
                  Categorías de Gastos
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                  Clasificá tus costos para comparar en qué área se concentra el presupuesto
                </p>
              </div>

              <button onClick={handleOpenCreateCategoria} className={styles.btnPrimary}>
                <span>+</span> Nueva Categoría
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Nombre de Categoría</th>
                    <th style={{ textAlign: 'center' }}>Gastos Registrados</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ width: '60px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: cat.color,
                            border: '1.5px solid rgba(0, 0, 0, 0.15)'
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 700, color: '#1d1d1d', fontSize: '0.94rem' }}>
                        {cat.nombre}
                      </td>
                      <td style={{ textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                        {cat.cantidadGastos || 0} gastos
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenEditCategoria(cat)}
                          className={styles.actionBtn}
                          title="Editar categoría"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'categoria', id: cat.id, name: cat.nombre })}
                          className={styles.actionBtn}
                          title="Eliminar categoría"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARGAR / EDITAR GASTO */}
      {showGastoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGastoModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingGasto ? '✏️ Editar Gasto' : '💸 Cargar Nuevo Gasto'}</h3>
              <button onClick={() => setShowGastoModal(false)} className={styles.modalCloseBtn}>
                &times;
              </button>
            </div>

            {gastoError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 600
              }}>
                ⚠️ {gastoError}
              </div>
            )}

            <form onSubmit={handleSaveGasto} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Concepto / Detalle *</label>
                <input
                  type="text"
                  placeholder="Ej: Insumos de cera, Alquiler local, Honorarios..."
                  value={gastoForm.concepto}
                  onChange={(e) => setGastoForm({ ...gastoForm, concepto: e.target.value })}
                  className={styles.formInput}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className={styles.formGroup}>
                  <label>Monto ($ ARS) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="Ej: 35000"
                    value={gastoForm.monto}
                    onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                    className={styles.formInput}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Fecha *</label>
                  <input
                    type="date"
                    value={gastoForm.fecha}
                    onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })}
                    className={styles.formInput}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Categoría *</label>
                <select
                  value={gastoForm.categoriaId}
                  onChange={(e) => setGastoForm({ ...gastoForm, categoriaId: e.target.value })}
                  className={styles.formSelect}
                  required
                >
                  <option value="" disabled>Seleccioná una categoría</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Observaciones (opcional)</label>
                <textarea
                  placeholder="Detalles adicionales, proveedor, nro de comprobante..."
                  value={gastoForm.observaciones}
                  onChange={(e) => setGastoForm({ ...gastoForm, observaciones: e.target.value })}
                  className={styles.formTextarea}
                  rows={2}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowGastoModal(false)}
                  className={styles.btnSecondary}
                  disabled={savingGasto}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingGasto}
                >
                  {savingGasto ? 'Guardando...' : (editingGasto ? 'Guardar Cambios' : 'Registrar Gasto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA / EDITAR CATEGORÍA */}
      {showCategoriaModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCategoriaModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingCategoria ? '✏️ Editar Categoría' : '🏷️ Nueva Categoría'}</h3>
              <button onClick={() => setShowCategoriaModal(false)} className={styles.modalCloseBtn}>
                &times;
              </button>
            </div>

            {categoriaError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 600
              }}>
                ⚠️ {categoriaError}
              </div>
            )}

            <form onSubmit={handleSaveCategoria} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nombre de la Categoría *</label>
                <input
                  type="text"
                  placeholder="Ej: Insumos, Publicidad, Impuestos..."
                  value={categoriaForm.nombre}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
                  className={styles.formInput}
                  autoFocus
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Color Identificador</label>
                <div className={styles.colorPickerGroup}>
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setCategoriaForm({ ...categoriaForm, color: c })}
                      className={`${styles.colorSwatch} ${categoriaForm.color === c ? styles.colorSwatchActive : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowCategoriaModal(false)}
                  className={styles.btnSecondary}
                  disabled={savingCategoria}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingCategoria}
                >
                  {savingCategoria ? 'Guardando...' : (editingCategoria ? 'Guardar Cambios' : 'Crear Categoría')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ color: '#ef4444' }}>⚠️ Confirmar Eliminación</h3>
              <button onClick={() => setDeleteTarget(null)} className={styles.modalCloseBtn}>
                &times;
              </button>
            </div>

            <p style={{ margin: '0.5rem 0 1rem 0', color: '#475569', fontSize: '0.94rem', lineHeight: 1.5 }}>
              ¿Estás seguro de que deseás eliminar {deleteTarget.type === 'gasto' ? 'el gasto' : 'la categoría'}{' '}
              <strong style={{ color: '#1d1d1d' }}>"{deleteTarget.name}"</strong>?
              Esta acción no se puede deshacer.
            </p>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className={styles.btnSecondary}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
