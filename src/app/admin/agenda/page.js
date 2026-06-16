'use client';

import { useState, useEffect } from 'react';
import styles from './agenda.module.css';
import { calculateTurnDetails } from '@/lib/calculations.js';

// SVG Icons
const PrevIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const NextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>;

// Helper: Get starting date (Monday) of the week containing the given date
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // day: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

// Helper: Convert HH:MM to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function AgendaPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [weekDates, setWeekDates] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);

  // Form states for manual scheduling
  const [newTurno, setNewTurno] = useState({
    nombreCompleto: '',
    whatsapp: '',
    email: '',
    fechaStr: '',
    horaInicio: '10:00',
    horaFin: '10:30',
    selectedZoneIds: [],
    valorTotal: '',
    valorSeña: '',
    estado: 'SEÑADO',
    observaciones: ''
  });

  // 1. Initialize dates on mount
  useEffect(() => {
    const monday = getStartOfWeek(new Date());
    setCurrentWeekStart(monday);
  }, []);

  // 2. Generate the 6 dates of the week (Mon to Sat) when currentWeekStart changes
  useEffect(() => {
    if (!currentWeekStart) return;
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      dates.push(d);
    }
    setWeekDates(dates);
  }, [currentWeekStart]);

  // 3. Fetch appointments when week dates are ready
  const fetchAppointments = () => {
    if (weekDates.length === 0) return;
    setLoading(true);
    
    const startStr = weekDates[0].toISOString().split('T')[0];
    const endStr = weekDates[5].toISOString().split('T')[0];

    fetch(`/api/admin/turnos?start=${startStr}&end=${endStr}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAppointments(data);
        }
      })
      .catch(err => console.error('Error fetching appointments:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [weekDates]);

  // 4. Fetch zones for the new appointment modal
  useEffect(() => {
    fetch('/api/zonas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setZones(data);
        }
      })
      .catch(err => console.error('Error fetching zones:', err));
  }, []);

  // 5. Navigate weeks
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(next);
  };

  // Helper: Get layout styling for appointment block
  // Timeline: 10:00 to 20:00 (10 hours = 600 minutes total)
  // Height: 1 hour = 100px. Height of timeline container is 1000px.
  // Scale factor: 100px / 60min = 1.6667px per min
  const getBlockStyle = (horaInicio, horaFin) => {
    const startMin = timeToMinutes(horaInicio);
    const endMin = timeToMinutes(horaFin);
    const duration = endMin - startMin;

    const WORK_START = 600; // 10:00 in minutes
    
    const top = Math.max(0, (startMin - WORK_START) * (100 / 60));
    const height = Math.max(20, duration * (100 / 60)); // minimum 20px

    return {
      top: `${top}px`,
      height: `${height}px`
    };
  };

  // Handle Turno quick action: CANCEL, REALIZADO, APPROVE
  const handleUpdateStatus = async (turnoId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus })
      });
      if (res.ok) {
        setIsDetailsOpen(false);
        fetchAppointments();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  // Delete Turno
  const handleDeleteTurno = async (turnoId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este turno permanentemente?')) return;
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIsDetailsOpen(false);
        fetchAppointments();
      }
    } catch (e) {
      console.error('Error deleting turno:', e);
    }
  };

  // Open creation modal for a specific day and start hour
  const handleEmptySlotClick = (date, startMin) => {
    const startHour = Math.floor(startMin / 60);
    const startMins = startMin % 60;
    const timeStr = `${startHour.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`;
    
    const endMinutes = startMin + 30;
    const endHour = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    setNewTurno({
      nombreCompleto: '',
      whatsapp: '',
      email: '',
      fechaStr: date.toISOString().split('T')[0],
      horaInicio: timeStr,
      horaFin: endTimeStr,
      selectedZoneIds: [],
      valorTotal: '',
      valorSeña: '',
      estado: 'SEÑADO',
      observaciones: ''
    });
    setIsNewOpen(true);
  };

  // Re-calculate pricing/durations when newTurno inputs change
  useEffect(() => {
    if (newTurno.selectedZoneIds.length === 0) return;
    const selected = zones.filter(z => newTurno.selectedZoneIds.includes(z.id));
    
    // Assume regular/new based on form (defaults to new=false for manual scheduler)
    const calcs = calculateTurnDetails(selected, false);
    
    // Calculate horaFin based on start time + calculated duration
    const startMin = timeToMinutes(newTurno.horaInicio);
    const endMin = startMin + calcs.duracionMinutos;
    const endHour = Math.floor(endMin / 60);
    const endMins = endMin % 60;
    const horaFinStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    setNewTurno(prev => ({
      ...prev,
      horaFin: horaFinStr,
      valorTotal: prev.valorTotal === '' || prev.valorTotal === prev.autoTotal ? calcs.valorTotal : prev.valorTotal,
      valorSeña: prev.valorSeña === '' || prev.valorSeña === prev.autoSeña ? calcs.valorSeña : prev.valorSeña,
      autoTotal: calcs.valorTotal, // save to compare
      autoSeña: calcs.valorSeña
    }));
  }, [newTurno.selectedZoneIds, newTurno.horaInicio]);

  // Submit manual creation
  const handleCreateTurno = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTurno,
          valorTotal: Number(newTurno.valorTotal),
          valorSeña: Number(newTurno.valorSeña)
        })
      });
      if (res.ok) {
        setIsNewOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error creating manually:', err);
    }
  };

  const toggleNewTurnoZone = (zoneId) => {
    const exists = newTurno.selectedZoneIds.includes(zoneId);
    if (exists) {
      setNewTurno({
        ...newTurno,
        selectedZoneIds: newTurno.selectedZoneIds.filter(id => id !== zoneId)
      });
    } else {
      setNewTurno({
        ...newTurno,
        selectedZoneIds: [...newTurno.selectedZoneIds, zoneId]
      });
    }
  };

  const getStatusLabelClass = (status) => {
    switch (status) {
      case 'SEÑADO': return styles.badgeSenado;
      case 'REALIZADO': return styles.badgeRealizado;
      case 'CANCELADO': return styles.badgeCancelado;
      case 'REPROGRAMADO': return styles.badgeReprogramado;
      case 'NO_ASISTIO': return styles.badgeNoAsistio;
      case 'PENDIENTE_AUTORIZACION': return styles.badgePendienteAut;
      case 'PENDIENTE_PAGO': return styles.badgePendientePago;
      default: return '';
    }
  };

  const getStatusBlockClass = (status) => {
    switch (status) {
      case 'SEÑADO': return styles.stateSenado;
      case 'REALIZADO': return styles.stateRealizado;
      case 'CANCELADO': return styles.stateCancelado;
      case 'REPROGRAMADO': return styles.stateReprogramado;
      case 'NO_ASISTIO': return styles.stateNoAsistio;
      case 'PENDIENTE_AUTORIZACION': return styles.statePendienteAut;
      case 'PENDIENTE_PAGO': return styles.statePendientePago;
      default: return '';
    }
  };

  // Generate hourly labels for time column (10:00 to 20:00)
  const timeLabels = [];
  for (let i = 10; i <= 20; i++) {
    timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
  }

  // Formatting helper for week name range
  const getWeekRangeName = () => {
    if (weekDates.length === 0) return '';
    const first = weekDates[0];
    const last = weekDates[5];
    return `${first.getDate()} de ${first.toLocaleDateString('es-ES', { month: 'short' })} - ${last.getDate()} de ${last.toLocaleDateString('es-ES', { month: 'short' })} ${last.getFullYear()}`;
  };

  return (
    <div>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Agenda de Turnos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Visualizá y gestioná las reservas semanales en bloques de 10 minutos.</p>
        </div>
        <div className={styles.controls}>
          <button onClick={handlePrevWeek} className={styles.navBtn}><PrevIcon /></button>
          <span className={styles.currentWeek}>{getWeekRangeName()}</span>
          <button onClick={handleNextWeek} className={styles.navBtn}><NextIcon /></button>
          <button onClick={() => {
            setNewTurno({
              nombreCompleto: '',
              whatsapp: '',
              email: '',
              fechaStr: new Date().toISOString().split('T')[0],
              horaInicio: '10:00',
              horaFin: '10:30',
              selectedZoneIds: [],
              valorTotal: '',
              valorSeña: '',
              estado: 'SEÑADO',
              observaciones: ''
            });
            setIsNewOpen(true);
          }} className="btn btn-primary">+ Nuevo Turno</button>
        </div>
      </div>

      {/* Week Calendar Grid */}
      <div className={styles.calendarContainer}>
        {/* Days Header */}
        <div className={styles.gridHeader}>
          <div className={`${styles.headerCell} ${styles.timeColHeader}`}>Hora</div>
          {weekDates.map((date, index) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
            return (
              <div key={index} className={styles.headerCell}>
                <span className={styles.dayName}>{dayName}</span>
                <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline body */}
        <div className={styles.gridBody}>
          {/* Time Column */}
          <div className={styles.timeColumn}>
            {timeLabels.map((time, idx) => (
              <div key={idx} className={styles.timeLabel}>{time}</div>
            ))}
          </div>

          {/* Days Columns */}
          {weekDates.map((date, dayIdx) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayAppointments = appointments.filter(app => {
              const appDateStr = new Date(app.fecha).toISOString().split('T')[0];
              return appDateStr === dateStr;
            });

            return (
              <div key={dayIdx} className={styles.dayColumn}>
                {/* Background grid lines for hours */}
                <div className={styles.gridLines}>
                  {timeLabels.map((_, idx) => (
                    <div key={idx} className={styles.gridLineRow}></div>
                  ))}
                </div>

                {/* Empty slot clicks handlers - lets click every 30 minutes for convenience */}
                {Array.from({ length: 20 }).map((_, idx) => {
                  const startMin = 600 + idx * 30; // starts at 10:00 (600min) up to 20:00 (1200min)
                  const top = idx * 50; // 30 mins = 50px height
                  return (
                    <div
                      key={idx}
                      className={styles.emptySlotTrigger}
                      style={{ top: `${top}px`, height: '50px' }}
                      onClick={() => handleEmptySlotClick(date, startMin)}
                    ></div>
                  );
                })}

                {/* Appointments blocks absolute positioning */}
                {dayAppointments.map((app) => {
                  const blockStyle = getBlockStyle(app.horaInicio, app.horaFin);
                  let zonesText = '';
                  try {
                    const parsed = JSON.parse(app.zonas);
                    zonasText = parsed.map(z => z.nombre).join(', ');
                  } catch (e) {
                    zonasText = app.zonas;
                  }

                  return (
                    <div
                      key={app.id}
                      className={`${styles.appointmentBlock} ${getStatusBlockClass(app.estado)}`}
                      style={blockStyle}
                      onClick={() => {
                        setSelectedTurno(app);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <span className={styles.appTitle}>{app.cliente.nombreCompleto}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zonasText}</span>
                      <span className={styles.appTime}>{app.horaInicio} - {app.horaFin}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: Appointment Details */}
      {isDetailsOpen && selectedTurno && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card premium-border ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>Detalle del Turno</h3>
              <button onClick={() => setIsDetailsOpen(false)} className={styles.closeBtn}>&times;</button>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Cliente</span>
                <span className={styles.detailValue} style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {selectedTurno.cliente.nombreCompleto}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Estado</span>
                <span className={`${styles.statusPill} ${getStatusLabelClass(selectedTurno.estado)}`}>
                  {selectedTurno.estado}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Día</span>
                <span className={styles.detailValue}>{new Date(selectedTurno.fecha).toLocaleDateString('es-ES', { dateStyle: 'long' })}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Horario</span>
                <span className={styles.detailValue}>{selectedTurno.horaInicio} a {selectedTurno.horaFin} ({selectedTurno.duracionMinutos} min)</span>
              </div>
              <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
                <span className={styles.detailLabel}>Zonas a depilar</span>
                <span className={styles.detailValue}>
                  {JSON.parse(selectedTurno.zonas).map(z => z.nombre).join(', ')}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Valor Total</span>
                <span className={styles.detailValue}>${selectedTurno.valorTotal.toLocaleString()}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Seña Cobrada</span>
                <span className={styles.detailValue} style={{ color: '#81c784' }}>${selectedTurno.valorSeña.toLocaleString()}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Saldo Pendiente</span>
                <span className={styles.detailValue}>${selectedTurno.saldoPendiente.toLocaleString()}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>WhatsApp</span>
                <span className={styles.detailValue}>{selectedTurno.cliente.whatsapp}</span>
              </div>
              <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
                <span className={styles.detailLabel}>Observaciones</span>
                <span className={styles.detailValue}>{selectedTurno.observaciones || 'Sin observaciones'}</span>
              </div>
            </div>

            {/* Actions Panel */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <span className={styles.detailLabel} style={{ display: 'block', marginBottom: '0.75rem' }}>Acciones Rápidas</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedTurno.estado === 'PENDIENTE_AUTORIZACION' && (
                  <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn btn-primary" style={{ flex: '1 0 45%', backgroundColor: '#2e7d32', color: '#fff' }}>
                    Aprobar y Confirmar
                  </button>
                )}
                {selectedTurno.estado !== 'REALIZADO' && selectedTurno.estado !== 'CANCELADO' && (
                  <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', borderColor: '#1565c0', color: '#64b5f6' }}>
                    Marcar como Realizado
                  </button>
                )}
                {selectedTurno.estado !== 'CANCELADO' && (
                  <button onClick={() => handleUpdateStatus(selectedTurno.id, 'CANCELADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', borderColor: '#c62828', color: '#ff8a8a' }}>
                    Cancelar Turno
                  </button>
                )}
                {selectedTurno.estado === 'CANCELADO' && (
                  <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn btn-secondary" style={{ flex: '1 0 45%' }}>
                    Re-activar Turno
                  </button>
                )}
                <a href={`https://wa.me/${selectedTurno.cliente.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: '1 0 45%', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: '#25D366', color: '#25D366' }}>
                  💬 Chatear por WhatsApp
                </a>
                <button onClick={() => handleDeleteTurno(selectedTurno.id)} className="btn btn-secondary" style={{ flex: '1 0 45%', borderColor: '#c62828', color: '#ff8a8a' }}>
                  🗑️ Eliminar Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: New Manual Turno */}
      {isNewOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card premium-border ${styles.modalContent}`} style={{ maxWidth: '550px' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>Agendar Nuevo Turno</h3>
              <button onClick={() => setIsNewOpen(false)} className={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleCreateTurno}>
              <div className={styles.detailGrid}>
                {/* Personal Info */}
                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.inputLabel}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    value={newTurno.nombreCompleto}
                    onChange={(e) => setNewTurno({ ...newTurno, nombreCompleto: e.target.value })}
                    required
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>WhatsApp *</label>
                  <input
                    type="tel"
                    value={newTurno.whatsapp}
                    onChange={(e) => setNewTurno({ ...newTurno, whatsapp: e.target.value })}
                    required
                    placeholder="Ej. 54911223344"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email *</label>
                  <input
                    type="email"
                    value={newTurno.email}
                    onChange={(e) => setNewTurno({ ...newTurno, email: e.target.value })}
                    required
                    placeholder="Ej. cliente@correo.com"
                  />
                </div>

                {/* Date & Time */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Fecha *</label>
                  <input
                    type="date"
                    value={newTurno.fechaStr}
                    onChange={(e) => setNewTurno({ ...newTurno, fechaStr: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Hora Inicio *</label>
                  <input
                    type="time"
                    value={newTurno.horaInicio}
                    onChange={(e) => setNewTurno({ ...newTurno, horaInicio: e.target.value })}
                    required
                  />
                </div>

                {/* Zones Checkboxes */}
                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.inputLabel}>Seleccionar Zonas *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
                    {zones.map(z => {
                      const isChecked = newTurno.selectedZoneIds.includes(z.id);
                      return (
                        <div key={z.id} onClick={() => toggleNewTurnoZone(z.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={isChecked} readOnly style={{ width: 'auto' }} />
                          <span>{z.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Hora Fin (Calculado)</label>
                  <input
                    type="time"
                    value={newTurno.horaFin}
                    onChange={(e) => setNewTurno({ ...newTurno, horaFin: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Total de Venta ($)</label>
                  <input
                    type="number"
                    value={newTurno.valorTotal}
                    onChange={(e) => setNewTurno({ ...newTurno, valorTotal: e.target.value })}
                    required
                    placeholder="Auto-calculado si está vacío"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Seña Recibida ($)</label>
                  <input
                    type="number"
                    value={newTurno.valorSeña}
                    onChange={(e) => setNewTurno({ ...newTurno, valorSeña: e.target.value })}
                    required
                    placeholder="Auto-calculado si está vacío"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Estado Inicial</label>
                  <select
                    value={newTurno.estado}
                    onChange={(e) => setNewTurno({ ...newTurno, estado: e.target.value })}
                  >
                    <option value="SEÑADO">Señado / Confirmado</option>
                    <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
                    <option value="PENDIENTE_AUTORIZACION">Pendiente de Autorización</option>
                  </select>
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.inputLabel}>Observaciones</label>
                  <textarea
                    value={newTurno.observaciones}
                    onChange={(e) => setNewTurno({ ...newTurno, observaciones: e.target.value })}
                    placeholder="Ej. Campaña Facebook Ads, Tolerancia extra, etc."
                    rows="2"
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsNewOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={newTurno.selectedZoneIds.length === 0}>Guardar Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
