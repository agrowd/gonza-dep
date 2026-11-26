'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  const errMsg = `${error?.name || ''} ${error?.message || ''} ${error?.toString?.() || ''}`;
  const isChunkError = /ChunkLoadError|Failed to load chunk|Loading chunk/i.test(errMsg);

  useEffect(() => {
    // Log the error to the console
    console.error('Admin Area Error:', error);

    // Auto-recover once on Next.js ChunkLoadError after a deploy (15s cooldown prevents loops)
    if (isChunkError && typeof window !== 'undefined') {
      try {
        const lastReload = Number(sessionStorage.getItem('admin_chunk_reload_at') || 0);
        if (Date.now() - lastReload > 15000) {
          sessionStorage.setItem('admin_chunk_reload_at', String(Date.now()));
          window.location.reload();
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [error, isChunkError]);

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#121212',
      color: '#f5f5f5',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '600px',
        padding: '2rem',
        borderRadius: '8px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #c62828',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#ff8a8a', marginBottom: '1rem' }}>⚠️ Ocurrió un error en el Panel</h2>
        <p style={{ color: '#b0adab', marginBottom: '1.5rem' }}>
          La aplicación administrativa experimentó un fallo al intentar renderizar esta sección.
        </p>
        
        <div style={{
          textAlign: 'left',
          backgroundColor: '#0c0c0c',
          padding: '1rem',
          borderRadius: '4px',
          overflowX: 'auto',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          color: '#ff8a8a',
          border: '1px solid #333',
          marginBottom: '1.5rem',
          maxHeight: '300px'
        }}>
          <strong>Error:</strong> {error?.message || error?.toString()}
          {error?.stack && (
            <pre style={{ marginTop: '1rem', color: '#b0adab', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
              {error.stack}
            </pre>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => (isChunkError ? window.location.reload() : reset())}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#d4a54d',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reintentar Cargar
          </button>
          <a
            href="/login"
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: 'transparent',
              color: '#d4a54d',
              border: '1px solid #d4a54d',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 'bold',
              lineHeight: '1.5'
            }}
          >
            Ir al Login
          </a>
        </div>
      </div>
    </div>
  );
}
