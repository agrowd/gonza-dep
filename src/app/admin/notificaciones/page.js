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

  // Global notifications check
  const [globalNotificationsEnabled, setGlobalNotificationsEnabled] = useState(true);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/configuracion');
      const data = await res.json();
      if (!data.error) {
        setGlobalNotificationsEnabled(data.global_notifications_enabled === 'true');
      }
    } catch (e) {
      console.error('Error fetching configuration:', e);
    }
  };

  const handleToggleGlobalNotifications = async (checked) => {
    setGlobalNotificationsEnabled(checked);
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_notifications_enabled: checked ? 'true' : 'false' })
      });
      if (res.ok) {
        showToast(checked ? 'Envío automático de notificaciones activado.' : 'Envío automático de notificaciones pausado globalmente.', checked ? 'success' : 'warning');
      } else {
        showToast('Error al actualizar la configuración.', 'error');
        setGlobalNotificationsEnabled(!checked);
      }
    } catch (e) {
      console.error('Error updating configuration:', e);
      showToast('Error de red al actualizar la configuración.', 'error');
      setGlobalNotificationsEnabled(!checked);
    }
  };

  // Category Selector: 'current' | 'next' | '2days' | 'va_a_avisar' | 'mantenimiento'
  const [category, setCategory] = useState('current');

  // Date Range Filters for "Va a avisar" & "Mantenimiento"
  const getInitialDates = () => {
    const now = new Date();
    const argNow = new Date(now.getTime() - 3 * 3600 * 1000);
    const y = argNow.getUTCFullYear();
    const m = argNow.getUTCMonth();
    const firstDay = new Date(Date.UTC(y, m, 1));
    const lastDay = new Date(Date.UTC(y, m + 1, 0));
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const [startDate, setStartDate] = useState(getInitialDates().start);
  const [endDate, setEndDate] = useState(getInitialDates().end);
  const [filterBy, setFilterBy] = useState('aviso'); // 'aviso' o 'sesion'
  const [showAllNotified, setShowAllNotified] = useState(false);

  // List Items
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

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
    fetchConfigs();
    
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

  // 4. Fetch notifications list for selected category
  const fetchNotificationsList = () => {
    setLoadingItems(true);
    let url = `/api/admin/notificaciones?category=${category}`;
    if (category === 'va_a_avisar' || category === 'mantenimiento') {
      url += `&start=${startDate}&end=${endDate}&filterBy=${filterBy}&showAll=${showAllNotified}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          if (category === 'va_a_avisar' || category === 'mantenimiento') {
            setItems(data.items || []);
          } else {
            setItems(data.turnos || []);
          }
          setSelectedIds([]);
        }
      })
      .catch(err => console.error('Error fetching notifications list:', err))
      .finally(() => setLoadingItems(false));
  };

  useEffect(() => {
    fetchNotificationsList();
  }, [category, showAllNotified]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setSelectedIds([]);
  };

  // 5. Selectors handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, isChecked) => {
    if (isChecked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // 6. Action: Send batch WhatsApp messages
  const handleSendReminders = async (idsToSend) => {
    if (idsToSend.length === 0) return;
    
    let confirmMsg = `¿Deseas enviar ${idsToSend.length} recordatorio(s) de WhatsApp ahora?`;
    if (category === 'va_a_avisar') {
      confirmMsg = `¿Deseas enviar ${idsToSend.length} mensaje(s) de "Va a avisar" por WhatsApp ahora?`;
    } else if (category === 'mantenimiento') {
      confirmMsg = `¿Deseas enviar ${idsToSend.length} mensaje(s) de "Mantenimiento" por WhatsApp ahora?`;
    }

    if (!confirm(confirmMsg)) return;

    setSendingReminders(true);
    setSendingResults(null);

    try {
      const res = await fetch('/api/admin/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          turnoIds: idsToSend,
          category 
        })
      });
      const data = await res.json();

      if (res.ok) {
        const successes = data.results.filter(r => r.status === 'SUCCESS');
        const failures = data.results.filter(r => r.status === 'FAILED');
        setSendingResults({ successes, failures });
        showToast(`Envío finalizado. Éxitos: ${successes.length}. Errores: ${failures.length}.`, failures.length > 0 ? 'error' : 'success');
        
        // Refresh list
        fetchNotificationsList();
      } else {
        showToast(data.error || 'Error al enviar mensajes.', 'error');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      showToast('Error de conexión al enviar mensajes.', 'error');
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
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    });
  };

  const formatSimpleDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Status Box Rendering
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
            El sistema está listo para despachar avisos y recordatorios por WhatsApp.
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

  const isFollowUpCategory = category === 'va_a_avisar' || category === 'mantenimiento';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Gestión de Notificaciones</h2>
        <p>Vincula WhatsApp y despacha los avisos y recordatorios a tus clientes.</p>
      </div>

      {/* Grid Layout */}
      <div className={styles.topLayout}>
        
        {/* Left Column: WhatsApp Connection status & Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0, width: '100%' }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Sincronización WhatsApp</div>
            {renderWppStatusBox()}
          </div>
          
          <div className={styles.card}>
            <div className={styles.cardTitle}>Pausa Global de Envíos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>Notificaciones Automáticas:</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={globalNotificationsEnabled}
                    onChange={(e) => handleToggleGlobalNotifications(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{ 
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: globalNotificationsEnabled ? '#2e7d32' : '#7a1e1e',
                    transition: '.4s', borderRadius: '24px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: globalNotificationsEnabled ? 'translateX(22px)' : 'translateX(0)'
                    }} />
                  </span>
                </label>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {globalNotificationsEnabled 
                  ? '🟢 El sistema despacha con normalidad todos los correos y mensajes de WhatsApp.' 
                  : '🔴 Todos los envíos de notificaciones (confirmación, cancelación, recordatorios, Mercado Pago) están suspendidos.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Notifications list with Dropdown Selector */}
        <div className={styles.card} style={{ minWidth: 0, width: '100%' }}>
          <div className={styles.cardTitle}>Listado de Notificaciones y Avisos</div>

          {/* Desplegable Principal de Selección de Categoría */}
          <div className={styles.categoryDropdownWrapper}>
            <select 
              className={styles.categoryDropdown} 
              value={category} 
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="current">📅 Turnos de la Semana Actual</option>
              <option value="next">📅 Turnos de la Próxima Semana</option>
              <option value="2days">⏰ Turnos en 2 Días (Recordatorio 48hs)</option>
              <option value="va_a_avisar">⏳ Clientes "Va a avisar"</option>
              <option value="mantenimiento">🛠️ Clientes en "Mantenimiento"</option>
            </select>
          </div>

          {/* Panel de Filtro de Rango de Fechas para "Va a avisar" y "Mantenimiento" */}
          {isFollowUpCategory && (
            <div className={styles.dateFilterContainer}>
              <div className={styles.dateFilterHeader}>
                <div className={styles.filterByGroup}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Filtrar por:</span>
                  <select 
                    className={styles.filterBySelect} 
                    value={filterBy} 
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="aviso">🔔 Fecha sugerida de envío (Recomendado)</option>
                    <option value="sesion">📅 Fecha de última sesión</option>
                  </select>
                </div>
                <label className={styles.showAllLabel}>
                  <input 
                    type="checkbox" 
                    checked={showAllNotified} 
                    onChange={(e) => setShowAllNotified(e.target.checked)} 
                  />
                  <span>Ver también ya notificados</span>
                </label>
              </div>

              <div className={styles.dateInputsRow}>
                <div className={styles.dateGroup}>
                  <label className={styles.dateLabel}>Desde</label>
                  <input 
                    type="date" 
                    className={styles.dateInput} 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div className={styles.dateGroup}>
                  <label className={styles.dateLabel}>Hasta</label>
                  <input 
                    type="date" 
                    className={styles.dateInput} 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                </div>
                <button 
                  type="button" 
                  className={styles.btnRefreshDates} 
                  onClick={fetchNotificationsList}
                  title="Actualizar listado de avisos"
                >
                  <RefreshIcon /> Actualizar
                </button>
              </div>
            </div>
          )}

          {/* Bulk Actions Panel */}
          <div className={styles.massActions}>
            <div className={styles.selectAllWrapper}>
              <input 
                type="checkbox" 
                className={styles.checkbox}
                checked={items.length > 0 && selectedIds.length === items.length}
                onChange={handleSelectAll}
                disabled={items.length === 0}
              />
              <span>Seleccionar todos ({selectedIds.length}/{items.length})</span>
            </div>

            <button 
              className="btn btn-primary"
              disabled={selectedIds.length === 0 || wppStatus !== 'CONNECTED' || sendingReminders}
              onClick={() => handleSendReminders(selectedIds)}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              {sendingReminders 
                ? 'Enviando...' 
                : category === 'va_a_avisar' 
                  ? `Enviar Aviso "Va a avisar" (${selectedIds.length})` 
                  : category === 'mantenimiento'
                    ? `Enviar Aviso "Mantenimiento" (${selectedIds.length})`
                    : `Enviar Recordatorios (${selectedIds.length})`}
            </button>
          </div>

          {/* Table / Cards list */}
          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gold)' }}>
              Cargando listado de notificaciones...
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              {category === 'va_a_avisar' 
                ? 'No se encontraron clientes con etiqueta "Va a avisar" pendientes de mensaje en este período.' 
                : category === 'mantenimiento'
                  ? 'No se encontraron clientes en "Mantenimiento" pendientes de mensaje en este período.'
                  : 'No hay turnos programados o pendientes de recordatorio en esta semana.'}
            </div>
          ) : (
            <div className={styles.notifCardsList}>
              {items.map((t) => {
                const isSelected = selectedIds.includes(t.id);

                // Render para "Va a avisar" y "Mantenimiento"
                if (isFollowUpCategory) {
                  return (
                    <div 
                      key={t.id} 
                      className={`${styles.notifCard} ${isSelected ? styles.notifCardSelected : ''}`}
                    >
                      {/* Checkbox Columna Izquierda */}
                      <div className={styles.notifCardCheckCol}>
                        <input 
                          type="checkbox" 
                          className={styles.checkbox}
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(t.id, e.target.checked)}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Contenido Principal */}
                      <div className={styles.notifCardMain}>
                        <div className={styles.notifClientHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span className={styles.notifClientName}>{t.cliente.nombreCompleto}</span>
                            {category === 'va_a_avisar' ? (
                              <span className={styles.badgeVaAAvisar}>⏳ Va a avisar</span>
                            ) : (
                              <span className={styles.badgeMantenimiento}>🛠️ Mantenimiento</span>
                            )}
                          </div>
                          <span className={styles.notifClientPhone}>{t.cliente.whatsapp}</span>
                        </div>

                        <div className={styles.notifDetailsList}>
                          <div className={styles.notifDetailItem}>
                            <span style={{ fontSize: '0.95rem' }}>📅</span>
                            <span><strong>Última sesión:</strong> {formatSimpleDate(t.fechaUltimaSesion)}</span>
                          </div>
                          <div className={styles.notifDetailItem}>
                            <span style={{ fontSize: '0.95rem' }}>🏷️</span>
                            <span style={{ wordBreak: 'break-word' }}><strong>Zonas:</strong> {t.zonas}</span>
                          </div>
                          <div className={styles.notifDetailItem}>
                            <span style={{ fontSize: '0.95rem' }}>💵</span>
                            <span><strong>Valor último turno:</strong> ${(t.valorTotal || 0).toLocaleString('es-AR')}</span>
                          </div>
                          <div className={styles.notifDetailItem}>
                            <span style={{ fontSize: '0.95rem' }}>⏱️</span>
                            <span>
                              <strong>Siguiente turno:</strong>{' '}
                              {category === 'va_a_avisar' 
                                ? `${t.frecuenciaSemanas} semanas desde esa sesión (${formatSimpleDate(t.fechaSiguienteTurno)})` 
                                : '10 semanas / 2,5 meses aprox.'}
                            </span>
                          </div>
                          <div className={styles.notifDetailItem}>
                            <span style={{ fontSize: '0.95rem' }}>🔔</span>
                            <span>
                              <strong>Aviso sugerido:</strong> {formatSimpleDate(t.fechaSugeridaAviso)}{' '}
                              <span className={styles.badgeSuggestedDate}>
                                {category === 'va_a_avisar' ? '1 semana antes' : '2,5 meses'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: Estado y Botones de Acción */}
                      <div className={styles.notifCardRight}>
                        <div className={styles.notifStatusCol}>
                          {!t.alreadyNotified ? (
                            <span className={`${styles.statusLabel} ${styles.statusNone}`}>Pendiente</span>
                          ) : (
                            <>
                              <span className={`${styles.statusLabel} ${styles.statusSent}`}>Enviado</span>
                              {t.lastNotification && (
                                <span className={styles.lastSentText} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {new Date(t.lastNotification.fechaEnvio).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className={styles.notifActionsRow}>
                          <button 
                            type="button"
                            className={styles.btnActionIconOutlined}
                            onClick={() => openPreview(t.previewText)}
                            title="Ver vista previa del mensaje de WhatsApp"
                          >
                            <EyeIcon />
                          </button>
                          <button 
                            type="button"
                            className={styles.btnActionSendBordo}
                            disabled={wppStatus !== 'CONNECTED' || sendingReminders}
                            onClick={() => handleSendReminders([t.id])}
                            title={wppStatus !== 'CONNECTED' ? 'Conecta WhatsApp para despachar' : 'Enviar mensaje por WhatsApp'}
                          >
                            <SendIcon />
                          </button>
                          <a 
                            href={`/admin/clientes?id=${t.cliente.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.btnActionIconOutlined}
                            title="Ver ficha de cliente"
                            style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                          >
                            👤
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Render para Turnos Regulares (current, next, 2days)
                const lastNotif = t.cliente.lastNotification;
                let parsedZones = [];
                try {
                  parsedZones = JSON.parse(t.zonas || '[]');
                } catch {
                  parsedZones = [];
                }
                const zonasText = Array.isArray(parsedZones) && parsedZones.length > 0 
                  ? parsedZones.map(z => z.nombre || z.name || '').filter(Boolean).join(', ') 
                  : (t.zonas || 'Sin zonas');

                return (
                  <div 
                    key={t.id} 
                    className={`${styles.notifCard} ${isSelected ? styles.notifCardSelected : ''}`}
                  >
                    {/* Checkbox Columna Izquierda */}
                    <div className={styles.notifCardCheckCol}>
                      <input 
                        type="checkbox" 
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(t.id, e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Contenido Principal */}
                    <div className={styles.notifCardMain}>
                      <div className={styles.notifClientHeader}>
                        <span className={styles.notifClientName}>{t.cliente.nombreCompleto}</span>
                        <span className={styles.notifClientPhone}>{t.cliente.whatsapp}</span>
                      </div>

                      <div className={styles.notifDetailsList}>
                        <div className={styles.notifDetailItem}>
                          <span style={{ fontSize: '0.95rem' }}>📅</span>
                          <span style={{ textTransform: 'capitalize' }}>{formatTurnoDate(t.fecha)}</span>
                        </div>
                        <div className={styles.notifDetailItem}>
                          <span style={{ fontSize: '0.95rem' }}>🕒</span>
                          <span>{t.horaInicio} a {t.horaFin} hs</span>
                        </div>
                        <div className={styles.notifDetailItem}>
                          <span style={{ fontSize: '0.95rem' }}>🏷️</span>
                          <span style={{ wordBreak: 'break-word' }}>{zonasText}</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Estado y Botones de Acción */}
                    <div className={styles.notifCardRight}>
                      <div className={styles.notifStatusCol}>
                        {!lastNotif ? (
                          <span className={`${styles.statusLabel} ${styles.statusNone}`}>Pendiente</span>
                        ) : lastNotif.estado === 'ENVIADO' ? (
                          <>
                            <span className={`${styles.statusLabel} ${styles.statusSent}`}>Enviado</span>
                            <span className={styles.lastSentText} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {new Date(lastNotif.fechaEnvio).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`${styles.statusLabel} ${styles.statusFailed}`}>Fallido</span>
                            <span className={styles.lastSentText} style={{ fontSize: '0.72rem', color: '#ef4444' }}>Reintentar</span>
                          </>
                        )}
                      </div>

                      <div className={styles.notifActionsRow}>
                        <button 
                          type="button"
                          className={styles.btnActionIconOutlined}
                          onClick={() => openPreview(t.previewText)}
                          title="Ver vista previa del mensaje de WhatsApp"
                        >
                          <EyeIcon />
                        </button>
                        <button 
                          type="button"
                          className={styles.btnActionSendBordo}
                          disabled={wppStatus !== 'CONNECTED' || sendingReminders}
                          onClick={() => handleSendReminders([t.id])}
                          title={wppStatus !== 'CONNECTED' ? 'Conecta WhatsApp para despachar recordatorios' : 'Enviar recordatorio por WhatsApp'}
                        >
                          <SendIcon />
                        </button>
                        <a 
                          href={`/admin/clientes?id=${t.cliente.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.btnActionIconOutlined}
                          title="Ver ficha de cliente"
                          style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                        >
                          👤
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    ✅ Mensaje enviado con éxito a {item.cliente}
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
