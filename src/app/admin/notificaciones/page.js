'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './notificaciones.module.css';

// SVG Icons
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
);
const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

export default function NotificacionesPage() {
  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // WhatsApp Status
  const [wppStatus, setWppStatus] = useState('DISCONNECTED');
  const [wppQr, setWppQr] = useState('');
  const [wppError, setWppError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Reminders List
  const [week, setWeek] = useState('current'); // 'current' or 'next'
  const [turnos, setTurnos] = useState([]);
  const [loadingTurnos, setLoadingTurnos] = useState(true);
  const [selectedTurnoIds, setSelectedTurnoIds] = useState([]);

  // Preview Modal
  const [previewText, setPreviewText] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Notification Sending Logs
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingResults, setSendingResults] = useState(null); // { success: [], failed: [] }

  const statusInterval = useRef(null);

  // 1. WhatsApp status polling function
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (!data.error) {
        setWppStatus(data.status);
        setWppQr(data.qr);
        setWppError(data.error);
      }
    } catch (e) {
      console.error('Error fetching WhatsApp status:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  // 2. Poll status on mount and configure interval
  useEffect(() => {
    fetchWhatsAppStatus();
    
    // Poll status every 6 seconds to capture QR generation or Ready states
    statusInterval.current = setInterval(() => {
      fetchWhatsAppStatus();
    }, 6000);

    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current);
    };
  }, []);

  // 3. WhatsApp logout action
  const handleWppLogout = async () => {
    if (!confirm('¿Estás seguro de que deseas desconectar WhatsApp?')) return;
    setCheckingStatus(true);
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      fetchWhatsAppStatus();
    } catch (e) {
      console.error('Error in WhatsApp logout:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  // 4. Fetch turnos for selected week
  const fetchRemindersList = () => {
    setLoadingTurnos(true);
    fetch(`/api/admin/notificaciones?week=${week}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setTurnos(data.turnos || []);
          // Clear selections on week change
          setSelectedTurnoIds([]);
        }
      })
      .catch(err => console.error('Error fetching reminders list:', err))
      .finally(() => setLoadingTurnos(false));
  };

  useEffect(() => {
    fetchRemindersList();
  }, [week]);

  // 5. Selectors handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTurnoIds(turnos.map(t => t.id));
    } else {
      setSelectedTurnoIds([]);
    }
  };

  const handleSelectOne = (turnoId, isChecked) => {
    if (isChecked) {
      setSelectedTurnoIds([...selectedTurnoIds, turnoId]);
    } else {
      setSelectedTurnoIds(selectedTurnoIds.filter(id => id !== turnoId));
    }
  };

  // 6. Action: Send batch WhatsApp messages
  const handleSendReminders = async (idsToSend) => {
    if (idsToSend.length === 0) return;
    if (!confirm(`¿Deseas enviar ${idsToSend.length} recordatorio(s) de WhatsApp ahora?`)) return;

    setSendingReminders(true);
    setSendingResults(null);

    try {
      const res = await fetch('/api/admin/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoIds: idsToSend })
      });
      const data = await res.json();

      if (res.ok) {
        const successes = data.results.filter(r => r.status === 'SUCCESS');
        const failures = data.results.filter(r => r.status === 'FAILED');
        setSendingResults({ successes, failures });
        showToast(`Envío finalizado. Éxitos: ${successes.length}. Errores: ${failures.length}.`, failures.length > 0 ? 'error' : 'success');
        
        // Refresh reminders list (to update status labels)
        fetchRemindersList();
      } else {
        showToast(data.error || 'Error al enviar recordatorios.', 'error');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      showToast('Error de conexión al enviar recordatorios.', 'error');
    } finally {
      setSendingReminders(false);
    }
  };

  // 7. Preview Modal
  const openPreview = (text) => {
    setPreviewText(text);
    setIsPreviewOpen(true);
  };

  const formatTurnoDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    });
  };

  // Formatting variables for client
  const renderWppStatusBox = () => {
    let badgeClass = styles.badgeDisconnected;
    let badgeText = 'Desconectado';

    if (wppStatus === 'CONNECTED') {
      badgeClass = styles.badgeConnected;
      badgeText = 'Conectado';
    } else if (wppStatus === 'INITIALIZING') {
      badgeClass = styles.badgeInitializing;
      badgeText = 'Iniciando...';
    } else if (wppStatus === 'QR_RECEIVED') {
      badgeClass = styles.badgeQr;
      badgeText = 'Esperando Escaneo';
    }

    return (
      <div className={styles.wppStatusBox}>
        <div className={styles.statusIndicator}>
          <span className={styles.statusText}>Estado de Servicio:</span>
          <span className={`${styles.badge} ${badgeClass}`}>{badgeText}</span>
        </div>

        {wppStatus === 'QR_RECEIVED' && (
          <div className={styles.qrWrapper}>
            {/* img pointing to our PNG qr generator endpoint */}
            <img 
              src={`/api/whatsapp/qr-image?t=${new Date().getTime()}`} 
              alt="Escanear Código QR" 
              className={styles.qrImage}
            />
            <div className={styles.qrInstructions}>
              Escanea este código QR desde WhatsApp Web en tu celular para sincronizar el envío automatizado.
            </div>
          </div>
        )}

        {wppStatus === 'CONNECTED' && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            El sistema está listo para despachar recordatorios automáticos.
          </div>
        )}

        {wppError && (
          <div style={{ fontSize: '0.85rem', color: '#ff8a8a', padding: '0.5rem', backgroundColor: 'rgba(198, 40, 40, 0.08)', borderRadius: '4px', border: '1px solid rgba(198, 40, 40, 0.15)' }}>
            {wppError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button 
            onClick={fetchWhatsAppStatus} 
            className="btn btn-secondary" 
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            disabled={checkingStatus}
          >
            <RefreshIcon /> Actualizar
          </button>
          
          {wppStatus && wppStatus !== 'DISCONNECTED' && (
            <button 
              onClick={handleWppLogout} 
              className={styles.logoutBtn || 'btn btn-secondary'} 
              style={{ padding: '0.5rem', backgroundColor: 'rgba(198, 40, 40, 0.1)', color: '#ff5252', border: '1px solid rgba(198, 40, 40, 0.2)' }}
              disabled={checkingStatus}
            >
              <LogOutIcon />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Gestión de Notificaciones</h2>
        <p>Vincula WhatsApp y despacha los recordatorios de turnos semanales a tus clientes.</p>
      </div>

      {/* Grid Layout */}
      <div className={styles.topLayout}>
        
        {/* Left Column: WhatsApp Connection status */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Sincronización WhatsApp</div>
          {renderWppStatusBox()}
        </div>

        {/* Right Column: Weekly reminders list */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Listado de Recordatorios Semanales</div>

          {/* Week selection tabs */}
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${week === 'current' ? styles.tabActive : ''}`} 
              onClick={() => setWeek('current')}
            >
              Semana Actual
            </button>
            <button 
              className={`${styles.tab} ${week === 'next' ? styles.tabActive : ''}`} 
              onClick={() => setWeek('next')}
            >
              Próxima Semana
            </button>
            <button 
              className={`${styles.tab} ${week === '2days' ? styles.tabActive : ''}`} 
              onClick={() => setWeek('2days')}
            >
              Turnos en 2 Días
            </button>
          </div>

          {/* Bulk Actions Panel */}
          <div className={styles.massActions}>
            <div className={styles.selectAllWrapper}>
              <input 
                type="checkbox" 
                className={styles.checkbox}
                checked={turnos.length > 0 && selectedTurnoIds.length === turnos.length}
                onChange={handleSelectAll}
                disabled={turnos.length === 0}
              />
              <span>Seleccionar todos ({selectedTurnoIds.length}/{turnos.length})</span>
            </div>

            <button 
              className="btn btn-primary"
              disabled={selectedTurnoIds.length === 0 || wppStatus !== 'CONNECTED' || sendingReminders}
              onClick={() => handleSendReminders(selectedTurnoIds)}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              {sendingReminders ? 'Enviando...' : `Enviar Recordatorios (${selectedTurnoIds.length})`}
            </button>
          </div>

          {/* Table list */}
          {loadingTurnos ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gold)' }}>
              Cargando turnos de la semana...
            </div>
          ) : turnos.length === 0 ? (
            <div className={styles.emptyState}>
              No hay turnos programados o pendientes de recordatorio en esta semana.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th} style={{ width: '40px' }}></th>
                    <th className={styles.th}>Cliente</th>
                    <th className={styles.th}>Turno</th>
                    <th className={styles.th}>Estado Envíos</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((t) => {
                    const isSelected = selectedTurnoIds.includes(t.id);
                    const lastNotif = t.cliente.lastNotification;
                    const parsedZones = JSON.parse(t.zonas || '[]');

                    return (
                      <tr key={t.id} className={styles.tr}>
                        <td className={styles.td}>
                          <input 
                            type="checkbox" 
                            className={styles.checkbox}
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(t.id, e.target.checked)}
                          />
                        </td>
                        <td className={styles.td}>
                          <div className={styles.clientInfo}>
                            <span className={styles.clientName}>{t.cliente.nombreCompleto}</span>
                            <span className={styles.clientWtsp}>{t.cliente.whatsapp}</span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.datetime}>
                            <span className={styles.date} style={{ textTransform: 'capitalize' }}>
                              {formatTurnoDate(t.fecha)}
                            </span>
                            <span className={styles.time}>
                              {t.horaInicio} a {t.horaFin} ({parsedZones.map(z=>z.nombre).join(', ')})
                            </span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.notificationStatus}>
                            {!lastNotif ? (
                              <span className={`${styles.statusLabel} ${styles.statusNone}`}>Sin enviar</span>
                            ) : lastNotif.estado === 'ENVIADO' ? (
                              <>
                                <span className={`${styles.statusLabel} ${styles.statusSent}`}>Enviado</span>
                                <span className={styles.lastSentText}>
                                  {new Date(lastNotif.fechaEnvio).toLocaleDateString()}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={`${styles.statusLabel} ${styles.statusFailed}`}>Fallido</span>
                                <span className={styles.lastSentText}>Reintentar</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                            <button 
                              className={`${styles.btnAction} ${styles.btnPreview}`}
                              onClick={() => openPreview(t.previewText)}
                              title="Ver vista previa del mensaje"
                            >
                              <EyeIcon />
                            </button>
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              disabled={wppStatus !== 'CONNECTED' || sendingReminders}
                              onClick={() => handleSendReminders([t.id])}
                            >
                              <SendIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Execution Results Logs */}
          {sendingResults && (
            <div className={styles.logContainer}>
              <div className={styles.logHeader}>
                <span>Registro de Envío Reciente</span>
                <button 
                  onClick={() => setSendingResults(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Limpiar
                </button>
              </div>
              <div className={styles.logList}>
                {sendingResults.successes.map((item, idx) => (
                  <div key={`s-${idx}`} className={`${styles.logItem} ${styles.logSuccess}`}>
                    ✅ Recordatorio enviado con éxito a {item.cliente}
                  </div>
                ))}
                {sendingResults.failures.map((item, idx) => (
                  <div key={`f-${idx}`} className={`${styles.logItem} ${styles.logFailed}`}>
                    ❌ Error enviando a {item.cliente}: {item.error}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="modal-overlay" onClick={() => setIsPreviewOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Vista Previa del Mensaje</h3>
              <button className="modal-close" onClick={() => setIsPreviewOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                backgroundColor: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)', 
                padding: '1.25rem', 
                borderRadius: '8px', 
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                {previewText}
              </pre>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsPreviewOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'error' ? '#ef5350' : '#2e7d32',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          animation: 'slideIn 0.3s ease forwards',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))} 
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              marginLeft: '0.5rem',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              lineHeight: 1,
              padding: 0
            }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
