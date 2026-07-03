'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          router.replace('/admin/agenda');
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        console.error('Error checking active session:', err);
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  if (checkingSession) {
    return (
      <div className={styles.container} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #f5f2eb 0%, #e3dec9 100%)' }}>
        <div style={{ color: '#000000', fontWeight: 600 }}>Verificando sesión...</div>
      </div>
    );
  }

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
    <div className={styles.container} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #f5f2eb 0%, #e3dec9 100%)' }}>
      <main className={styles.main} style={{ maxWidth: '400px', padding: '1rem' }}>
        
        {/* Logo and title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <img 
            src="/logo.png" 
            alt="Gonzalo Depilación para Hombres" 
            style={{ 
              width: '180px', 
              height: 'auto', 
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 20px rgba(122, 31, 30, 0.2))'
            }} 
          />
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

        <p style={{ textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '2.5rem' }}>
          ¿Sos cliente? <a href="/" style={{ fontWeight: '700', textDecoration: 'underline' }}>Reservá tu turno online aquí</a>
        </p>
      </main>
    </div>
  );
}
