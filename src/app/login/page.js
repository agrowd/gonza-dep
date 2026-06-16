'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to admin agenda
        router.push('/admin/agenda');
      } else {
        setError(data.error || 'Credenciales incorrectas.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión. Intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #1a1a1a 0%, #0c0c0c 100%)' }}>
      <main className={styles.main} style={{ maxWidth: '400px', padding: '1rem' }}>
        
        {/* Logo and title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'radial-gradient(circle, #4a1515 0%, #170505 100%)',
            width: 70, height: 70, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--color-gold)',
            color: '#fff', fontSize: '2rem', fontFamily: 'var(--font-title)', fontWeight: 800,
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(212, 165, 77, 0.2)'
          }}>G</div>
          <h1 style={{ fontSize: '1.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>GONZALO</h1>
          <span style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Depilación para Hombres</span>
        </div>

        {/* Login form */}
        <div className="glass-card premium-border" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontFamily: 'var(--font-title)', textAlign: 'center' }}>Ingreso Administrativo</h2>

          {error && (
            <div style={{
              background: 'rgba(198, 40, 40, 0.1)',
              border: '1px solid var(--status-cancelado)',
              color: '#ff8a8a',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Usuario</label>
              <input
                type="text"
                placeholder="Ingresá tu usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: '2rem' }}>
              <label className={styles.inputLabel}>Contraseña</label>
              <input
                type="password"
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Iniciando Sesión...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
          ¿Sos cliente? <a href="/">Reservá tu turno online aquí</a>
        </p>
      </main>
    </div>
  );
}
