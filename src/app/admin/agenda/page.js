'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './agenda.module.css';
import { calculateTurnDetails } from '@/lib/calculations.js';

// Timezone-safe date helper
const formatLocalDate = (dateInput) => {
  if (!dateInput) return '';
  const dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-ES', { dateStyle: 'long' });
};

const getWhatsAppLink = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('54')) {
    if (cleaned.length === 10) {
      cleaned = `549${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('9')) {
      cleaned = `54${cleaned}`;
    } else {
      cleaned = `549${cleaned}`;
    }
  } else {
    if (cleaned.length === 12 && !cleaned.startsWith('549')) {
      cleaned = `549${cleaned.slice(2)}`;
    }
  }
  return `https://wa.me/${cleaned}`;
};

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

// Helper: Generate Mon-Sat dates for month calendar (excl. Sunday)
function getMonthGridDates(selectedDate) {
  if (!selectedDate) return [];
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  
  // Start with the 1st of the month
  const firstDay = new Date(year, month, 1);
  
  // Find Monday of that week
  const start = getStartOfWeek(firstDay);
  
  const dates = [];
  const temp = new Date(start);
  
  // 6 weeks * 6 days/week = 36 days.
  for (let i = 0; i < 36; i++) {
    if (temp.getDay() === 0) {
      temp.setDate(temp.getDate() + 1); // skip Sunday
    }
    dates.push(new Date(temp));
    temp.setDate(temp.getDate() + 1);
  }
  return dates;
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

// Helper: Compute visual layout offsets (left and width percentages) for overlapping appointments
function computeOverlaps(apps) {
  if (!apps || apps.length === 0) return {};
  
  // Sort by start time
  const sorted = [...apps].sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
  
  // 1. Group into overlapping clusters
  const groups = [];
  for (const app of sorted) {
    let added = false;
    for (const group of groups) {
      const overlaps = group.some(item => {
        const aStart = timeToMinutes(item.horaInicio);
        const aEnd = timeToMinutes(item.horaFin);
        const bStart = timeToMinutes(app.horaInicio);
        const bEnd = timeToMinutes(app.horaFin);
        return (bStart < aEnd && bEnd > aStart);
      });
      if (overlaps) {
        group.push(app);
        added = true;
        break;
      }
    }
    if (!added) {
      groups.push([app]);
    }
  }
  
  // 2. Assign column index and total column count for each cluster
  const layout = {};
  for (const group of groups) {
    const columns = []; // array of columns, each column is an array of apps
    for (const app of group) {
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const overlapsInCol = columns[colIdx].some(item => {
          const aStart = timeToMinutes(item.horaInicio);
          const aEnd = timeToMinutes(item.horaFin);
          const bStart = timeToMinutes(app.horaInicio);
          const bEnd = timeToMinutes(app.horaFin);
          return (bStart < aEnd && bEnd > aStart);
        });
        if (!overlapsInCol) {
          columns[colIdx].push(app);
          layout[app.id] = { colIdx, totalCols: 0 };
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([app]);
        layout[app.id] = { colIdx: columns.length - 1, totalCols: 0 };
      }
    }
    for (const app of group) {
      layout[app.id].totalCols = columns.length;
    }
  }
  return layout;
}

export default function AgendaPage() {
  const calendarRef = useRef(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [weekDates, setWeekDates] = useState([]);
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day', 'month'
  const [selectedDate, setSelectedDate] = useState(null);
  const [isNextScheduling, setIsNextScheduling] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

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
  const [newTurnoWarning, setNewTurnoWarning] = useState('');
  const [editTurnoWarning, setEditTurnoWarning] = useState('');
  const [editTurno, setEditTurno] = useState({
    fechaStr: '',
    horaInicio: '',
    horaFin: '',
    estado: '',
    valorTotal: '',
    valorSeña: '',
    descuentoTipo: 'NINGUNO',
    descuentoValor: '',
    bonificacion: 0,
    observaciones: ''
  });


  // Form states for manual scheduling
  const [newTurno, setNewTurno] = useState({
    nombreCompleto: '',
    whatsapp: '',
    email: '',
    dni: '',
    fechaStr: '',
    horaInicio: '10:00',
    horaFin: '10:30',
    selectedZoneIds: [],
    valorTotal: '',
    valorSeña: '',
    descuentoTipo: 'NINGUNO',
    descuentoValor: '',
    bonificacion: 0,
    estado: 'PENDIENTE_PAGO', // Manual creations default to PENDIENTE_PAGO now
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

  // Auto-scroll to today's column in weekly view on mobile
  useEffect(() => {
    if (viewMode === 'week' && calendarRef.current && weekDates.length > 0) {
      const today = new Date();
      const todayIdx = weekDates.findIndex(date => date.toDateString() === today.toDateString());
      if (todayIdx !== -1) {
        const scrollAmount = 80 + todayIdx * 120 - 60;
        setTimeout(() => {
          if (calendarRef.current) {
            calendarRef.current.scrollLeft = Math.max(0, scrollAmount);
          }
        }, 100);
      }
    }
  }, [viewMode, weekDates]);

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
    setLoading(true);
    let startStr, endStr;
    
    if (viewMode === 'month' && selectedDate) {
      const monthDates = getMonthGridDates(selectedDate);
      if (monthDates.length === 0) {
        setLoading(false);
        return;
      }
      startStr = monthDates[0].toISOString().split('T')[0];
      endStr = monthDates[monthDates.length - 1].toISOString().split('T')[0];
    } else {
      if (weekDates.length === 0) {
        setLoading(false);
        return;
      }
      startStr = weekDates[0].toISOString().split('T')[0];
      endStr = weekDates[5].toISOString().split('T')[0];
    }

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
  }, [weekDates, viewMode, selectedDate]);

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
    } else if (viewMode === 'month' && selectedDate) {
      const prev = new Date(selectedDate);
      prev.setMonth(selectedDate.getMonth() - 1);
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
    } else if (viewMode === 'month' && selectedDate) {
      const next = new Date(selectedDate);
      next.setMonth(selectedDate.getMonth() + 1);
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
  const getBlockStyle = (horaInicio, horaFin, layout = { colIdx: 0, totalCols: 1 }) => {
    const startMin = timeToMinutes(horaInicio);
    const endMin = timeToMinutes(horaFin);
    const duration = endMin - startMin;

    const WORK_START = timeToMinutes(config.work_start);
    
    const top = Math.max(0, (startMin - WORK_START) * (100 / 60));
    const height = Math.max(20, duration * (100 / 60)); // minimum 20px

    const widthPercent = 100 / layout.totalCols;
    const leftPercent = layout.colIdx * widthPercent;

    return {
      top: `${top}px`,
      height: `${height}px`,
      width: `calc(${widthPercent}% - 6px)`,
      left: `calc(${leftPercent}% + 4px)`
    };
  };

  // Handle Turno quick action: CANCEL, REALIZADO, APPROVE
  const handleUpdateStatus = async (turnoId, newStatus) => {
    try {
      let preserveDeposit = false;
      if (newStatus === 'CANCELADO') {
        const confirmCancel = confirm('¿Confirmas la cancelación del turno?\n\n[Aceptar] = Cancelar aplicando penalización (se pierde la seña si falta <72hs)\n[Cancelar] = Cancelar conservando la seña a favor del cliente');
        if (!confirmCancel) {
          preserveDeposit = true;
        }
      }
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus, preserveDeposit })
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

  // Send digital receipt via Email
  const handleSendReceipt = async (turnoId) => {
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}/enviar-recibo`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Comprobante enviado por correo correctamente.');
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al enviar el comprobante.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de red al enviar el comprobante.', 'error');
    }
  };

  // Schedule next turno based on client's treatment frequency
  const handleScheduleNextTurn = (turno) => {
    if (!turno || !turno.cliente) return;
    setIsNextScheduling(true);
    
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
    
    const fullName = turno.cliente.nombreCompleto || '';
    let nombreVal = fullName;
    let apellidoVal = '';
    const lastSpaceIdx = fullName.lastIndexOf(' ');
    if (lastSpaceIdx !== -1) {
      nombreVal = fullName.substring(0, lastSpaceIdx);
      apellidoVal = fullName.substring(lastSpaceIdx + 1);
    }

    setIsDetailsOpen(false);
    setSelectedDate(targetDate);
    
    setNewTurno({
      nombreCompleto: fullName,
      nombre: nombreVal,
      apellido: apellidoVal,
      whatsapp: turno.cliente.whatsapp || '',
      email: turno.cliente.email || '',
      dni: turno.cliente.dni || '',
      fechaStr: targetDateStr,
      horaInicio: turno.horaInicio,
      horaFin: turno.horaFin,
      selectedZoneIds: preselectedZoneIds,
      valorTotal: turno.valorTotal,
      valorSeña: turno.valorSeña,
      descuentoTipo: 'NINGUNO',
      descuentoValor: '',
      bonificacion: 0,
      estado: 'PENDIENTE_PAGO',
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
          bonificacion: Number(editTurno.bonificacion || 0),
          observaciones: editTurno.observaciones
        })
      });
      if (res.ok) {
        setIsEditing(false);
        setIsDetailsOpen(false);
        showToast('Turno reprogramado con éxito.');
        fetchAppointments();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Error al reprogramar el turno.', 'error');
      }
    } catch (err) {
      console.error('Error saving edited appointment:', err);
      showToast('Error de red al guardar los cambios.', 'error');
    }
  };


  // Open creation modal for a specific day and start hour
  const handleEmptySlotClick = (date, startMin) => {
    setIsNextScheduling(false);
    const startHour = Math.floor(startMin / 60);
    const startMins = startMin % 60;
    const timeStr = `${startHour.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`;
    
    const endMinutes = startMin + 30;
    const endHour = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    setNewTurno({
      nombreCompleto: '',
      nombre: '',
      apellido: '',
      whatsapp: '',
      email: '',
      dni: '',
      fechaStr: date.toISOString().split('T')[0],
      horaInicio: timeStr,
      horaFin: endTimeStr,
      selectedZoneIds: [],
      valorTotal: '',
      valorSeña: '',
      descuentoTipo: 'NINGUNO',
      descuentoValor: '',
      bonificacion: 0,
      estado: 'PENDIENTE_PAGO',
      observaciones: '',
      clienteId: null
    });
    setIsNewOpen(true);
  };

  // Re-calculate pricing/durations when newTurno inputs change
  useEffect(() => {
    if (newTurno.selectedZoneIds.length === 0) {
      const startMin = timeToMinutes(newTurno.horaInicio);
      const endMin = startMin + (newTurno.estado === 'BLOQUEADO' ? 30 : 0);
      const endHour = Math.floor(endMin / 60);
      const endMins = endMin % 60;
      const horaFinStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      setNewTurno(prev => ({
        ...prev,
        horaFin: horaFinStr,
        valorTotal: 0,
        valorSeña: 0,
        autoTotal: 0,
        autoSeña: 0,
        bonificacion: 0
      }));
      return;
    }
    const selected = zones.filter(z => newTurno.selectedZoneIds.includes(z.id));
    
    // Assume regular/new based on form (defaults to new=false for manual scheduler)
    const calcs = calculateTurnDetails(selected, false);
    
    // Calculate horaFin based on start time + calculated duration
    const startMin = timeToMinutes(newTurno.horaInicio);
    const endMin = startMin + calcs.duracionMinutos;
    const endHour = Math.floor(endMin / 60);
    const endMins = endMin % 60;
    const horaFinStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Calculate discount (bonificacion)
    let bonificacion = 0;
    if (newTurno.descuentoTipo === 'PORCENTAJE') {
      bonificacion = calcs.valorTotal * (Number(newTurno.descuentoValor || 0) / 100);
    } else if (newTurno.descuentoTipo === 'PESOS') {
      bonificacion = Number(newTurno.descuentoValor || 0);
    }

    const finalTotal = Math.max(0, calcs.valorTotal - bonificacion);

    setNewTurno(prev => ({
      ...prev,
      horaFin: horaFinStr,
      valorTotal: prev.valorTotal === '' || prev.valorTotal === prev.autoTotal ? finalTotal : prev.valorTotal,
      valorSeña: prev.valorSeña === '' || prev.valorSeña === prev.autoSeña ? calcs.valorSeña : prev.valorSeña,
      autoTotal: finalTotal,
      autoSeña: calcs.valorSeña,
      bonificacion: bonificacion
    }));
  }, [newTurno.selectedZoneIds, newTurno.horaInicio, newTurno.descuentoTipo, newTurno.descuentoValor]);

  // Re-calculate pricing/discount for editTurno
  useEffect(() => {
    if (!isEditing || !selectedTurno) return;
    
    // Calculate base total from zones
    let baseTotal = 0;
    try {
      const parsedZonas = JSON.parse(selectedTurno.zonas);
      baseTotal = parsedZonas.reduce((sum, z) => sum + (z.precio || z.precioBase || 0), 0);
    } catch (e) {
      baseTotal = selectedTurno.valorTotal + (selectedTurno.bonificacion || 0);
    }
    
    let bonificacion = 0;
    if (editTurno.descuentoTipo === 'PORCENTAJE') {
      bonificacion = baseTotal * (Number(editTurno.descuentoValor || 0) / 100);
    } else if (editTurno.descuentoTipo === 'PESOS') {
      bonificacion = Number(editTurno.descuentoValor || 0);
    }
    
    const finalTotal = Math.max(0, baseTotal - bonificacion);
    
    setEditTurno(prev => ({
      ...prev,
      valorTotal: finalTotal,
      bonificacion: bonificacion
    }));
  }, [editTurno.descuentoTipo, editTurno.descuentoValor, isEditing]);

  // Check overlap/availability for newTurno in real-time
  useEffect(() => {
    if (!isNewOpen || !newTurno.fechaStr || !newTurno.horaInicio || !newTurno.horaFin || newTurno.estado === 'BLOQUEADO') {
      setNewTurnoWarning('');
      return;
    }

    const checkNewTurnoOverlap = async () => {
      try {
        const res = await fetch(`/api/admin/turnos?start=${newTurno.fechaStr}&end=${newTurno.fechaStr}`);
        if (!res.ok) return;
        const dayTurnos = await res.json();
        
        const newStart = timeToMinutes(newTurno.horaInicio);
        const newEnd = timeToMinutes(newTurno.horaFin);
        
        // Find if there is any overlapping turno
        const overlap = dayTurnos.find(t => {
          if (t.estado === 'CANCELADO') return false;
          const start = timeToMinutes(t.horaInicio);
          const end = timeToMinutes(t.horaFin);
          return start < newEnd && end > newStart;
        });

        if (overlap) {
          const isBlock = overlap.estado === 'BLOQUEADO';
          setNewTurnoWarning(isBlock 
            ? '⚠️ El horario seleccionado se encuentra bloqueado administrativamente.' 
            : `⚠️ Se solapa con otro turno de ${overlap.cliente?.nombreCompleto || 'otro cliente'} (${overlap.horaInicio} - ${overlap.horaFin}).`
          );
        } else {
          // Check if outside business hours
          const workStartMinutes = timeToMinutes(config.work_start || '10:00');
          const workEndMinutes = timeToMinutes(config.work_end || '20:00');
          if (newStart < workStartMinutes || newEnd > workEndMinutes) {
            setNewTurnoWarning(`⚠️ Fuera del horario de atención configurado (${config.work_start || '10:00'} a ${config.work_end || '20:00'} hs).`);
          } else {
            setNewTurnoWarning('');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const delayDebounce = setTimeout(checkNewTurnoOverlap, 300);
    return () => clearTimeout(delayDebounce);
  }, [newTurno.fechaStr, newTurno.horaInicio, newTurno.horaFin, newTurno.estado, isNewOpen, config.work_start, config.work_end]);

  // Check overlap/availability for editTurno in real-time
  useEffect(() => {
    if (!isEditing || !selectedTurno || !editTurno.fechaStr || !editTurno.horaInicio || !editTurno.horaFin || editTurno.estado === 'BLOQUEADO') {
      setEditTurnoWarning('');
      return;
    }

    const checkEditTurnoOverlap = async () => {
      try {
        const res = await fetch(`/api/admin/turnos?start=${editTurno.fechaStr}&end=${editTurno.fechaStr}`);
        if (!res.ok) return;
        const dayTurnos = await res.json();
        
        const newStart = timeToMinutes(editTurno.horaInicio);
        const newEnd = timeToMinutes(editTurno.horaFin);
        
        // Find if there is any overlapping turno (excluding current edited turno)
        const overlap = dayTurnos.find(t => {
          if (t.id === selectedTurno.id) return false;
          if (t.estado === 'CANCELADO') return false;
          const start = timeToMinutes(t.horaInicio);
          const end = timeToMinutes(t.horaFin);
          return start < newEnd && end > newStart;
        });

        if (overlap) {
          const isBlock = overlap.estado === 'BLOQUEADO';
          setEditTurnoWarning(isBlock 
            ? '⚠️ El horario seleccionado se encuentra bloqueado administrativamente.' 
            : `⚠️ Se solapa con otro turno de ${overlap.cliente?.nombreCompleto || 'otro cliente'} (${overlap.horaInicio} - ${overlap.horaFin}).`
          );
        } else {
          // Check if outside business hours
          const workStartMinutes = timeToMinutes(config.work_start || '10:00');
          const workEndMinutes = timeToMinutes(config.work_end || '20:00');
          if (newStart < workStartMinutes || newEnd > workEndMinutes) {
            setEditTurnoWarning(`⚠️ Fuera del horario de atención configurado (${config.work_start || '10:00'} a ${config.work_end || '20:00'} hs).`);
          } else {
            setEditTurnoWarning('');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const delayDebounce = setTimeout(checkEditTurnoOverlap, 300);
    return () => clearTimeout(delayDebounce);
  }, [editTurno.fechaStr, editTurno.horaInicio, editTurno.horaFin, editTurno.estado, isEditing, selectedTurno, config.work_start, config.work_end]);

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
        showToast('Turno agendado con éxito.');
        fetchAppointments();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Error al agendar el turno.', 'error');
      }
    } catch (err) {
      console.error('Error creating manually:', err);
      showToast('Error de red al crear el turno.', 'error');
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

  const getMonthName = () => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return (
    <div>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Agenda de Turnos</h2>
        </div>
        <div className={styles.controls} style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
            <button 
              onClick={() => { setSelectedDate(new Date()); setViewMode('day'); }} 
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
              onClick={() => { setSelectedDate(new Date()); setViewMode('week'); }} 
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
            <button 
              onClick={() => { setSelectedDate(new Date()); setViewMode('month'); }} 
              className="btn-toggle"
              style={{
                background: viewMode === 'month' ? 'var(--color-gold)' : 'transparent',
                color: viewMode === 'month' ? '#000' : 'var(--text-primary)',
                border: 'none',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'var(--transition)'
              }}
            >
              Mes
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

          <div className={styles.navigationWrapper}>
            <button onClick={handlePrev} className={styles.navBtnSmall}><PrevIcon /></button>
            <span className={styles.currentWeekText}>
              {viewMode === 'day' ? getSelectedDayName() : viewMode === 'month' ? getMonthName() : getWeekRangeName()}
            </span>
            <button onClick={handleNext} className={styles.navBtnSmall}><NextIcon /></button>
          </div>
          
          <button 
            onClick={() => {
              if (selectedDate) {
                const dateStr = selectedDate.toISOString().split('T')[0];
                window.open(`/admin/agenda/imprimir?fecha=${dateStr}`, '_blank');
              }
            }} 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🖨️ Imprimir Día
          </button>

          <button onClick={() => {
            setIsNextScheduling(false);
            setNewTurno({
              nombreCompleto: '',
              nombre: '',
              apellido: '',
              whatsapp: '',
              email: '',
              dni: '',
              fechaStr: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              horaInicio: config.work_start,
              horaFin: addMinutesToTime(config.work_start, 30),
              selectedZoneIds: [],
              valorTotal: '',
              valorSeña: '',
              descuentoTipo: 'NINGUNO',
              descuentoValor: '',
              bonificacion: 0,
              estado: 'PENDIENTE_PAGO',
              observaciones: '',
              clienteId: null
            });
            setIsNewOpen(true);
          }} className="btn btn-primary">+ Nuevo Turno</button>
        </div>
      </div>

      {/* Week/Day Calendar Grid */}
      {/* Week/Day/Month Calendar Grid */}
      <div ref={calendarRef} className={styles.calendarContainer} style={viewMode === 'month' ? { height: 'auto', minHeight: 'auto', overflowX: 'visible' } : {}}>
        {viewMode === 'month' ? (
          <>
            {/* Month Header */}
            <div className={styles.monthGridHeader}>
              <div className={styles.monthHeaderCell}>Lun</div>
              <div className={styles.monthHeaderCell}>Mar</div>
              <div className={styles.monthHeaderCell}>Mié</div>
              <div className={styles.monthHeaderCell}>Jue</div>
              <div className={styles.monthHeaderCell}>Vie</div>
              <div className={styles.monthHeaderCell}>Sáb</div>
            </div>
            
            {/* Month Body Grid */}
            <div className={styles.monthGrid}>
              {getMonthGridDates(selectedDate).map((date, idx) => {
                const dateStr = date.toISOString().split('T')[0];
                const isToday = new Date().toDateString() === date.toDateString();
                const isOutsideMonth = date.getMonth() !== selectedDate.getMonth();
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const cellDate = new Date(date);
                cellDate.setHours(0,0,0,0);
                const isPast = cellDate < today;

                const dayAppointments = appointments.filter(app => {
                  const appDateStr = new Date(app.fecha).toISOString().split('T')[0];
                  return appDateStr === dateStr;
                });
                
                return (
                  <div 
                    key={idx} 
                    className={`${styles.monthDayCell} ${isOutsideMonth ? styles.monthDayOutside : ''} ${isPast ? styles.monthDayPast : ''}`}
                    onClick={() => {
                      setSelectedDate(date);
                      setViewMode('day');
                    }}
                  >
                    <span className={`${styles.monthDayNumber} ${isToday ? styles.monthDayNumberToday : ''}`}>
                      {date.getDate()}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', width: '100%', overflow: 'hidden' }}>
                      {dayAppointments.slice(0, 4).map(app => {
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
                            className={`${styles.monthAppBlock} ${getStatusBlockClass(app.estado)}`}
                            title={`${app.horaInicio} - ${app.cliente?.nombreCompleto || 'Bloqueo'}: ${zonasText}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTurno(app);
                              setIsDetailsOpen(true);
                            }}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer',
                              fontWeight: 600,
                              lineHeight: '1.2'
                            }}
                          >
                            {app.horaInicio} {app.cliente?.nombreCompleto || 'Bloqueo'}
                          </div>
                        );
                      })}
                      {dayAppointments.length > 4 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-gold)', textAlign: 'center', fontWeight: 'bold' }}>
                          + {dayAppointments.length - 4} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Days Header */}
            <div className={styles.gridHeader} style={viewMode === 'day' ? { gridTemplateColumns: '80px 1fr', minWidth: 'auto' } : { minWidth: '800px' }}>
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
            <div className={styles.gridBody} style={viewMode === 'day' ? { gridTemplateColumns: '80px 1fr', minWidth: 'auto' } : { minWidth: '800px' }}>
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
                      {(() => {
                        const layoutMap = computeOverlaps(dayAppointments);
                        return dayAppointments.map((app) => {
                          const blockLayout = layoutMap[app.id] || { colIdx: 0, totalCols: 1 };
                          const blockStyle = getBlockStyle(app.horaInicio, app.horaFin, blockLayout);
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
                      });
                    })()}
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
                      {(() => {
                        const layoutMap = computeOverlaps(dayAppointments);
                        return dayAppointments.map((app) => {
                          const blockLayout = layoutMap[app.id] || { colIdx: 0, totalCols: 1 };
                          const blockStyle = getBlockStyle(app.horaInicio, app.horaFin, blockLayout);
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
                      });
                    })()}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
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
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const oldStart = editTurno.horaInicio;
                        const oldEnd = editTurno.horaFin;
                        let duration = timeToMinutes(oldEnd) - timeToMinutes(oldStart);
                        if (isNaN(duration) || duration <= 0) {
                          duration = 30; // fallback
                        }
                        const newEnd = addMinutesToTime(newStart, duration);
                        setEditTurno({
                          ...editTurno,
                          horaInicio: newStart,
                          horaFin: newEnd
                        });
                      }}
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

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Tipo de Descuento</label>
                    <select
                      value={editTurno.descuentoTipo}
                      onChange={(e) => setEditTurno({ ...editTurno, descuentoTipo: e.target.value })}
                    >
                      <option value="NINGUNO">Sin Descuento</option>
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="PESOS">Monto Fijo ($)</option>
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Valor Descuento</label>
                    <input
                      type="number"
                      value={editTurno.descuentoValor}
                      onChange={(e) => setEditTurno({ ...editTurno, descuentoValor: e.target.value })}
                      placeholder="Ej. 10 o 500"
                      disabled={editTurno.descuentoTipo === 'NINGUNO'}
                    />
                  </div>

                  {/* Resumen de Descuento y Saldo a Pagar */}
                  {editTurno.estado !== 'BLOQUEADO' && (
                    <div className={styles.inputGroup} style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Base (Zonas):</span>
                        <span style={{ fontWeight: '600' }}>
                          ${(() => {
                            let baseTotal = 0;
                            try {
                              const parsedZonas = JSON.parse(selectedTurno.zonas);
                              baseTotal = parsedZonas.reduce((sum, z) => sum + (z.precio || z.precioBase || 0), 0);
                            } catch (e) {
                              baseTotal = (Number(editTurno.valorTotal) || 0) + (Number(editTurno.bonificacion) || 0);
                            }
                            return baseTotal.toLocaleString('es-ES');
                          })()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Descuento Aplicado:</span>
                        <span style={{ color: '#d32f2f', fontWeight: '600' }}>-${(editTurno.bonificacion || 0).toLocaleString('es-ES')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontWeight: '700' }}>Monto Final de Venta:</span>
                        <span style={{ fontWeight: '800', color: 'var(--color-gold)' }}>${Number(editTurno.valorTotal || 0).toLocaleString('es-ES')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: '700' }}>Saldo a Pagar en Local:</span>
                        <span style={{ fontWeight: '800', color: '#2e7d32' }}>${Math.max(0, Number(editTurno.valorTotal || 0) - Number(editTurno.valorSeña || 0)).toLocaleString('es-ES')}</span>
                      </div>
                    </div>
                  )}

                  <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.inputLabel}>Observaciones</label>
                    <textarea
                      value={editTurno.observaciones}
                      onChange={(e) => setEditTurno({ ...editTurno, observaciones: e.target.value })}
                      rows="2"
                    />
                  </div>
                </div>

                {editTurnoWarning && (
                  <div style={{ color: '#ffb74d', backgroundColor: 'rgba(255, 183, 77, 0.1)', border: '1px solid #ffb74d', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', marginTop: '1rem', textAlign: 'center', width: '100%' }}>
                    {editTurnoWarning}
                  </div>
                )}

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
                    <span className={styles.detailValue}>{formatLocalDate(selectedTurno.fecha)}</span>
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
                            window.location.href = `/admin/clientes?id=${selectedTurno.clienteId}&from=agenda`;
                          }}
                          className="btn btn-secondary"
                          style={{ flex: '1 0 45%', backgroundColor: '#7a1e1e', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                        >
                          📁 Ver Ficha del Cliente
                        </button>
                        <button
                          onClick={() => handleScheduleNextTurn(selectedTurno)}
                          className="btn btn-secondary"
                          style={{ flex: '1 0 45%', backgroundColor: '#2e7d32', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
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
                      style={{ flex: '1 0 45%', backgroundColor: '#d4a54d', color: '#000', border: 'none' }}
                    >
                      ✏️ Editar / Reprogramar
                    </button>
                    {selectedTurno.estado === 'PENDIENTE_AUTORIZACION' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn btn-primary" style={{ flex: '1 0 45%', backgroundColor: '#2e7d32', color: '#fff', border: 'none' }}>
                        Aprobar y Confirmar
                      </button>
                    )}
                    {selectedTurno.estado !== 'REALIZADO' && selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', backgroundColor: '#1565c0', color: '#fff', border: 'none' }}>
                        Marcar como Realizado
                      </button>
                    )}
                    {selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'CANCELADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', backgroundColor: '#c62828', color: '#fff', border: 'none' }}>
                        Cancelar Turno
                      </button>
                    )}
                    {selectedTurno.estado !== 'NO_ASISTIO' && selectedTurno.estado !== 'REALIZADO' && selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'NO_ASISTIO')} className="btn btn-secondary" style={{ flex: '1 0 45%', backgroundColor: '#ef6c00', color: '#fff', border: 'none' }}>
                        ❌ No Asistió
                      </button>
                    )}
                    {(selectedTurno.estado === 'CANCELADO' || selectedTurno.estado === 'NO_ASISTIO') && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn btn-secondary" style={{ flex: '1 0 45%', backgroundColor: '#2e7d32', color: '#fff', border: 'none' }}>
                        Re-activar Turno
                      </button>
                    )}
                    {selectedTurno.estado !== 'BLOQUEADO' && (
                      <a href={getWhatsAppLink(selectedTurno.cliente?.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: '1 0 45%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: '#25D366', color: '#fff', border: 'none' }}>
                        💬 Chatear por WhatsApp
                      </a>
                    )}
                    {selectedTurno.estado !== 'BLOQUEADO' && selectedTurno.cliente?.email && (
                      <button
                        onClick={() => handleSendReceipt(selectedTurno.id)}
                        className="btn btn-secondary"
                        style={{ flex: '1 0 45%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: '#d4a54d', color: '#000', border: 'none' }}
                      >
                        🧾 Enviar Recibo por Mail
                      </button>
                    )}
                    <button onClick={() => handleDeleteTurno(selectedTurno.id)} className="btn btn-secondary" style={{ flex: '1 0 45%', backgroundColor: '#c62828', color: '#fff', border: 'none' }}>
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
                <div className={styles.inputGroup} style={{ position: 'relative' }}>
                  <label className={styles.inputLabel}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    value={newTurno.nombre || ''}
                    onChange={(e) => {
                      const n = e.target.value;
                      setNewTurno(prev => ({
                        ...prev,
                        nombre: n,
                        nombreCompleto: `${n} ${prev.apellido || ''}`.trim(),
                        clienteId: null
                      }));
                      setShowAutocomplete(true);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => {
                      setTimeout(() => setShowAutocomplete(false), 250);
                    }}
                    required
                    placeholder="Ej. Juan"
                    autoComplete="off"
                  />
                  {showAutocomplete && newTurno.nombre && allClients.filter(c =>
                    c.nombreCompleto.toLowerCase().includes(newTurno.nombre.toLowerCase())
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
                        .filter(c => c.nombreCompleto.toLowerCase().includes(newTurno.nombre.toLowerCase()))
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
                              if (isNextScheduling && client.turnos && client.turnos.length > 0) {
                                const lastTurno = client.turnos[0];
                                const lastDate = new Date(lastTurno.fecha);
                                const freqWeeks = client.frecuencia || 4;
                                lastDate.setDate(lastDate.getDate() + (freqWeeks * 7));
                                targetDateStr = lastDate.toISOString().split('T')[0];
                              }

                              const fullName = client.nombreCompleto || '';
                              let nombreVal = fullName;
                              let apellidoVal = '';
                              const lastSpaceIdx = fullName.lastIndexOf(' ');
                              if (lastSpaceIdx !== -1) {
                                nombreVal = fullName.substring(0, lastSpaceIdx);
                                apellidoVal = fullName.substring(lastSpaceIdx + 1);
                              }

                              setNewTurno(prev => ({
                                ...prev,
                                nombreCompleto: fullName,
                                nombre: nombreVal,
                                apellido: apellidoVal,
                                whatsapp: client.whatsapp,
                                email: client.email,
                                dni: client.dni || '',
                                clienteId: client.id,
                                fechaStr: targetDateStr
                              }));
                              
                              if (isNextScheduling && targetDateStr) {
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
                  <label className={styles.inputLabel}>Apellido del Cliente *</label>
                  <input
                    type="text"
                    value={newTurno.apellido || ''}
                    onChange={(e) => {
                      const a = e.target.value;
                      setNewTurno(prev => ({
                        ...prev,
                        apellido: a,
                        nombreCompleto: `${prev.nombre || ''} ${a}`.trim(),
                        clienteId: null
                      }));
                    }}
                    required
                    placeholder="Ej. Pérez"
                    autoComplete="off"
                  />
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.inputLabel}>DNI del Cliente *</label>
                  <input
                    type="text"
                    value={newTurno.dni}
                    onChange={(e) => setNewTurno({ ...newTurno, dni: e.target.value })}
                    placeholder="Ej. 12345678"
                    required
                  />
                </div>
                 <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>WhatsApp *</label>
                  <div className={styles.phoneInputContainer}>
                    <div className={styles.phonePrefix}>
                      <span className={styles.flagIcon}>🇦🇷</span>
                      <span>+54</span>
                    </div>
                    <input
                      type="tel"
                      value={newTurno.whatsapp}
                      onChange={(e) => setNewTurno({ ...newTurno, whatsapp: e.target.value })}
                      required
                      placeholder="Ej. 911223344"
                      style={{ border: 'none', borderRadius: 0, flex: 1, padding: '0.75rem', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                    />
                  </div>
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
                  <label className={styles.inputLabel}>Tipo de Descuento</label>
                  <select
                    value={newTurno.descuentoTipo}
                    onChange={(e) => setNewTurno({ ...newTurno, descuentoTipo: e.target.value })}
                  >
                    <option value="NINGUNO">Sin Descuento</option>
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="PESOS">Monto Fijo ($)</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Valor Descuento</label>
                  <input
                    type="number"
                    value={newTurno.descuentoValor}
                    onChange={(e) => setNewTurno({ ...newTurno, descuentoValor: e.target.value })}
                    placeholder="Ej. 10 o 500"
                    disabled={newTurno.descuentoTipo === 'NINGUNO'}
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

                {/* Resumen de Descuento y Saldo a Pagar */}
                {newTurno.estado !== 'BLOQUEADO' && (
                  <div className={styles.inputGroup} style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Base (Zonas):</span>
                      <span style={{ fontWeight: '600' }}>${((newTurno.autoTotal || 0) + (newTurno.bonificacion || 0)).toLocaleString('es-ES')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Descuento Aplicado:</span>
                      <span style={{ color: '#d32f2f', fontWeight: '600' }}>-${(newTurno.bonificacion || 0).toLocaleString('es-ES')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontWeight: '700' }}>Monto Final de Venta:</span>
                      <span style={{ fontWeight: '800', color: 'var(--color-gold)' }}>${Number(newTurno.valorTotal || 0).toLocaleString('es-ES')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '700' }}>Saldo a Pagar en Local:</span>
                      <span style={{ fontWeight: '800', color: '#2e7d32' }}>${Math.max(0, Number(newTurno.valorTotal || 0) - Number(newTurno.valorSeña || 0)).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                )}

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

              {newTurnoWarning && (
                <div style={{ color: '#ffb74d', backgroundColor: 'rgba(255, 183, 77, 0.1)', border: '1px solid #ffb74d', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', width: '100%' }}>
                  {newTurnoWarning}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsNewOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={newTurno.estado !== 'BLOQUEADO' && newTurno.selectedZoneIds.length === 0}>Guardar Turno</button>
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
