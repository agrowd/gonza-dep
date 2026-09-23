'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './imprimir.module.css';

function PrintContent() {
  const searchParams = useSearchParams();
  const fecha = searchParams.get('fecha');

  const [turnos, setTurnos] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fecha) {
      setError('Fecha no especificada');
      setLoading(false);
      return;
    }

    async function fetchTurnos() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/turnos/imprimir?fecha=${fecha}`);
        if (!res.ok) {
          throw new Error('Error al obtener los turnos del día');
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setTurnos(data);
          setBloqueos([]);
        } else {
          setTurnos(data.turnos || []);
          setBloqueos(data.bloqueos || []);
        }
      } catch (err) {
        console.error('Error fetching printable turnos:', err);
        setError(err.message || 'No se pudieron cargar los turnos');
      } finally {
        setLoading(false);
      }
    }

    fetchTurnos();
  }, [fecha]);

  // Trigger print dialog automatically once loaded
  useEffect(() => {
    if (!loading && (turnos.length > 0 || bloqueos.length > 0) && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, turnos, bloqueos, error]);

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getZonasList = (zonasJson, otrosTexto) => {
    let zones = [];
    try {
      if (typeof zonasJson === 'string') {
        zones = JSON.parse(zonasJson);
      } else if (Array.isArray(zonasJson)) {
        zones = zonasJson;
      }
    } catch {
      zones = [];
    }

    const names = zones.map((z) => (typeof z === 'string' ? z : z.nombre || z.name)).filter(Boolean);
    if (otrosTexto) {
      names.push(`Otros: ${otrosTexto}`);
    }

    if (names.length === 0) return 'Sin zonas especificadas';
    return names.join(', ');
  };

  // Build timeline combining turnos, bloqueos, and free slot gaps
  const sortedEvents = [
    ...turnos.map((t) => ({
      type: 'turno',
      item: t,
      startMin: timeToMinutes(t.horaInicio),
      endMin: timeToMinutes(t.horaFin)
    })),
    ...bloqueos.map((b) => ({
      type: 'bloqueo',
      item: b,
      startMin: timeToMinutes(b.horaInicio),
      endMin: timeToMinutes(b.horaFin)
    }))
  ].sort((a, b) => a.startMin - b.startMin);

  const timelineEvents = [];
  for (let i = 0; i < sortedEvents.length; i++) {
    const current = sortedEvents[i];
    timelineEvents.push(current);

    if (i < sortedEvents.length - 1) {
      const next = sortedEvents[i + 1];
      const gapMin = next.startMin - current.endMin;
      if (gapMin >= 10) {
        timelineEvents.push({
          type: 'free_slot',
          startMin: current.endMin,
          endMin: next.startMin,
          duration: gapMin
        });
      }
    }
  }

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando lista de turnos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h3>Ocurrió un error</h3>
        <p>{error}</p>
        <button onClick={() => window.close()} className={styles.closeBtn}>
          Cerrar ventana
        </button>
      </div>
    );
  }

  return (
    <div className={styles.printWrapper}>
      {/* Action buttons (hidden when printing) */}
      <div className={styles.actionsBar}>
        <button onClick={() => window.print()} className={styles.printBtn}>
          🖨️ Imprimir / Guardar PDF
        </button>
        <button onClick={() => window.close()} className={styles.closeBtn}>
          Cerrar
        </button>
      </div>

      {/* Printable Sheet */}
      <div className={styles.sheet}>
        <header className={styles.header}>
          <div className={styles.logoArea}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Gonzalo Depilación para Hombres" className={styles.logo} />
          </div>
          <div className={styles.headerTitle}>
            <h1>Turnos Programados</h1>
            <div className={styles.dateRow}>
              <p className={styles.date}>{formatDateLabel(fecha)}</p>
              <span className={styles.countBadge}>
                {turnos.length} turno{turnos.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </header>

        {turnos.length === 0 && bloqueos.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay turnos ni bloqueos agendados para este día.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.printTable}>
              <colgroup>
                <col className={styles.colTime} />
                <col className={styles.colClient} />
                <col className={styles.colZones} />
              </colgroup>
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>Cliente</th>
                  <th>Zonas a Realizar</th>
                </tr>
              </thead>
              <tbody>
                {timelineEvents.map((entry, idx) => {
                  if (entry.type === 'free_slot') {
                    const startH = Math.floor(entry.startMin / 60).toString().padStart(2, '0');
                    const startM = (entry.startMin % 60).toString().padStart(2, '0');
                    const endH = Math.floor(entry.endMin / 60).toString().padStart(2, '0');
                    const endM = (entry.endMin % 60).toString().padStart(2, '0');
                    const startTimeStr = `${startH}:${startM}`;
                    const endTimeStr = `${endH}:${endM}`;
                    const durationText = entry.duration >= 60
                      ? `${Math.floor(entry.duration / 60)}h${entry.duration % 60 > 0 ? ` ${entry.duration % 60}m` : ''}`
                      : `${entry.duration} min`;

                    return (
                      <tr key={`gap-${idx}`} className={styles.freeSlotRow}>
                        <td className={styles.timeCol}>
                          <span className={styles.timeRange}>{startTimeStr} - {endTimeStr}</span>
                          <div className={styles.freeBadge}>
                            🟢 Libre ({durationText})
                          </div>
                        </td>
                        <td className={styles.clientCol}>
                          <span className={styles.freeClient}>Espacio Disponible</span>
                        </td>
                        <td className={styles.zonesCol} style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          —
                        </td>
                      </tr>
                    );
                  }

                  if (entry.type === 'bloqueo') {
                    const b = entry.item;
                    return (
                      <tr key={`b-${b.id}`} className={styles.bloqueoRow}>
                        <td className={styles.timeCol}>
                          <span className={styles.timeRange}>{b.horaInicio} - {b.horaFin}</span>
                          <div className={styles.bloqueoBadge}>
                            🚫 Bloqueo
                          </div>
                        </td>
                        <td className={styles.clientCol}>
                          <span className={styles.bloqueoClient}>Horario Bloqueado</span>
                        </td>
                        <td className={styles.zonesCol} style={{ color: '#78350f', fontSize: '0.85rem' }}>
                          <strong>Motivo:</strong> {b.motivo || 'Sin motivo especificado'}
                        </td>
                      </tr>
                    );
                  }

                  const turno = entry.item;
                  return (
                    <tr key={turno.id}>
                      <td className={styles.timeCol}>
                        <span className={styles.timeRange}>{turno.horaInicio} - {turno.horaFin}</span>
                        <div className={styles.timeValor}>
                          Valor: ${Number(turno.valorTotal || 0).toLocaleString('es-AR')}
                        </div>
                      </td>
                      <td className={styles.clientCol}>
                        <div className={styles.clientName}>{turno.cliente?.nombreCompleto || turno.nombreCompleto || 'Cliente'}</div>
                      </td>
                      <td className={styles.zonesCol}>
                        <div style={{ fontWeight: 600, color: '#111' }}>{getZonasList(turno.zonas, turno.otrosTexto)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #222', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  <td className={styles.timeCol} style={{ padding: '8px 6px' }}>
                    <strong>TOTALES</strong>
                  </td>
                  <td className={styles.clientCol} style={{ padding: '8px 6px' }}>
                    <strong>{turnos.length}</strong> turno{turnos.length === 1 ? '' : 's'}
                  </td>
                  <td className={styles.zonesCol} style={{ padding: '8px 6px', fontSize: '0.95rem', color: '#000' }}>
                    <strong>Total Estimado: ${turnos.reduce((acc, t) => acc + (Number(t.valorTotal) || 0), 0).toLocaleString('es-AR')}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Gonzalo Depilación para Hombres — agenda.depilacionparahombres.com</p>
        </footer>
      </div>
    </div>
  );
}

export default function ImprimirTurnosPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loaderContainer}>
          <div className={styles.spinner}></div>
          <p>Preparando vista de impresión...</p>
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}
