'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './imprimir.module.css';

function PrintPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fecha = searchParams.get('fecha');

  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fecha) {
      setError('Fecha no especificada.');
      setLoading(false);
      return;
    }

    fetch(`/api/admin/turnos/imprimir?fecha=${fecha}`)
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data && !data.error) {
          setTurnos(data);
        } else if (data && data.error) {
          setError(data.error);
        }
      })
      .catch(err => {
        console.error('Error fetching printable turnos:', err);
        setError('Error al conectar con el servidor.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fecha, router]);

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
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getZonasList = (zonasJson) => {
    try {
      const parsed = JSON.parse(zonasJson);
      if (Array.isArray(parsed)) {
        return parsed.map(z => z.nombre || z.nombreBase).join(', ');
      }
    } catch (e) {
      console.error('Error parsing zones:', e);
    }
    return 'Sin zonas especificadas';
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando agenda del día para impresión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button onClick={() => window.close()} className={styles.noPrintBtn}>Cerrar Ventana</button>
      </div>
    );
  }

  return (
    <div className={styles.printWrapper}>
      {/* Action Bar (hidden when printing) */}
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
            <p className={styles.date}>{formatDateLabel(fecha)}</p>
          </div>
        </header>

        {turnos.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay turnos agendados para este día.</p>
          </div>
        ) : (
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Horario</th>
                <th style={{ width: '35%' }}>Cliente</th>
                <th style={{ width: '50%' }}>Zonas a Realizar</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno) => (
                <tr key={turno.id}>
                  <td className={styles.timeCol}>
                    <strong>{turno.horaInicio} - {turno.horaFin}</strong>
                  </td>
                  <td className={styles.clientCol}>
                    <div className={styles.clientName}>{turno.cliente.nombreCompleto}</div>
                    <div className={styles.clientPhone}>WhatsApp: +{turno.cliente.whatsapp}</div>
                  </td>
                  <td className={styles.zonesCol}>
                    {getZonasList(turno.zonas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Gonzalo Depilación para Hombres — agenda.depilacionparahombres.com</p>
        </footer>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PrintPageContent />
    </Suspense>
  );
}
