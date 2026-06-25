'use client';

import { useState, useEffect } from 'react';
import styles from './estadisticas.module.css';

// SVG Icons
const TrendingUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);

export default function EstadisticasPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch(`/api/admin/estadisticas?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(resData => {
        if (!resData.error) {
          setData(resData);
        }
      })
      .catch(err => console.error('Error loading stats:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [year, month]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthsList = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const yearsList = [
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1
  ];

  // Calculate percentage helper
  const getPercent = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Estadísticas de Negocio</h2>
          <p>Ganancias, pérdidas, rendimiento de turnos y métricas de clientes.</p>
        </div>

        <div className={styles.controls}>
          <select 
            className={styles.select} 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          >
            {monthsList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select 
            className={styles.select} 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Analizando datos de la base de datos...</p>
        </div>
      ) : !data ? (
        <div className={styles.emptyState}>
          <p>No se pudieron cargar las estadísticas.</p>
        </div>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className={styles.gridQuick}>
            <div className={styles.quickCard}>
              <div className={styles.quickTitle}>Ganancia del Día</div>
              <div className={styles.quickValue}>{formatMoney(data.quickStats.gananciaDia)}</div>
              <div className={styles.quickSub}>Corte a hoy</div>
            </div>
            <div className={styles.quickCard}>
              <div className={styles.quickTitle}>Ganancia de la Semana</div>
              <div className={styles.quickValue}>{formatMoney(data.quickStats.gananciaSemana)}</div>
              <div className={styles.quickSub}>Lunes a domingo</div>
            </div>
            <div className={styles.quickCard}>
              <div className={styles.quickTitle}>Ganancia del Mes</div>
              <div className={styles.quickValue}>{formatMoney(data.quickStats.gananciaMes)}</div>
              <div className={styles.quickSub}>Período seleccionado</div>
            </div>
            <div className={styles.quickCard}>
              <div className={styles.quickTitle}>Total Bonificaciones</div>
              <div className={styles.quickValue}>{formatMoney(data.quickStats.bonificacionMes)}</div>
              <div className={styles.quickSub}>En el mes seleccionado</div>
            </div>
          </div>

          {/* Detailed analysis grid */}
          <div className={styles.gridSections}>
            
            {/* Section 1: Appointments statistics */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>
                <span>Rendimiento de Turnos</span>
                <CalendarIcon className={styles.sectionTitleIcon} />
              </div>
              <div className={styles.statsList}>
                <div className={styles.badgeRow}>
                  <div className={styles.badgeIndicator} style={{ backgroundColor: 'var(--status-realizado)' }}></div>
                  <div className={styles.badgeLabel}>Realizados (Sesión completada)</div>
                  <div className={styles.statValue}>
                    {data.turnosMes.realizados} <span className={styles.statMuted}>({getPercent(data.turnosMes.realizados, data.turnosMes.total)}%)</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <div className={styles.badgeIndicator} style={{ backgroundColor: 'var(--status-senado)' }}></div>
                  <div className={styles.badgeLabel}>Señados / Confirmados (Próximos)</div>
                  <div className={styles.statValue}>
                    {data.turnosMes.senados} <span className={styles.statMuted}>({getPercent(data.turnosMes.senados, data.turnosMes.total)}%)</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <div className={styles.badgeIndicator} style={{ backgroundColor: 'var(--status-cancelado)' }}></div>
                  <div className={styles.badgeLabel}>Cancelados</div>
                  <div className={styles.statValue}>
                    {data.turnosMes.cancelados} <span className={styles.statMuted}>({getPercent(data.turnosMes.cancelados, data.turnosMes.total)}%)</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <div className={styles.badgeIndicator} style={{ backgroundColor: 'var(--status-no-asistio)' }}></div>
                  <div className={styles.badgeLabel}>No asistieron</div>
                  <div className={styles.statValue}>
                    {data.turnosMes.noAsistio} <span className={styles.statMuted}>({getPercent(data.turnosMes.noAsistio, data.turnosMes.total)}%)</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <div className={styles.badgeIndicator} style={{ backgroundColor: 'var(--status-reprogramado)' }}></div>
                  <div className={styles.badgeLabel}>Reprogramados</div>
                  <div className={styles.statValue}>
                    {data.turnosMes.reprogramados} <span className={styles.statMuted}>({getPercent(data.turnosMes.reprogramados, data.turnosMes.total)}%)</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <div className={styles.badgeIndicator} style={{ backgroundColor: 'var(--status-pendiente-aut)' }}></div>
                  <div className={styles.badgeLabel}>Pendientes de autorización</div>
                  <div className={styles.statValue}>
                    {data.turnosMes.pendientesAutorizacion} <span className={styles.statMuted}>({getPercent(data.turnosMes.pendientesAutorizacion, data.turnosMes.total)}%)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', fontWeight: 600 }}>
                  <span>Turnos Totales Cargados</span>
                  <span>{data.turnosMes.total}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Clients statistics */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>
                <span>Análisis de Clientes</span>
                <UsersIcon className={styles.sectionTitleIcon} />
              </div>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Clientes Nuevos del Mes</span>
                    <span className={styles.statMuted}>Registrados por primera vez en este período</span>
                  </div>
                  <span className={styles.statValue}>{data.clientesMes.nuevosCreados}</span>
                </div>

                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Clientes Activos en el Mes</span>
                    <span className={styles.statMuted}>Clientes con al menos 1 turno este mes</span>
                  </div>
                  <span className={styles.statValue}>{data.clientesMes.activosConTurno}</span>
                </div>

                <div className={styles.statRow} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Clientes Recurrentes Globales</span>
                    <span className={styles.statMuted}>Con más de 1 sesión total acumulada</span>
                  </div>
                  <div className={styles.statValue}>
                    {data.clientesMes.globalRecurrentes}
                    <div className={styles.barWrapper}>
                      <div 
                        className={styles.barFill} 
                        style={{ width: `${getPercent(data.clientesMes.globalRecurrentes, data.clientesMes.globalRecurrentes + data.clientesMes.globalNuevos)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Clientes Nuevos Globales</span>
                    <span className={styles.statMuted}>Con 0 o 1 sesión total acumulada</span>
                  </div>
                  <div className={styles.statValue}>
                    {data.clientesMes.globalNuevos}
                    <div className={styles.barWrapper}>
                      <div 
                        className={styles.barFill} 
                        style={{ width: `${getPercent(data.clientesMes.globalNuevos, data.clientesMes.globalRecurrentes + data.clientesMes.globalNuevos)}%`, backgroundColor: '#78909c' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Revenue splits */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>
                <span>Análisis de Ingresos</span>
                <TrendingUpIcon className={styles.sectionTitleIcon} />
              </div>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Ingresos por Clientes Recurrentes</span>
                    <span className={styles.statMuted}>Aportado por clientes de tratamiento continuo</span>
                  </div>
                  <div className={styles.statValue}>
                    {formatMoney(data.gananciasDetalle.deClientesRecurrentes)}
                    <span className={styles.statMuted} style={{ display: 'block', fontSize: '0.75rem' }}>
                      {getPercent(data.gananciasDetalle.deClientesRecurrentes, data.quickStats.gananciaMes)}% del total
                    </span>
                    <div className={styles.barWrapper}>
                      <div 
                        className={styles.barFill} 
                        style={{ width: `${getPercent(data.gananciasDetalle.deClientesRecurrentes, data.quickStats.gananciaMes)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Ingresos por Clientes Nuevos</span>
                    <span className={styles.statMuted}>Aportado por sesiones de nuevos usuarios</span>
                  </div>
                  <div className={styles.statValue}>
                    {formatMoney(data.gananciasDetalle.deClientesNuevos)}
                    <span className={styles.statMuted} style={{ display: 'block', fontSize: '0.75rem' }}>
                      {getPercent(data.gananciasDetalle.deClientesNuevos, data.quickStats.gananciaMes)}% del total
                    </span>
                    <div className={styles.barWrapper}>
                      <div 
                        className={styles.barFill} 
                        style={{ width: `${getPercent(data.gananciasDetalle.deClientesNuevos, data.quickStats.gananciaMes)}%`, backgroundColor: '#388e3c' }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className={styles.statRow} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Ticket Promedio por Cliente</span>
                    <span className={styles.statMuted}>Ingresos del mes / cantidad de clientes activos</span>
                  </div>
                  <span className={styles.statValue}>{formatMoney(data.gananciasDetalle.promedioPorCliente)}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Loss Tracker */}
            <div className={`${styles.sectionCard} ${styles.lossCard}`}>
              <div className={styles.sectionTitle} style={{ color: 'var(--status-cancelado)' }}>
                <span>Control de Pérdidas</span>
                <WarningIcon style={{ color: 'var(--status-cancelado)' }} />
              </div>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Pérdidas por Cancelaciones</span>
                    <span className={styles.statMuted}>Turnos cancelados sin reprogramación</span>
                  </div>
                  <span className={styles.statValue} style={{ color: '#ff8a8a' }}>
                    {formatMoney(data.perdidasDetalle.porCancelaciones)}
                  </span>
                </div>

                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Pérdidas por Ausencias</span>
                    <span className={styles.statMuted}>Turnos donde el cliente no asistió</span>
                  </div>
                  <span className={styles.statValue} style={{ color: '#ff8a8a' }}>
                    {formatMoney(data.perdidasDetalle.porAusencias)}
                  </span>
                </div>

                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Saldos Pendientes de Cobro</span>
                    <span className={styles.statMuted}>Diferencia no abonada en turnos realizados</span>
                  </div>
                  <span className={styles.statValue} style={{ color: '#ff8a8a' }}>
                    {formatMoney(data.perdidasDetalle.saldosPendientes)}
                  </span>
                </div>

                <div className={styles.statRow}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Señas Pendientes no Pagadas</span>
                    <span className={styles.statMuted}>Turnos agendados sin pago confirmado</span>
                  </div>
                  <span className={styles.statValue} style={{ color: '#ff8a8a' }}>
                    {formatMoney(data.perdidasDetalle.senasNoAbonadas)}
                  </span>
                </div>

                <div className={styles.lossSummary}>
                  <div>
                    <div className={styles.lossSummaryTitle}>Pérdidas Totales Estimadas</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Por turnos no concretados o saldos impagos</div>
                  </div>
                  <div className={styles.lossSummaryValue}>
                    {formatMoney(data.perdidasDetalle.total)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
