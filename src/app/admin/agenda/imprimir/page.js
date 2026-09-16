'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './imprimir.module.css';

function PrintContent() {
  const searchParams = useSearchParams();
  const fecha = searchParams.get('fecha');

  const [turnos, setTurnos] = useState([]);
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
        setTurnos(data);
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
    if (!loading && turnos.length > 0 && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, turnos, error]);

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

        {turnos.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay turnos agendados para este día.</p>
          </div>
        ) : (
          <table className={styles.printTable}>
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '37%' }} />
              <col style={{ width: '38%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Horario</th>
                <th>Cliente</th>
                <th>Zonas a Realizar</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno) => (
                <tr key={turno.id}>
                  <td className={styles.timeCol}>
                    <strong>{turno.horaInicio} - {turno.horaFin}</strong>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111', marginTop: '4px' }}>
                      Valor: ${Number(turno.valorTotal || 0).toLocaleString('es-AR')}
                    </div>
                    {Number(turno.valorSeña || 0) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '1px' }}>
                        Seña: ${Number(turno.valorSeña || 0).toLocaleString('es-AR')} | Saldo: ${Number(turno.saldoPendiente || 0).toLocaleString('es-AR')}
                      </div>
                    )}
                  </td>
                  <td className={styles.clientCol}>
                    <div className={styles.clientName}>{turno.cliente?.nombreCompleto || 'Cliente'}</div>
                    <div className={styles.clientPhone}>WhatsApp: +{turno.cliente?.whatsapp || ''}</div>
                  </td>
                  <td className={styles.zonesCol}>
                    <div>{getZonasList(turno.zonas, turno.otrosTexto)}</div>
                    {turno.observaciones && (
                      <div className={styles.obsText}>
                        Obs: {turno.observaciones}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #222', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                <td style={{ padding: '10px 12px' }}>
                  <strong>TOTALES DEL DÍA</strong>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <strong>{turnos.length}</strong> turno{turnos.length === 1 ? '' : 's'} agendados
                </td>
                <td style={{ padding: '10px 12px', fontSize: '1.05rem', color: '#000' }}>
                  <strong>Total Estimado: ${turnos.reduce((acc, t) => acc + (Number(t.valorTotal) || 0), 0).toLocaleString('es-AR')}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal', marginTop: '2px' }}>
                    (Señas: ${turnos.reduce((acc, t) => acc + (Number(t.valorSeña) || 0), 0).toLocaleString('es-AR')} | Saldos: ${turnos.reduce((acc, t) => acc + (Number(t.saldoPendiente) || 0), 0).toLocaleString('es-AR')})
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
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
