'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../page.module.css';

// SVG cross icon
const XCircleIcon = () => (
  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--status-cancelado)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);

function FailureContent() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <div style={{
              background: 'radial-gradient(circle, #4a1515 0%, #170505 100%)',
              width: 45, height: 45, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--color-gold)',
              color: '#fff', fontSize: '1.25rem', fontFamily: 'var(--font-title)', fontWeight: 800
            }}>G</div>
            <div>
              <span className={styles.logoTitle}>Gonzalo</span>
              <span className={styles.logoSubtitle}>Depilación Definitiva Masculina</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card premium-border" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          <XCircleIcon />
          
          <h2 className={styles.sectionTitle} style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
            Pago No Procesado
          </h2>
          
          <p className={styles.sectionSubtitle} style={{ marginBottom: '2rem' }}>
            No pudimos registrar el pago de tu seña. Por favor, verifica tu tarjeta o cuenta de MercadoPago e intenta de nuevo.
          </p>

          <div className={styles.instructionsCard} style={{ textAlign: 'left', width: '100%', marginBottom: '2rem' }}>
            <h4 style={{ color: 'var(--color-gold)', fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              💡 ¿Qué podés hacer?
            </h4>
            <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li>Intentá realizar la reserva seleccionando otra tarjeta o medio de pago en MercadoPago.</li>
              <li>Si el problema persiste, comunicate directamente con nosotros por WhatsApp para coordinar tu turno y seña de forma manual.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', width: '100%', gap: '1rem' }}>
            <button onClick={() => router.push('/')} className="btn btn-secondary" style={{ flex: 1 }}>
              Volver a Intentar
            </button>
            <a href="https://wa.me/5491122334455" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, backgroundColor: '#25D366', color: '#fff' }}>
              💬 Contactar Soporte
            </a>
          </div>
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

export default function FailurePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>Cargando...</div>}>
      <FailureContent />
    </Suspense>
  );
}
