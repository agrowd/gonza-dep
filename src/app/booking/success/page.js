'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../../page.module.css';

// SVG check icon
const CheckCircleIcon = () => (
  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--status-senado)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const turnoId = searchParams.get('turnoId');
  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    if (!turnoId) {
      setLoading(false);
      return;
    }

    fetch(`/api/reservas/consultar?id=${turnoId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.turno) {
          setTurno(data.turno);
          if (data.turno.estado === 'SEÑADO' || data.turno.estado === 'REPROGRAMADO') {
            setConfirmed(true);
          }
        }
      })
      .catch(err => console.error('Error fetching appointment details:', err))
      .finally(() => {
        setLoading(false);
      });
  }, [turnoId]);

  const handleConfirmTurno = async () => {
    setConfirming(true);
    setConfirmError('');
    try {
      const paymentId = searchParams.get('payment_id');
      const status = searchParams.get('status');
      
      const res = await fetch('/api/reservas/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId,
          paymentId,
          status
        })
      });
      const data = await res.json();
      if (data.error) {
        setConfirmError(data.error);
      } else {
        setConfirmed(true);
      }
    } catch (e) {
      console.error(e);
      setConfirmError('Error de red al confirmar tu turno. Por favor, vuelve a intentar.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <img src="/logo.png" alt="Gonzalo Depilación para Hombres" style={{ width: '150px', height: 'auto' }} />
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card premium-border" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          
          {confirmed ? (
            <>
              <CheckCircleIcon />
              <h2 className={styles.sectionTitle} style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
                ¡Turno Confirmado con Éxito!
              </h2>
              <p className={styles.sectionSubtitle} style={{ marginBottom: '2rem' }}>
                Tu pago de seña ha sido registrado y tu turno fue cargado en la agenda.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
              <h2 className={styles.sectionTitle} style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
                ¡Pago Realizado!
              </h2>
              <p className={styles.sectionSubtitle} style={{ marginBottom: '2rem' }}>
                Para agendar definitivamente tu turno, hacé clic en el botón de abajo.
              </p>
            </>
          )}

          {loading ? (
            <p style={{ color: 'var(--color-gold)' }}>Cargando detalles de tu turno...</p>
          ) : turno ? (
            <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{turno.clienteNombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Día:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(turno.fecha).toLocaleDateString('es-ES', { dateStyle: 'full' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Horario:</span>
                <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{turno.horaInicio} a {turno.horaFin}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Zonas:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, maxWidth: '70%', textAlign: 'right' }}>{turno.zonas}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Seña abonada:</span>
                <span style={{ color: '#2e7d32', fontWeight: 700 }}>${turno.valorSeña.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Saldo pendiente:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>${turno.saldoPendiente.toLocaleString()}</span>
              </div>
            </div>
          ) : null}

          {confirmError && (
            <div style={{ width: '100%', padding: '1rem', background: 'rgba(255, 82, 82, 0.1)', border: '1px solid #ff5252', borderRadius: '6px', color: '#ffb4b4', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.9rem' }}>
              {confirmError}
            </div>
          )}

          {confirmed ? (
            <>
              <div className={styles.instructionsCard} style={{ textAlign: 'left', width: '100%', marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--color-gold)', fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  📌 ¿Qué pasa ahora?
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  El turno quedó confirmado en la agenda. Se ha enviado un mensaje de confirmación por **WhatsApp** y **Email** con los detalles.
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Recordá venir **afeitado al ras** con maquinita de afeitar en las zonas indicadas. La dirección es **Paraná 597, Piso 8, Depto 48**.
                </p>
              </div>

              <button onClick={() => router.push('/')} className="btn btn-primary" style={{ width: '100%' }}>
                Volver al Inicio
              </button>
            </>
          ) : (
            <button 
              onClick={handleConfirmTurno} 
              disabled={confirming || loading} 
              className="btn btn-primary" 
              style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
            >
              {confirming ? 'Confirmando...' : 'Confirmar y Cargar Turno 🚀'}
            </button>
          )}
        </div>
      </main>

      <footer className={styles.footer} style={{ padding: '2rem 1.5rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          © 2026 Gonzalo Depilación. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
