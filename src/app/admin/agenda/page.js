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

// Helper: Add minutes to time string HH:MM
function addMinutesToTime(timeStr, minsToAdd) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const total = hours * 60 + minutes + minsToAdd;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

export default function AgendaPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [weekDates, setWeekDates] = useState([]);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Autocomplete and config states
  const [allClients, setAllClients] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [config, setConfig] = useState({
    work_start: '10:00',
    work_end: '20:00'
  });

  // Modals state
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nowPosition, setNowPosition] = useState(null);
  const [editTurno, setEditTurno] = useState({
    fechaStr: '',
    horaInicio: '',
    horaFin: '',
    estado: '',
    valorTotal: '',
    valorSeña: '',
    observaciones: ''
  });


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
    observaciones: '',
    clienteId: null
  });

  // 1. Initialize dates and configurations on mount
  useEffect(() => {
    const today = new Date();
    const monday = getStartOfWeek(today);
    setCurrentWeekStart(monday);
    setSelectedDate(today);

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('day');
    }

    fetch('/api/admin/configuracion')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfig({
            work_start: data.work_start || '10:00',
            work_end: data.work_end || '20:00'
          });
        }
      })
      .catch(err => console.error('Error fetching config:', err));
  }, []);

  // Sync week start when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    const monday = getStartOfWeek(selectedDate);
    if (!currentWeekStart || currentWeekStart.toDateString() !== monday.toDateString()) {
      setCurrentWeekStart(monday);
    }
  }, [selectedDate]);

  // Real-time timeline position calculation
  useEffect(() => {
    const updatePosition = () => {
      const today = new Date();
      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      const WORK_START = timeToMinutes(config.work_start);
      const WORK_END = timeToMinutes(config.work_end);

      if (currentMinutes >= WORK_START && currentMinutes <= WORK_END) {
        const top = (currentMinutes - WORK_START) * (100 / 60);
        setNowPosition(top);
      } else {
        setNowPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000);
    return () => clearInterval(interval);
  }, [config.work_start, config.work_end]);

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Fetch all clients when modal is opened for autocomplete
  useEffect(() => {
    if (isNewOpen) {
      fetch('/api/admin/clientes')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllClients(data);
          }
        })
        .catch(err => console.error('Error fetching clients for autocomplete:', err));
    }
  }, [isNewOpen]);

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

  // 5. Navigate weeks/days
  const handlePrev = () => {
    if (viewMode === 'day' && selectedDate) {
      const prev = new Date(selectedDate);
      prev.setDate(selectedDate.getDate() - 1);
      setSelectedDate(prev);
    } else if (currentWeekStart) {
      const prev = new Date(currentWeekStart);
      prev.setDate(currentWeekStart.getDate() - 7);
      setCurrentWeekStart(prev);
    }
  };

  const handleNext = () => {
    if (viewMode === 'day' && selectedDate) {
      const next = new Date(selectedDate);
      next.setDate(selectedDate.getDate() + 1);
      setSelectedDate(next);
    } else if (currentWeekStart) {
      const next = new Date(currentWeekStart);
      next.setDate(currentWeekStart.getDate() + 7);
      setCurrentWeekStart(next);
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const newD = new Date(val + 'T00:00:00');
    setSelectedDate(newD);
  };

  const getSelectedDayName = () => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Helper: Get layout styling for appointment block
  const getBlockStyle = (horaInicio, horaFin) => {
    const startMin = timeToMinutes(horaInicio);
    const endMin = timeToMinutes(horaFin);
    const duration = endMin - startMin;

    const WORK_START = timeToMinutes(config.work_start);
    
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

  // Schedule next turno based on client's treatment frequency
  const handleScheduleNextTurn = (turno) => {
    if (!turno || !turno.cliente) return;
    
    const currentFecha = new Date(turno.fecha);
    const freqWeeks = turno.cliente.frecuencia || 4;
    
    const targetDate = new Date(currentFecha);
    targetDate.setDate(targetDate.getDate() + freqWeeks * 7);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    let preselectedZoneIds = [];
    try {
      preselectedZoneIds = JSON.parse(turno.zonas).map(z => z.id).filter(Boolean);
    } catch (e) {
      console.error(e);
    }
    
    setIsDetailsOpen(false);
    setSelectedDate(targetDate);
    
    setNewTurno({
      nombreCompleto: turno.cliente.nombreCompleto || '',
      whatsapp: turno.cliente.whatsapp || '',
      email: turno.cliente.email || '',
      fechaStr: targetDateStr,
      horaInicio: turno.horaInicio,
      horaFin: turno.horaFin,
      selectedZoneIds: preselectedZoneIds,
      valorTotal: turno.valorTotal,
      valorSeña: turno.valorSeña,
      estado: 'SEÑADO',
      observaciones: '',
      clienteId: turno.clienteId
    });
    
    setIsNewOpen(true);
  };

  // Save edited Turno
  const handleSaveEditTurno = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/turnos/${selectedTurno.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaStr: editTurno.fechaStr,
          horaInicio: editTurno.horaInicio,
          horaFin: editTurno.horaFin,
          estado: editTurno.estado,
          valorTotal: Number(editTurno.valorTotal),
          valorSeña: Number(editTurno.valorSeña),
          observaciones: editTurno.observaciones
        })
      });
      if (res.ok) {
        setIsEditing(false);
        setIsDetailsOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error saving edited appointment:', err);
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
      observaciones: '',
      clienteId: null
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
      case 'BLOQUEADO': return styles.badgeBloqueado;
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
      case 'BLOQUEADO': return styles.stateBloqueado;
      default: return '';
    }
  };

  // Generate hourly labels for time column dynamically
  const startHour = parseInt(config.work_start.split(':')[0]) || 10;
  const endHour = parseInt(config.work_end.split(':')[0]) || 20;
  const WORK_START = startHour * 60;
  const totalHalfHours = (endHour - startHour) * 2;
  const dayColumnHeight = (endHour - startHour) * 100;

  const timeLabels = [];
  for (let i = startHour; i <= endHour; i++) {
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Visualizá y gestioná las reservas en bloques de 10 minutos.</p>
        </div>
        <div className={styles.controls} style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
            <button 
              onClick={() => setViewMode('day')} 
              className="btn-toggle"
              style={{
                background: viewMode === 'day' ? 'var(--color-gold)' : 'transparent',
                color: viewMode === 'day' ? '#000' : 'var(--text-primary)',
                border: 'none',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'var(--transition)'
              }}
            >
              Día
            </button>
            <button 
              onClick={() => setViewMode('week')} 
              className="btn-toggle"
              style={{
                background: viewMode === 'week' ? 'var(--color-gold)' : 'transparent',
                color: viewMode === 'week' ? '#000' : 'var(--text-primary)',
                border: 'none',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'var(--transition)'
              }}
            >
              Semana
            </button>
          </div>

          {/* Jump to Date Picker */}
          <input 
            type="date"
            value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
            onChange={handleDateChange}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />

          <button onClick={handlePrev} className={styles.navBtn}><PrevIcon /></button>
          <span className={styles.currentWeek} style={{ minWidth: '150px', textAlign: 'center' }}>
            {viewMode === 'day' ? getSelectedDayName() : getWeekRangeName()}
          </span>
          <button onClick={handleNext} className={styles.navBtn}><NextIcon /></button>
          
          <button onClick={() => {
            setNewTurno({
              nombreCompleto: '',
              whatsapp: '',
              email: '',
              fechaStr: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              horaInicio: config.work_start,
              horaFin: addMinutesToTime(config.work_start, 30),
              selectedZoneIds: [],
              valorTotal: '',
              valorSeña: '',
              estado: 'SEÑADO',
              observaciones: '',
              clienteId: null
            });
            setIsNewOpen(true);
          }} className="btn btn-primary">+ Nuevo Turno</button>
        </div>
      </div>

      {/* Week/Day Calendar Grid */}
      <div className={styles.calendarContainer}>
        {/* Days Header */}
        <div className={styles.gridHeader} style={viewMode === 'day' ? { gridTemplateColumns: '80px 1fr' } : {}}>
          <div className={`${styles.headerCell} ${styles.timeColHeader}`}>Hora</div>
          {viewMode === 'day' ? (
            (() => {
              if (!selectedDate) return null;
              const isToday = new Date().toDateString() === selectedDate.toDateString();
              const dayName = selectedDate.toLocaleDateString('es-ES', { weekday: 'short' });
              return (
                <div className={styles.headerCell}>
                  <span className={styles.dayName}>{dayName}</span>
                  <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>{selectedDate.getDate()}</span>
                </div>
              );
            })()
          ) : (
            weekDates.map((date, index) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
              return (
                <div key={index} className={styles.headerCell}>
                  <span className={styles.dayName}>{dayName}</span>
                  <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>{date.getDate()}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Scrollable Timeline body */}
        <div className={styles.gridBody} style={viewMode === 'day' ? { gridTemplateColumns: '80px 1fr' } : {}}>
          {/* Time Column */}
          <div className={styles.timeColumn}>
            {timeLabels.map((time, idx) => (
              <div key={idx} className={styles.timeLabel}>{time}</div>
            ))}
          </div>

          {/* Days Columns */}
          {viewMode === 'day' ? (
            (() => {
              if (!selectedDate) return null;
              const dateStr = selectedDate.toISOString().split('T')[0];
              const dayAppointments = appointments.filter(app => {
                const appDateStr = new Date(app.fecha).toISOString().split('T')[0];
                return appDateStr === dateStr;
              });

              return (
                <div className={styles.dayColumn} style={{ height: `${dayColumnHeight}px` }}>
                  {/* Background grid lines for hours */}
                  <div className={styles.gridLines}>
                    {timeLabels.map((_, idx) => (
                      <div key={idx} className={styles.gridLineRow}></div>
                    ))}
                  </div>

                  {/* Current Time Indicator Line */}
                  {isToday(selectedDate) && nowPosition !== null && (
                    <div className={styles.currentTimeLine} style={{ top: `${nowPosition}px` }}>
                      <div className={styles.currentTimeLineDot}></div>
                    </div>
                  )}

                  {/* Empty slot clicks handlers */}
                  {Array.from({ length: totalHalfHours }).map((_, idx) => {
                    const startMin = WORK_START + idx * 30;
                    const top = idx * 50; // 30 mins = 50px height
                    return (
                      <div
                        key={idx}
                        className={styles.emptySlotTrigger}
                        style={{ top: `${top}px`, height: '50px' }}
                        onClick={() => handleEmptySlotClick(selectedDate, startMin)}
                      ></div>
                    );
                  })}

                  {/* Appointments blocks absolute positioning */}
                  {dayAppointments.map((app) => {
                    const blockStyle = getBlockStyle(app.horaInicio, app.horaFin);
                    let zonasText = '';
                    try {
                      const zonesArray = JSON.parse(app.zonas);
                      zonasText = zonesArray.map(z => z.nombre).join(', ');
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
                        <span className={styles.appTitle}>{app.cliente?.nombreCompleto || 'Cliente Desconocido'}</span>
                        {app.duracionMinutos > 30 && (
                          <>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zonasText}</span>
                            <span className={styles.appTime}>{app.horaInicio} - {app.horaFin}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            weekDates.map((date, dayIdx) => {
              const dateStr = date.toISOString().split('T')[0];
              const dayAppointments = appointments.filter(app => {
                const appDateStr = new Date(app.fecha).toISOString().split('T')[0];
                return appDateStr === dateStr;
              });

              return (
                <div key={dayIdx} className={styles.dayColumn} style={{ height: `${dayColumnHeight}px` }}>
                  {/* Background grid lines for hours */}
                  <div className={styles.gridLines}>
                    {timeLabels.map((_, idx) => (
                      <div key={idx} className={styles.gridLineRow}></div>
                    ))}
                  </div>

                  {/* Current Time Indicator Line */}
                  {isToday(date) && nowPosition !== null && (
                    <div className={styles.currentTimeLine} style={{ top: `${nowPosition}px` }}>
                      <div className={styles.currentTimeLineDot}></div>
                    </div>
                  )}

                  {/* Empty slot clicks handlers */}
                  {Array.from({ length: totalHalfHours }).map((_, idx) => {
                    const startMin = WORK_START + idx * 30;
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
                    let zonasText = '';
                    try {
                      const zonesArray = JSON.parse(app.zonas);
                      zonasText = zonesArray.map(z => z.nombre).join(', ');
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
                        <span className={styles.appTitle}>{app.cliente?.nombreCompleto || 'Cliente Desconocido'}</span>
                        {app.duracionMinutos > 30 && (
                          <>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zonasText}</span>
                            <span className={styles.appTime}>{app.horaInicio} - {app.horaFin}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: Appointment Details */}
      {isDetailsOpen && selectedTurno && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card premium-border ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>
                {isEditing ? 'Editar / Reprogramar Turno' : 'Detalle del Turno'}
              </h3>
              <button onClick={() => { setIsDetailsOpen(false); setIsEditing(false); }} className={styles.closeBtn}>&times;</button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEditTurno}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
                    <span className={styles.detailLabel}>Cliente</span>
                    <span className={styles.detailValue} style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {selectedTurno.cliente?.nombreCompleto || 'Cliente Desconocido'}
                    </span>
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Fecha del Turno</label>
                    <input
                      type="date"
                      value={editTurno.fechaStr}
                      onChange={(e) => setEditTurno({ ...editTurno, fechaStr: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Estado</label>
                    <select
                      value={editTurno.estado}
                      onChange={(e) => setEditTurno({ ...editTurno, estado: e.target.value })}
                    >
                      <option value="SEÑADO">Señado / Confirmado</option>
                      <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
                      <option value="PENDIENTE_AUTORIZACION">Pendiente de Autorización</option>
                      <option value="REALIZADO">Realizado</option>
                      <option value="CANCELADO">Cancelado</option>
                      <option value="REPROGRAMADO">Reprogramado</option>
                      <option value="NO_ASISTIO">No asistió</option>
                      <option value="BLOQUEADO">🔒 BLOQUEADO (Bloqueo)</option>
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Hora Inicio</label>
                    <input
                      type="time"
                      value={editTurno.horaInicio}
                      onChange={(e) => setEditTurno({ ...editTurno, horaInicio: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Hora Fin</label>
                    <input
                      type="time"
                      value={editTurno.horaFin}
                      onChange={(e) => setEditTurno({ ...editTurno, horaFin: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Valor Total ($)</label>
                    <input
                      type="number"
                      value={editTurno.valorTotal}
                      onChange={(e) => setEditTurno({ ...editTurno, valorTotal: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Seña Recibida ($)</label>
                    <input
                      type="number"
                      value={editTurno.valorSeña}
                      onChange={(e) => setEditTurno({ ...editTurno, valorSeña: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.inputLabel}>Observaciones</label>
                    <textarea
                      value={editTurno.observaciones}
                      onChange={(e) => setEditTurno({ ...editTurno, observaciones: e.target.value })}
                      rows="2"
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                </div>
              </form>
            ) : (
              <>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Cliente</span>
                    <span className={styles.detailValue} style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {selectedTurno.cliente?.nombreCompleto || 'Cliente Desconocido'}
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
                      {(() => {
                        try {
                          return JSON.parse(selectedTurno.zonas).map(z => z.nombre).join(', ') || 'Ninguna (Bloqueo)';
                        } catch(e) {
                          return selectedTurno.zonas || 'Ninguna (Bloqueo)';
                        }
                      })()}
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
                    <span className={styles.detailValue}>{selectedTurno.cliente?.whatsapp || 'N/A'}</span>
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
                    {selectedTurno.clienteId && (
                      <>
                        <button
                          onClick={() => {
                            window.location.href = `/admin/clientes?id=${selectedTurno.clienteId}`;
                          }}
                          className="btn btn-secondary"
                          style={{ flex: '1 0 45%', borderColor: 'var(--color-gold)', color: 'var(--color-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                        >
                          📁 Ver Ficha del Cliente
                        </button>
                        <button
                          onClick={() => handleScheduleNextTurn(selectedTurno)}
                          className="btn btn-secondary"
                          style={{ flex: '1 0 45%', borderColor: '#81c784', color: '#81c784', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                        >
                          📅 Programar Siguiente Turno
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setEditTurno({
                          fechaStr: new Date(selectedTurno.fecha).toISOString().split('T')[0],
                          horaInicio: selectedTurno.horaInicio,
                          horaFin: selectedTurno.horaFin,
                          estado: selectedTurno.estado,
                          valorTotal: selectedTurno.valorTotal,
                          valorSeña: selectedTurno.valorSeña,
                          observaciones: selectedTurno.observaciones || ''
                        });
                        setIsEditing(true);
                      }}
                      className="btn btn-primary"
                      style={{ flex: '1 0 45%', backgroundColor: '#d4a54d', color: '#000' }}
                    >
                      ✏️ Editar / Reprogramar
                    </button>
                    {selectedTurno.estado === 'PENDIENTE_AUTORIZACION' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn btn-primary" style={{ flex: '1 0 45%', backgroundColor: '#2e7d32', color: '#fff' }}>
                        Aprobar y Confirmar
                      </button>
                    )}
                    {selectedTurno.estado !== 'REALIZADO' && selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', borderColor: '#1565c0', color: '#64b5f6' }}>
                        Marcar como Realizado
                      </button>
                    )}
                    {selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'CANCELADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', borderColor: '#c62828', color: '#ff8a8a' }}>
                        Cancelar Turno
                      </button>
                    )}
                    {selectedTurno.estado === 'CANCELADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn btn-secondary" style={{ flex: '1 0 45%' }}>
                        Re-activar Turno
                      </button>
                    )}
                    {selectedTurno.estado !== 'BLOQUEADO' && (
                      <a href={`https://wa.me/${(selectedTurno.cliente?.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: '1 0 45%', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: '#25D366', color: '#25D366' }}>
                        💬 Chatear por WhatsApp
                      </a>
                    )}
                    <button onClick={() => handleDeleteTurno(selectedTurno.id)} className="btn btn-secondary" style={{ flex: '1 0 45%', borderColor: '#c62828', color: '#ff8a8a' }}>
                      🗑️ Eliminar Registro
                    </button>
                  </div>
                </div>
              </>
            )}
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
                <div className={styles.inputGroup} style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className={styles.inputLabel}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    value={newTurno.nombreCompleto}
                    onChange={(e) => {
                      setNewTurno({ ...newTurno, nombreCompleto: e.target.value, clienteId: null });
                      setShowAutocomplete(true);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => {
                      setTimeout(() => setShowAutocomplete(false), 250);
                    }}
                    required
                    placeholder="Ej. Juan Pérez"
                    autoComplete="off"
                  />
                  {showAutocomplete && newTurno.nombreCompleto && allClients.filter(c =>
                    c.nombreCompleto.toLowerCase().includes(newTurno.nombreCompleto.toLowerCase())
                  ).length > 0 && (
                    <ul style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#1d1d1d',
                      border: '1px solid #7a1e1e',
                      borderRadius: '4px',
                      zIndex: 1000,
                      maxHeight: '150px',
                      overflowY: 'auto',
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}>
                      {allClients
                        .filter(c => c.nombreCompleto.toLowerCase().includes(newTurno.nombreCompleto.toLowerCase()))
                        .map(client => (
                          <li
                            key={client.id}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #282a2b',
                              fontSize: '0.9rem',
                              color: '#fff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseDown={() => {
                              let targetDateStr = newTurno.fechaStr;
                              if (client.turnos && client.turnos.length > 0) {
                                const lastTurno = client.turnos[0];
                                const lastDate = new Date(lastTurno.fecha);
                                const freqWeeks = client.frecuencia || 4;
                                lastDate.setDate(lastDate.getDate() + (freqWeeks * 7));
                                targetDateStr = lastDate.toISOString().split('T')[0];
                              }

                              setNewTurno(prev => ({
                                ...prev,
                                nombreCompleto: client.nombreCompleto,
                                whatsapp: client.whatsapp,
                                email: client.email,
                                clienteId: client.id,
                                fechaStr: targetDateStr
                              }));
                              
                              if (targetDateStr) {
                                setSelectedDate(new Date(targetDateStr + 'T00:00:00'));
                              }
                              
                              setShowAutocomplete(false);
                            }}
                          >
                            <span>{client.nombreCompleto}</span>
                            <span style={{ fontSize: '0.75rem', color: '#d4a54d' }}>{client.whatsapp}</span>
                          </li>
                        ))}
                    </ul>
                  )}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', opacity: newTurno.estado === 'BLOQUEADO' ? 0.5 : 1, pointerEvents: newTurno.estado === 'BLOQUEADO' ? 'none' : 'auto' }}>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'BLOQUEADO') {
                        setNewTurno(prev => ({
                          ...prev,
                          estado: val,
                          nombreCompleto: '🔒 BLOQUEO (Horario bloqueado)',
                          whatsapp: '0000000000',
                          email: 'bloqueo@depilacionparahombres.com',
                          valorTotal: '0',
                          valorSeña: '0',
                          selectedZoneIds: []
                        }));
                      } else {
                        setNewTurno(prev => ({
                          ...prev,
                          estado: val,
                          nombreCompleto: prev.nombreCompleto === '🔒 BLOQUEO (Horario bloqueado)' ? '' : prev.nombreCompleto,
                          whatsapp: prev.whatsapp === '0000000000' ? '' : prev.whatsapp,
                          email: prev.email === 'bloqueo@depilacionparahombres.com' ? '' : prev.email,
                          valorTotal: prev.valorTotal === '0' ? '' : prev.valorTotal,
                          valorSeña: prev.valorSeña === '0' ? '' : prev.valorSeña
                        }));
                      }
                    }}
                  >
                    <option value="SEÑADO">Señado / Confirmado</option>
                    <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
                    <option value="PENDIENTE_AUTORIZACION">Pendiente de Autorización</option>
                    <option value="BLOQUEADO">🔒 BLOQUEADO (Bloqueo)</option>
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
                <button type="submit" className="btn btn-primary" disabled={newTurno.estado !== 'BLOQUEADO' && newTurno.selectedZoneIds.length === 0}>Guardar Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
