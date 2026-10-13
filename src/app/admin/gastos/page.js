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

export default function GastosPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [activeTab, setActiveTab] = useState('historial'); // 'historial' | 'balance' | 'categorias'

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

  // Fetch gastos data for the selected month
  const fetchGastosData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/gastos?mes=${selectedMonth}&anio=${selectedYear}`, {
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
  }, [selectedMonth, selectedYear]);

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

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
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

  // Handle open create gasto
  const handleOpenCreateGasto = () => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const defaultDate = `${selectedYear}-${monthStr}-01`;
    const todayStr = new Date().toISOString().split('T')[0];
    const initialDate = todayStr.startsWith(`${selectedYear}-${monthStr}`) ? todayStr : defaultDate;

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
          <p>Control mensual de costos operativos, entradas reales y balance financiero</p>
        </div>

        <div className={styles.headerActions}>
          {/* Month Navigator */}
          <div className={styles.monthNavigator}>
            <button
              onClick={handlePrevMonth}
              className={styles.navArrowBtn}
              title="Mes anterior"
            >
              ←
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className={styles.monthSelect}
            >
              {MESES.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className={styles.yearSelect}
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className={styles.navArrowBtn}
              title="Mes siguiente"
            >
              →
            </button>
          </div>

          <button onClick={handleToday} className={styles.todayBtn}>
            📅 Mes Actual
          </button>

          <button onClick={handleOpenCreateGasto} className={styles.btnPrimary}>
            <span>+</span> Nuevo Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* Gastos del Mes */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Gastos del Mes</span>
            <span className={styles.kpiIcon}>💸</span>
          </div>
          <div className={styles.kpiValue}>
            {formatCurrency(totales.totalGastosMes)}
          </div>
          <div className={styles.kpiSub}>
            {totales.totalGastosMesAnterior > 0 ? (
              <>
                <span className={totales.variacionPorcentual > 0 ? styles.badgeTrendRed : styles.badgeTrendGreen}>
                  {totales.variacionPorcentual > 0 ? `+${totales.variacionPorcentual}%` : `${totales.variacionPorcentual}%`}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  vs mes anterior ({formatCurrency(totales.totalGastosMesAnterior)})
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>Sin gastos el mes anterior</span>
            )}
          </div>
        </div>

        {/* Entradas del Mes */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Entradas del Mes</span>
            <span className={styles.kpiIcon}>💰</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#22c55e' }}>
            {formatCurrency(totales.totalEntradasMes)}
          </div>
          <div className={styles.kpiSub} style={{ color: 'var(--text-secondary)' }}>
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
          <div className={styles.kpiSub} style={{ color: 'var(--text-secondary)' }}>
            {totales.balanceNeto >= 0 ? '🟢 Ganancia neta operativa' : '🔴 Déficit operativo en el mes'}
          </div>
        </div>

        {/* Mayor Categoría de Gasto */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Mayor Categoría</span>
            <span className={styles.kpiIcon}>🏷️</span>
          </div>
          <div className={styles.kpiValue} style={{ fontSize: '1.45rem' }}>
            {topCategory ? topCategory.nombre : 'Sin gastos'}
          </div>
          <div className={styles.kpiSub}>
            {topCategory ? (
              <span style={{ color: 'var(--text-secondary)' }}>
                {formatCurrency(topCategory.total)} ({topCategory.porcentaje}% del total)
              </span>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>0% de gastos</span>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Section (if any expenses) */}
      {data?.desgloseCategorias?.length > 0 && (
        <div className={styles.categoriesCard}>
          <div className={styles.categoriesHeader}>
            <h3>Distribución de Gastos por Categoría</h3>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
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
          onClick={() => setActiveTab('balance')}
          className={`${styles.tabBtn} ${activeTab === 'balance' ? styles.tabBtnActive : ''}`}
        >
          📅 Balance Día a Día
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
                <p>Cargando gastos del mes...</p>
              </div>
            ) : filteredGastos.length === 0 ? (
              <div className={styles.emptyState}>
                <span style={{ fontSize: '2.5rem' }}>🧾</span>
                <p>No hay gastos registrados en {MESES[selectedMonth - 1]} {selectedYear}.</p>
                <button
                  onClick={handleOpenCreateGasto}
                  className={styles.btnPrimary}
                  style={{ marginTop: '1rem' }}
                >
                  + Cargar Primer Gasto
                </button>
              </div>
            ) : (
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
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {formattedDate}
                          </td>
                          <td style={{ fontWeight: 700, color: '#fff' }}>
                            {gasto.concepto}
                          </td>
                          <td>
                            <span
                              className={styles.categoryBadge}
                              style={{
                                background: `${gasto.categoriaColor}22`,
                                color: gasto.categoriaColor,
                                border: `1px solid ${gasto.categoriaColor}44`
                              }}
                            >
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: gasto.categoriaColor
                              }} />
                              {gasto.categoriaNombre}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#f87171', fontSize: '0.96rem' }}>
                            {formatCurrency(gasto.monto)}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: '280px' }}>
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
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE DÍA A DÍA */}
      {activeTab === 'balance' && (
        <div className={styles.tableCard}>
          <div style={{ padding: '1.25rem 1.4rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>
              Balance Diario de {MESES[selectedMonth - 1]} {selectedYear}
            </h3>

            {loading ? (
              <div className={styles.emptyState}>
                <p>Calculando balance diario...</p>
              </div>
            ) : !data?.balanceDiario ? (
              <div className={styles.emptyState}>
                <p>Sin datos de balance disponibles.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'right' }}>Entradas Turnos</th>
                      <th style={{ textAlign: 'right' }}>Señas Cobradas</th>
                      <th style={{ textAlign: 'right' }}>Total Entradas</th>
                      <th style={{ textAlign: 'right' }}>Gastos del Día</th>
                      <th style={{ textAlign: 'right' }}>Balance del Día</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.balanceDiario.map(diaItem => {
                      const [y, m, d] = (diaItem.fecha || '').split('-');
                      const formattedDate = d && m && y ? `${d}/${m}/${y}` : diaItem.fecha;

                      const hasActivity = diaItem.entradas > 0 || diaItem.gastos > 0;

                      return (
                        <tr
                          key={diaItem.dia}
                          style={{
                            background: hasActivity ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                            opacity: hasActivity ? 1 : 0.65
                          }}
                        >
                          <td style={{ fontWeight: 800, color: 'var(--color-gold)' }}>
                            Día {diaItem.dia}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {formattedDate}
                          </td>
                          <td style={{ textAlign: 'right', color: '#94a3b8' }}>
                            {diaItem.entradasTurnos > 0 ? formatCurrency(diaItem.entradasTurnos) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: '#94a3b8' }}>
                            {diaItem.entradasSenas > 0 ? formatCurrency(diaItem.entradasSenas) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: diaItem.entradas > 0 ? '#22c55e' : 'var(--text-secondary)' }}>
                            {diaItem.entradas > 0 ? formatCurrency(diaItem.entradas) : '$0'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: diaItem.gastos > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                            {diaItem.gastos > 0 ? formatCurrency(diaItem.gastos) : '$0'}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 800,
                              color: diaItem.balance > 0 ? '#22c55e' : (diaItem.balance < 0 ? '#ef4444' : 'var(--text-secondary)')
                            }}
                          >
                            {formatCurrency(diaItem.balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.05)', fontWeight: 800 }}>
                      <td colSpan={2} style={{ color: '#fff', fontSize: '0.96rem' }}>
                        TOTALES DEL MES
                      </td>
                      <td style={{ textAlign: 'right', color: '#cbd5e1' }}>
                        {formatCurrency(totales.entradasTurnosMes)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#cbd5e1' }}>
                        {formatCurrency(totales.entradasSenasMes)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#22c55e', fontSize: '1rem' }}>
                        {formatCurrency(totales.totalEntradasMes)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ef4444', fontSize: '1rem' }}>
                        {formatCurrency(totales.totalGastosMes)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontSize: '1.05rem',
                          color: totales.balanceNeto >= 0 ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {formatCurrency(totales.balanceNeto)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <div className={styles.tableCard}>
          <div style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>
                  Categorías de Gastos
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
                            border: '1.5px solid rgba(255, 255, 255, 0.2)'
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 700, color: '#fff', fontSize: '0.94rem' }}>
                        {cat.nombre}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
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

            <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.5 }}>
              ¿Estás seguro de que deseás eliminar {deleteTarget.type === 'gasto' ? 'el gasto' : 'la categoría'}{' '}
              <strong style={{ color: '#fff' }}>"{deleteTarget.name}"</strong>?
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
