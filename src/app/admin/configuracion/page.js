'use client';

import { useState, useEffect, Fragment } from 'react';
import styles from './configuracion.module.css';

// SVG Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('zones'); // 'zones', 'hours', 'templates'

  // Zones State
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null); // null means creating new
  const [editingZoneId, setEditingZoneId] = useState(null); // for inline editing

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const [zoneForm, setZoneForm] = useState({
    nombre: '',
    precioBase: '',
    duracionMinutos: '',
    señaBase: ''
  });

  // Configurations State
  const [configs, setConfigs] = useState({
    wtsp_reminder_template: '',
    wtsp_confirmation_template: '',
    address: '',
    work_start: '10:00',
    work_end: '20:00',
    email_confirmation_subject: '',
    email_confirmation_body: '',
    email_cancellation_subject: '',
    email_cancellation_body: '',
    email_noshow_subject: '',
    email_noshow_body: '',
    email_maintenance_subject: '',
    email_maintenance_body: '',
    wtsp_confirmation_manual_template: '',
    wtsp_noshow_template: '',
    wtsp_cancellation_template: '',
    wtsp_reschedule_template: '',
    email_reprogram_subject: '',
    email_reprogram_body: '',
    email_reminder_7days_subject: '',
    email_reminder_7days_body: ''
  });
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [savingConfigs, setSavingConfigs] = useState(false);

  // 1. Fetch zones
  const fetchZones = () => {
    setLoadingZones(true);
    fetch('/api/zonas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setZones(data);
        }
      })
      .catch(err => console.error('Error fetching zones:', err))
      .finally(() => setLoadingZones(false));
  };

  // 2. Fetch configurations
  const fetchConfigs = () => {
    setLoadingConfigs(true);
    fetch('/api/admin/configuracion')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setConfigs({
            wtsp_reminder_template: data.wtsp_reminder_template || '',
            wtsp_confirmation_template: data.wtsp_confirmation_template || '',
            address: data.address || '',
            work_start: data.work_start || '10:00',
            work_end: data.work_end || '20:00',
            email_confirmation_subject: data.email_confirmation_subject || '',
            email_confirmation_body: data.email_confirmation_body || '',
            email_cancellation_subject: data.email_cancellation_subject || '',
            email_cancellation_body: data.email_cancellation_body || '',
            email_noshow_subject: data.email_noshow_subject || '',
            email_noshow_body: data.email_noshow_body || '',
            email_maintenance_subject: data.email_maintenance_subject || '',
            email_maintenance_body: data.email_maintenance_body || '',
            wtsp_confirmation_manual_template: data.wtsp_confirmation_manual_template || '',
            wtsp_noshow_template: data.wtsp_noshow_template || '',
            wtsp_cancellation_template: data.wtsp_cancellation_template || '',
            wtsp_reschedule_template: data.wtsp_reschedule_template || '',
            email_reprogram_subject: data.email_reprogram_subject || '',
            email_reprogram_body: data.email_reprogram_body || '',
            email_reminder_7days_subject: data.email_reminder_7days_subject || '',
            email_reminder_7days_body: data.email_reminder_7days_body || ''
          });
        }
      })
      .catch(err => console.error('Error fetching configs:', err))
      .finally(() => setLoadingConfigs(false));
  };

  useEffect(() => {
    fetchZones();
    fetchConfigs();
  }, []);

  // 3. Save configurations in bulk
  const handleSaveConfigs = async (e) => {
    e.preventDefault();
    setSavingConfigs(true);
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs)
      });
      if (res.ok) {
        showToast('Configuraciones guardadas correctamente.');
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al guardar configuraciones.', 'error');
      }
    } catch (err) {
      console.error('Error saving configs:', err);
      showToast('Error de red al guardar configuraciones.', 'error');
    } finally {
      setSavingConfigs(false);
    }
  };

  // 4. CRUD Zone: Open creation modal
  const handleOpenNewZone = () => {
    setEditingZone(null);
    setZoneForm({
      nombre: '',
      precioBase: '',
      duracionMinutos: '',
      señaBase: ''
    });
    setIsZoneModalOpen(true);
  };

  // 5. CRUD Zone: Open inline edit row
  const handleOpenEditZone = (zone) => {
    setEditingZoneId(zone.id);
    setZoneForm({
      nombre: zone.nombre,
      precioBase: zone.precioBase,
      duracionMinutos: zone.duracionMinutos,
      señaBase: zone.señaBase
    });
  };

  // 5.1 CRUD Zone: Submit inline edit
  const handleSaveInlineZone = async (e, zoneId) => {
    e.preventDefault();
    if (!zoneForm.nombre || !zoneForm.precioBase || !zoneForm.duracionMinutos || !zoneForm.señaBase) {
      showToast('Por favor, completa todos los campos.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/zonas/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: zoneForm.nombre,
          precioBase: Number(zoneForm.precioBase),
          duracionMinutos: Number(zoneForm.duracionMinutos),
          señaBase: Number(zoneForm.señaBase)
        })
      });

      if (res.ok) {
        setEditingZoneId(null);
        showToast('Zona modificada correctamente.');
        fetchZones();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al guardar la zona.', 'error');
      }
    } catch (err) {
      console.error('Error saving zone:', err);
      showToast('Error al guardar la zona.', 'error');
    }
  };

  // 6. CRUD Zone: Submit creation (Modal)
  const handleSaveZone = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!zoneForm.nombre || !zoneForm.precioBase || !zoneForm.duracionMinutos || !zoneForm.señaBase) {
      showToast('Por favor, completa todos los campos.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/zonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: zoneForm.nombre,
          precioBase: Number(zoneForm.precioBase),
          duracionMinutos: Number(zoneForm.duracionMinutos),
          señaBase: Number(zoneForm.señaBase)
        })
      });

      if (res.ok) {
        setIsZoneModalOpen(false);
        showToast('Nueva zona agregada con éxito.');
        fetchZones();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al guardar la zona.', 'error');
      }
    } catch (err) {
      console.error('Error saving zone:', err);
      showToast('Error al guardar la zona.', 'error');
    }
  };

  // 7. CRUD Zone: Delete zone
  const handleDeleteZone = async (zoneId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta zona?')) return;
    try {
      const res = await fetch(`/api/zonas/${zoneId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Zona eliminada correctamente.');
        fetchZones();
      } else {
        const d = await res.json();
        showToast(d.error || 'No se puede eliminar la zona. Podría estar vinculada a turnos existentes.', 'error');
      }
    } catch (e) {
      console.error('Error deleting zone:', e);
      showToast('Error al intentar eliminar la zona.', 'error');
    }
  };

  // 8. Copy variable placeholder to clipboard helper
  const handleCopyVariable = (variable) => {
    navigator.clipboard.writeText(variable);
    showToast(`Copiado al portapapeles: ${variable}`);
  };

  // Generating work hours slots for the selector (07:00 to 22:00 every 30 minutes)
  const hourSlots = [];
  for (let h = 7; h <= 22; h++) {
    const hh = h.toString().padStart(2, '0');
    hourSlots.push(`${hh}:00`);
    if (h !== 22) {
      hourSlots.push(`${hh}:30`);
    }
  }

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Configuración del Sistema</h2>
        <p>Administra las zonas de depilación, los horarios hábiles de atención y las plantillas de mensajes.</p>
      </div>

      {/* Tabs Selector */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'zones' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          Zonas de Depilación
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'hours' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('hours')}
        >
          Horarios Laborales
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'templates' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Mensajes y Plantillas
        </button>
      </div>

      {/* Tab Content 1: Zones Management */}
      {activeTab === 'zones' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>
            <span>Catálogo de Zonas y Precios</span>
            <button className="btn btn-primary" onClick={handleOpenNewZone} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <PlusIcon /> Agregar Zona
            </button>
          </div>

          {loadingZones ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gold)' }}>Cargando zonas de la base de datos...</div>
          ) : zones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay zonas configuradas. Crea una para comenzar.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Zona</th>
                    <th className={styles.th}>Precio Base</th>
                    <th className={styles.th}>Seña Requerida</th>
                    <th className={styles.th}>Duración</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map(z => {
                    const isEditingThisZone = editingZoneId === z.id;
                    return (
                      <Fragment key={z.id}>
                        <tr className={styles.tr}>
                          <td className={styles.td} data-label="Zona" style={{ fontWeight: 600 }}>{z.nombre}</td>
                          <td className={styles.td} data-label="Precio Base">{formatMoney(z.precioBase)}</td>
                          <td className={styles.td} data-label="Seña Requerida">{formatMoney(z.señaBase)}</td>
                          <td className={styles.td} data-label="Duración">{z.duracionMinutos} min</td>
                          <td className={styles.td} data-label="Acciones" style={{ textAlign: 'right' }}>
                            <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem' }} 
                                onClick={() => handleOpenEditZone(z)}
                                disabled={editingZoneId !== null && editingZoneId !== z.id}
                              >
                                <EditIcon />
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem', color: '#ff5252', borderColor: 'rgba(198, 40, 40, 0.15)' }} 
                                onClick={() => handleDeleteZone(z.id)}
                                disabled={editingZoneId !== null}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isEditingThisZone && (
                          <tr key={`edit-${z.id}`}>
                            <td colSpan="5" className={styles.td} style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.04)', padding: '1rem', borderBottom: '2px solid var(--color-gold)' }}>
                              <form onSubmit={(e) => handleSaveInlineZone(e, z.id)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                                  <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Nombre de la Zona</label>
                                    <input 
                                      type="text" 
                                      className={styles.input} 
                                      value={zoneForm.nombre}
                                      onChange={(e) => setZoneForm({ ...zoneForm, nombre: e.target.value })}
                                      required 
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                    />
                                  </div>
                                  <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Precio Base ($)</label>
                                    <input 
                                      type="number" 
                                      className={styles.input} 
                                      value={zoneForm.precioBase}
                                      onChange={(e) => setZoneForm({ ...zoneForm, precioBase: e.target.value })}
                                      required 
                                      min="0"
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                    />
                                  </div>
                                  <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Seña Requerida ($)</label>
                                    <input 
                                      type="number" 
                                      className={styles.input} 
                                      value={zoneForm.señaBase}
                                      onChange={(e) => setZoneForm({ ...zoneForm, señaBase: e.target.value })}
                                      required 
                                      min="0"
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                    />
                                  </div>
                                  <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Duración (minutos)</label>
                                    <input 
                                      type="number" 
                                      className={styles.input} 
                                      value={zoneForm.duracionMinutos}
                                      onChange={(e) => setZoneForm({ ...zoneForm, duracionMinutos: e.target.value })}
                                      required 
                                      min="10"
                                      step="10"
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                  <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 'auto' }} onClick={() => setEditingZoneId(null)}>
                                    Cancelar
                                  </button>
                                  <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 'auto' }}>
                                    Modificar
                                  </button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Hours Management */}
      {activeTab === 'hours' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Rango Horario de Atención</div>
          {loadingConfigs ? (
            <div style={{ color: 'var(--color-gold)' }}>Cargando configuraciones...</div>
          ) : (
            <form onSubmit={handleSaveConfigs} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora de Inicio de Atención</label>
                  <select 
                    className={styles.input} 
                    value={configs.work_start}
                    onChange={(e) => setConfigs({ ...configs, work_start: e.target.value })}
                  >
                    {hourSlots.map(slot => (
                      <option key={`start-${slot}`} value={slot}>{slot} hs</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora de Finalización</label>
                  <select 
                    className={styles.input} 
                    value={configs.work_end}
                    onChange={(e) => setConfigs({ ...configs, work_end: e.target.value })}
                  >
                    {hourSlots.map(slot => (
                      <option key={`end-${slot}`} value={slot}>{slot} hs</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Dirección del Consultorio</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={configs.address}
                  onChange={(e) => setConfigs({ ...configs, address: e.target.value })}
                  placeholder="Ej: Paraná 597, piso 8, depto 48"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: 'fit-content', padding: '0.75rem 1.5rem', borderRadius: '8px' }}
                disabled={savingConfigs}
              >
                {savingConfigs ? 'Guardando...' : 'Guardar Horarios'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab Content 3: Reminder Templates */}
      {activeTab === 'templates' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Mensajes de WhatsApp</div>
          {loadingConfigs ? (
            <div style={{ color: 'var(--color-gold)' }}>Cargando configuraciones...</div>
          ) : (
            <form onSubmit={handleSaveConfigs} className={styles.form} style={{ maxWidth: '750px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-gold)', marginBottom: '1rem' }}>Mensajes de WhatsApp</div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Recordatorio de Turno (48hs Antes)</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_reminder_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_reminder_template: e.target.value })}
                  placeholder="Te recuerdo el turno de esta semana..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Confirmación de Reserva Aprobada</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_confirmation_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_confirmation_template: e.target.value })}
                  placeholder="Tu reserva fue aprobada con éxito..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Confirmación de Alta de Turno Manual</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_confirmation_manual_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_confirmation_manual_template: e.target.value })}
                  placeholder="Tu turno fue agendado con éxito..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Aviso de Inasistencia (No Asistió) por WhatsApp</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_noshow_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_noshow_template: e.target.value })}
                  placeholder="Lamentamos que no hayas asistido a tu turno..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Aviso de Cancelación de Turno por WhatsApp</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_cancellation_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_cancellation_template: e.target.value })}
                  placeholder="Tu turno fue cancelado..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Aviso de Reprogramación de Turno por WhatsApp</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_reschedule_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_reschedule_template: e.target.value })}
                  placeholder="Tu turno fue reprogramado con éxito..."
                  required
                />
              </div>

              {/* Variable Helper */}
              <div className={styles.variableHelper} style={{ marginBottom: '2rem' }}>
                <div className={styles.variableTitle}>Variables Automáticas WhatsApp (Toca para copiar):</div>
                <div className={styles.variableGrid}>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Nombre]')}>[Nombre]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Apellido]')}>[Apellido]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[FechaTurno]')}>[FechaTurno]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Horario]')}>[Horario]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Zonas]')}>[Zonas]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[ValorTotal]')}>[ValorTotal]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Seña]')}>[Seña]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Direccion]')}>[Direccion]</div>
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: '2rem 0' }} />

              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-gold)', marginBottom: '1.5rem' }}>Plantillas de Correo Electrónico</div>

              {/* Email 1: Confirmation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#81c784' }}>📧 Correo de Confirmación de Turno (Alta)</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_confirmation_subject}
                    onChange={(e) => setConfigs({ ...configs, email_confirmation_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_confirmation_body}
                    onChange={(e) => setConfigs({ ...configs, email_confirmation_body: e.target.value })}
                    rows="6"
                    required
                  />
                </div>
              </div>

              {/* Email 2: Cancellation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#e57373' }}>📧 Correo de Cancelación de Turno</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_cancellation_subject}
                    onChange={(e) => setConfigs({ ...configs, email_cancellation_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_cancellation_body}
                    onChange={(e) => setConfigs({ ...configs, email_cancellation_body: e.target.value })}
                    rows="4"
                    required
                  />
                </div>
              </div>

              {/* Email 3: No Show */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#ffb74d' }}>📧 Correo de Inasistencia (No Asistió)</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_noshow_subject}
                    onChange={(e) => setConfigs({ ...configs, email_noshow_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_noshow_body}
                    onChange={(e) => setConfigs({ ...configs, email_noshow_body: e.target.value })}
                    rows="5"
                    required
                  />
                </div>
              </div>

              {/* Email 4: Maintenance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#64b5f6' }}>📧 Correo de Invitación a Mantenimiento (2.5 Meses)</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_maintenance_subject}
                    onChange={(e) => setConfigs({ ...configs, email_maintenance_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_maintenance_body}
                    onChange={(e) => setConfigs({ ...configs, email_maintenance_body: e.target.value })}
                    rows="5"
                    required
                  />
                </div>
              </div>

              {/* Email 5: Rescheduling */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#ffb74d' }}>📧 Correo de Reprogramación de Turno</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_reprogram_subject}
                    onChange={(e) => setConfigs({ ...configs, email_reprogram_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_reprogram_body}
                    onChange={(e) => setConfigs({ ...configs, email_reprogram_body: e.target.value })}
                    rows="5"
                    required
                  />
                </div>
              </div>

              {/* Email 6: 7-Day Reminder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#81c784' }}>📧 Correo de Recordatorio Automático (7 Días Antes)</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_reminder_7days_subject}
                    onChange={(e) => setConfigs({ ...configs, email_reminder_7days_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_reminder_7days_body}
                    onChange={(e) => setConfigs({ ...configs, email_reminder_7days_body: e.target.value })}
                    rows="6"
                    required
                  />
                </div>
              </div>

              {/* Variable Helper for Emails */}
              <div className={styles.variableHelper} style={{ marginBottom: '1.5rem' }}>
                <div className={styles.variableTitle}>Variables Automáticas Email (Toca para copiar):</div>
                <div className={styles.variableGrid}>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{cliente}')}>{"{cliente}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{fecha}')}>{"{fecha}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{horario}')}>{"{horario}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{zonas}')}>{"{zonas}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{total}')}>{"{total}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{seña}')}>{"{seña}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{saldo}')}>{"{saldo}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{direccion}')}>{"{direccion}"}</div>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: 'fit-content', padding: '0.75rem 1.5rem', borderRadius: '8px' }}
                disabled={savingConfigs}
              >
                {savingConfigs ? 'Guardando...' : 'Guardar Plantillas'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Zone Create / Edit Modal */}
      {isZoneModalOpen && (
        <div className="modal-overlay" onClick={() => setIsZoneModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingZone ? 'Editar Zona de Depilación' : 'Agregar Nueva Zona'}</h3>
              <button className="modal-close" onClick={() => setIsZoneModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveZone}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de la Zona</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={zoneForm.nombre}
                    onChange={(e) => setZoneForm({ ...zoneForm, nombre: e.target.value })}
                    placeholder="Ej: Piernas Completas"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Precio Base (ARS)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={zoneForm.precioBase}
                    onChange={(e) => setZoneForm({ ...zoneForm, precioBase: e.target.value })}
                    placeholder="Ej: 35000"
                    min="0"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Seña Requerida (ARS)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={zoneForm.señaBase}
                    onChange={(e) => setZoneForm({ ...zoneForm, señaBase: e.target.value })}
                    placeholder="Ej: 8500"
                    min="0"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Duración (minutos)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={zoneForm.duracionMinutos}
                    onChange={(e) => setZoneForm({ ...zoneForm, duracionMinutos: e.target.value })}
                    placeholder="Ej: 40"
                    min="10"
                    step="10"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsZoneModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
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
