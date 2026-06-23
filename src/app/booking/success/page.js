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

  // We can query a quick public status check endpoint `/api/reservas/status?id=xxx`
  // let's create a quick status checker
  useEffect(() => {
    if (!turnoId) {
      setLoading(false);
      return;
    }

    // Try to fetch appointment status from database (public safe endpoint)
    fetch(`/api/reservas/consultar?id=${turnoId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.turno) {
          setTurno(data.turno);
        }
      })
      .catch(err => console.error('Error fetching appointment details:', err))
      .finally(() => {
        setLoading(false);
      });
  }, [turnoId]);

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
          <CheckCircleIcon />
          
          <h2 className={styles.sectionTitle} style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
            ¡Reserva Recibida!
          </h2>
          
          <p className={styles.sectionSubtitle} style={{ marginBottom: '2rem' }}>
            Tu pago de seña ha sido registrado con éxito.
          </p>

          {loading ? (
            <p style={{ color: 'var(--color-gold)' }}>Cargando detalles de tu turno...</p>
          ) : turno ? (
            <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{turno.clienteNombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Día:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{new Date(turno.fecha).toLocaleDateString('es-ES', { dateStyle: 'full' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Horario:</span>
                <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{turno.horaInicio} a {turno.horaFin}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Zonas:</span>
                <span style={{ color: '#fff', fontWeight: 600, maxWidth: '70%', textAlign: 'right' }}>{turno.zonas}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Seña abonada:</span>
                <span style={{ color: '#81C784', fontWeight: 700 }}>${turno.valorSeña.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Saldo pendiente:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>${turno.saldoPendiente.toLocaleString()}</span>
              </div>
            </div>
          ) : null}

          <div className={styles.instructionsCard} style={{ textAlign: 'left', width: '100%', marginBottom: '2rem' }}>
            <h4 style={{ color: 'var(--color-gold)', fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              📌 ¿Qué pasa ahora?
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              El turno quedó registrado como **"Pendiente de autorización"**. Gonzalo o Luciano verificarán el turno en la agenda y te enviarán un mensaje de confirmación por **WhatsApp** y **Email** a la brevedad.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Recordá venir **afeitado al ras** con maquinita de afeitar en las zonas indicadas. La dirección es **Paraná 597, Piso 8, Depto 48**.
            </p>
          </div>

          <button onClick={() => router.push('/')} className="btn btn-primary" style={{ width: '100%' }}>
            Volver al Inicio
          </button>
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
