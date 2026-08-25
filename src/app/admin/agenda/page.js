'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './agenda.module.css';
import { calculateTurnDetails } from '@/lib/calculations.js';
import PhoneInput from '@/components/PhoneInput.js';
import { formatDisplayPhone, parsePhoneCountryAndNumber, buildFullPhone } from '@/lib/countryCodes.js';

// Timezone-safe YYYY-MM-DD formatter (avoids UTC offset shifts)
const toYYYYMMDD = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0];
  }
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Timezone-safe YYYY-MM-DD parser (avoids UTC offset shifts)
const parseYYYYMMDD = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const cleanStr = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
  if (!cleanStr) return new Date(dateStr);
  const [year, month, day] = cleanStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getAppDateStr = (fechaInput) => {
  if (!fechaInput) return '';
  if (typeof fechaInput === 'string') {
    return fechaInput.split('T')[0];
  }
  return toYYYYMMDD(fechaInput);
};

const formatLocalDate = (dateInput) => {
  if (!dateInput) return '';
  const d = parseYYYYMMDD(dateInput);
  return d.toLocaleDateString('es-ES', { dateStyle: 'long' });
};

const stripPhonePrefix = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('549') && cleaned.length > 3) {
    return cleaned.slice(3);
  }
  if (cleaned.startsWith('54') && cleaned.length > 2) {
    return cleaned.slice(2);
  }
  return cleaned;
};

const getWhatsAppLink = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
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
  const [showCancelled, setShowCancelled] = useState(false);

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
    autoTotal: 0,
    autoTotalZonas: 0,
    observaciones: '',
    hasOtros: false,
    otrosTexto: '',
    otrosPrecio: ''
  });


  // Form states for manual scheduling
  const [newTurno, setNewTurno] = useState({
    nombreCompleto: '',
    whatsapp: '',
    whatsappCountry: '54',
    whatsappCustomCode: '',
    email: '',
    dni: '',
    fechaStr: '',
    horaInicio: '10:00',
    horaFin: '10:30',
    autoHoraFin: '10:30',
    selectedZoneIds: [],
    valorTotal: '',
    valorSeña: '',
    descuentoTipo: 'NINGUNO',
    descuentoValor: '',
    bonificacion: 0,
    autoTotal: 0,
    autoTotalZonas: 0,
    estado: 'PENDIENTE_PAGO', // Manual creations default to PENDIENTE_PAGO now
    observaciones: '',
    clienteId: null,
    hasOtros: false,
    otrosTexto: '',
    otrosPrecio: ''
  });
  const [tempClientObservaciones, setTempClientObservaciones] = useState('');
  const [tempClientNotasGonzalo, setTempClientNotasGonzalo] = useState('');
  const [sendingReceipt, setSendingReceipt] = useState({});
  const [tempClientFrecuencia, setTempClientFrecuencia] = useState(4);
  const [cancelModalTurno, setCancelModalTurno] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [resendEmailModalTurno, setResendEmailModalTurno] = useState(null);
  const [resendEmailAddress, setResendEmailAddress] = useState('');
  const [resendEmailType, setResendEmailType] = useState('RECORDATORIO');
  const [sendingEmailNotice, setSendingEmailNotice] = useState(false);

  // WhatsApp Resend Modal State
  const [resendWppModalTurno, setResendWppModalTurno] = useState(null);
  const [resendWppPhone, setResendWppPhone] = useState('');
  const [resendWppType, setResendWppType] = useState('RECORDATORIO_48H');
  const [sendingWppNotice, setSendingWppNotice] = useState(false);
  const [wppConnectionStatus, setWppConnectionStatus] = useState('UNKNOWN');

  const savedScrollRef = useRef(0);
  const gridBodyRef = useRef(null);

  // Restore scroll position when closing details modal or mounting from client profile
  useEffect(() => {
    if (isDetailsOpen) {
      if (gridBodyRef.current) {
        savedScrollRef.current = gridBodyRef.current.scrollTop;
      }
    }
  }, [isDetailsOpen]);

  useEffect(() => {
    if (appointments && appointments.length > 0) {
      const scrollPos = sessionStorage.getItem('agenda_scroll_pos');
      if (scrollPos && gridBodyRef.current) {
        gridBodyRef.current.scrollTop = parseInt(scrollPos, 10);
        sessionStorage.removeItem('agenda_scroll_pos');
      }
    }
  }, [loading, appointments]);

  // Helper to robustly extract selected zone IDs and custom "otros" info from any format of turno.zonas
  const extractZoneSelection = (zonasInput, zonesCatalog = []) => {
    let preselectedZoneIds = [];
    let hasOtros = false;
    let otrosTexto = '';
    let otrosPrecio = 0;

    if (!zonasInput) {
      return { preselectedZoneIds: [], hasOtros: false, otrosTexto: '', otrosPrecio: 0 };
    }

    let parsedZones = [];
    try {
      if (typeof zonasInput === 'string') {
        const trimmed = zonasInput.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          const raw = JSON.parse(trimmed);
          parsedZones = Array.isArray(raw) ? raw : [raw];
        } else {
          parsedZones = trimmed.split(',').map(s => ({ nombre: s.trim() }));
        }
      } else if (Array.isArray(zonasInput)) {
        parsedZones = zonasInput;
      }
    } catch (e) {
      if (typeof zonasInput === 'string') {
        parsedZones = zonasInput.split(',').map(s => ({ nombre: s.trim() }));
      } else {
        parsedZones = [];
      }
    }

    const matchedZoneIds = new Set();

    for (const pz of parsedZones) {
      if (!pz) continue;
      const zId = pz.id;
      const zName = typeof pz === 'string' ? pz : (pz.nombre || pz.name || '');

      if (zId === 'otros' || pz.isOtros || (zName && zName.toLowerCase().startsWith('otros:'))) {
        hasOtros = true;
        otrosTexto = zName ? zName.replace(/^Otros:\s*/i, '') : '';
        otrosPrecio = Number(pz.precio || 0);
        continue;
      }

      // Try matching by ID first, then by exact name (case-insensitive)
      const matched = (zonesCatalog || []).find(z => 
        (zId && String(z.id) === String(zId)) || 
        (zName && z.nombre && z.nombre.trim().toLowerCase() === zName.trim().toLowerCase())
      );

      if (matched && !matchedZoneIds.has(matched.id)) {
        matchedZoneIds.add(matched.id);
      } else if (zId && zId !== 'otros') {
        matchedZoneIds.add(zId);
      }
    }

    // Fallback: match by substring across full text if no objects matched yet
    if (matchedZoneIds.size === 0 && zonesCatalog && zonesCatalog.length > 0) {
      const fullText = (typeof zonasInput === 'string' ? zonasInput : JSON.stringify(zonasInput || '')).toLowerCase();
      for (const z of zonesCatalog) {
        if (z.nombre && fullText.includes(z.nombre.toLowerCase().trim())) {
          matchedZoneIds.add(z.id);
        }
      }
    }

    preselectedZoneIds = Array.from(matchedZoneIds);
    return { preselectedZoneIds, hasOtros, otrosTexto, otrosPrecio };
  };

  // Helper to recalculate updated prices based on current zone list
  const getUpdatedTurnoPrices = (turno) => {
    if (!turno) return { valorOriginal: 0, valorTotal: 0, bonificacion: 0, hasPriceUpdate: false, oldValorTotal: 0 };
    
    const storedBase = Number(turno.valorTotal || 0) + Number(turno.bonificacion || 0);

    // If historical (REALIZADO, CANCELADO, NO_ASISTIO), preserve exact historical database record
    const isHistorical = turno.estado === 'REALIZADO' || turno.estado === 'CANCELADO' || turno.estado === 'NO_ASISTIO';
    if (isHistorical) {
      return {
        valorOriginal: storedBase,
        valorTotal: Number(turno.valorTotal || 0),
        bonificacion: Number(turno.bonificacion || 0),
        hasPriceUpdate: false,
        oldValorTotal: Number(turno.valorTotal || 0)
      };
    }

    if (!zones || zones.length === 0) {
      return {
        valorOriginal: storedBase,
        valorTotal: Number(turno.valorTotal || 0),
        bonificacion: Number(turno.bonificacion || 0),
        hasPriceUpdate: false,
        oldValorTotal: Number(turno.valorTotal || 0)
      };
    }

    let parsedZones = [];
    try {
      if (typeof turno.zonas === 'string') {
        const trimmed = turno.zonas.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          const raw = JSON.parse(trimmed);
          parsedZones = Array.isArray(raw) ? raw : [raw];
        } else {
          parsedZones = trimmed.split(',').map(s => ({ nombre: s.trim() }));
        }
      } else if (Array.isArray(turno.zonas)) {
        parsedZones = turno.zonas;
      }
    } catch {
      if (typeof turno.zonas === 'string') {
        parsedZones = turno.zonas.split(',').map(s => ({ nombre: s.trim() }));
      } else {
        parsedZones = [];
      }
    }

    const matchedZoneObjs = [];
    const matchedZoneIds = new Set();

    for (const pz of parsedZones) {
      if (!pz) continue;
      const zId = pz.id;
      const zName = typeof pz === 'string' ? pz : (pz.nombre || pz.name || '');

      if (zId === 'otros' || (zName && zName.toLowerCase().startsWith('otros:'))) {
        continue;
      }

      const matched = zones.find(z => 
        (zId && String(z.id) === String(zId)) || 
        (zName && z.nombre && z.nombre.trim().toLowerCase() === zName.trim().toLowerCase())
      );

      if (matched && !matchedZoneIds.has(matched.id)) {
        matchedZoneIds.add(matched.id);
        matchedZoneObjs.push(matched);
      }
    }

    // Fallback: match by substring across full text if no objects matched
    if (matchedZoneObjs.length === 0) {
      const fullText = (typeof turno.zonas === 'string' ? turno.zonas : JSON.stringify(turno.zonas || '')).toLowerCase();
      for (const z of zones) {
        if (z.nombre && fullText.includes(z.nombre.toLowerCase().trim())) {
          if (!matchedZoneIds.has(z.id)) {
            matchedZoneIds.add(z.id);
            matchedZoneObjs.push(z);
          }
        }
      }
    }

    let otrosPrice = 0;
    try {
      const parsed = typeof turno.zonas === 'string' ? JSON.parse(turno.zonas) : turno.zonas;
      if (Array.isArray(parsed)) {
        const o = parsed.find(z => z.id === 'otros' || (z.nombre && z.nombre.startsWith('Otros:')));
        if (o) {
          otrosPrice = Number(o.precio || 0);
        }
      }
    } catch (e) {}

    let currentBaseTotal = 0;
    if (matchedZoneObjs.length > 0) {
      const calcs = calculateTurnDetails(matchedZoneObjs, false);
      currentBaseTotal = calcs.valorTotal + otrosPrice;
    } else {
      currentBaseTotal = storedBase;
    }

    let valorTotal = currentBaseTotal;
    let bonificacion = 0;

    const hasDiscount = turno.descuentoTipo && turno.descuentoTipo !== 'NINGUNO' && turno.descuentoTipo !== 'SIN_DESCUENTO';

    if (hasDiscount) {
      if (turno.descuentoTipo === 'PORCENTAJE' && Number(turno.descuentoValor) > 0) {
        const rawDiscounted = currentBaseTotal * (1 - Number(turno.descuentoValor) / 100);
        valorTotal = Math.max(0, Math.round(rawDiscounted / 1000) * 1000);
        bonificacion = Math.max(0, currentBaseTotal - valorTotal);
      } else if (turno.descuentoTipo === 'PESOS' && Number(turno.descuentoValor) > 0) {
        bonificacion = Math.min(currentBaseTotal, Number(turno.descuentoValor));
        valorTotal = Math.max(0, currentBaseTotal - bonificacion);
      } else if (turno.bonificacion > 0) {
        if (storedBase > 0) {
          const impliedPct = Math.round((Number(turno.bonificacion) / storedBase) * 100);
          if (impliedPct > 0 && impliedPct < 100) {
            const rawDiscounted = currentBaseTotal * (1 - impliedPct / 100);
            valorTotal = Math.max(0, Math.round(rawDiscounted / 1000) * 1000);
            bonificacion = Math.max(0, currentBaseTotal - valorTotal);
          } else {
            bonificacion = Math.min(currentBaseTotal, Number(turno.bonificacion));
            valorTotal = Math.max(0, currentBaseTotal - bonificacion);
          }
        }
      }
    } else {
      // Without discount: use updated current catalog price
      valorTotal = currentBaseTotal;
      bonificacion = 0;
    }

    const hasPriceUpdate = currentBaseTotal !== storedBase || valorTotal !== Number(turno.valorTotal || 0);

    return {
      valorOriginal: currentBaseTotal,
      valorTotal,
      bonificacion,
      hasPriceUpdate,
      oldValorTotal: Number(turno.valorTotal || 0)
    };
  };

  useEffect(() => {
    if (selectedTurno) {
      if (selectedTurno.cliente) {
        setTempClientObservaciones(selectedTurno.cliente.observaciones || '');
        setTempClientFrecuencia(selectedTurno.cliente.frecuencia || 4);
        setTempClientNotasGonzalo(selectedTurno.cliente.notasGonzalo || '');
      } else {
        setTempClientObservaciones('');
        setTempClientFrecuencia(4);
        setTempClientNotasGonzalo('');
      }
    } else {
      setTempClientObservaciones('');
      setTempClientFrecuencia(4);
      setTempClientNotasGonzalo('');
    }
  }, [selectedTurno]);

  const handleSaveClientObservaciones = async (silent = false) => {
    if (!selectedTurno || !selectedTurno.cliente) return;
    try {
      const res = await fetch(`/api/admin/clientes/${selectedTurno.cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observaciones: tempClientObservaciones,
          frecuencia: tempClientFrecuencia,
          notasGonzalo: tempClientNotasGonzalo
        })
      });
      if (res.ok) {
        if (!silent) showToast('Observaciones del cliente guardadas.');
        setSelectedTurno(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            cliente: {
              ...prev.cliente,
              observaciones: tempClientObservaciones,
              frecuencia: tempClientFrecuencia,
              notasGonzalo: tempClientNotasGonzalo
            }
          };
        });
        fetchAppointments();
      } else {
        const err = await res.json();
        if (!silent) showToast(err.error || 'Error al guardar datos del cliente.', 'error');
      }
    } catch (e) {
      console.error('Error saving client observations/frecuencia:', e);
      if (!silent) showToast('Error de red al guardar datos.', 'error');
    }
  };
  // Generate hourly labels for time column dynamically
  let minAppStartHour = parseInt((config.work_start || '10:00').split(':')[0]) || 10;
  let maxAppEndHour = parseInt((config.work_end || '20:00').split(':')[0]) || 20;

  if (appointments && appointments.length > 0) {
    appointments.forEach(app => {
      if (app.horaInicio) {
        const [h] = app.horaInicio.split(':').map(Number);
        if (h < minAppStartHour) minAppStartHour = h;
      }
      if (app.horaFin) {
        const [h, m] = app.horaFin.split(':').map(Number);
        const endH = m > 0 ? h + 1 : h;
        if (endH > maxAppEndHour) maxAppEndHour = endH;
      }
    });
  }

  const startHour = minAppStartHour;
  const endHour = maxAppEndHour;
  const WORK_START = startHour * 60;
  const totalHalfHours = (endHour - startHour) * 2;
  const dayColumnHeight = (endHour - startHour) * 100;

  const timeLabels = [];
  for (let i = startHour; i <= endHour; i++) {
    timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
  }

  // 1. Initialize dates and configurations on mount
  useEffect(() => {
    let initialDate = new Date();
    let initialView = 'week';

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const dateParam = searchParams.get('date');
      const viewParam = searchParams.get('view');
      
      if (dateParam) {
        const parsedDate = parseYYYYMMDD(dateParam);
        const now = new Date();
        if (!isNaN(parsedDate.getTime())) {
          const diffDays = (now.getTime() - parsedDate.getTime()) / (1000 * 3600 * 24);
          // Only use dateParam if it is not a stale past date (older than 7 days in the past)
          if (diffDays <= 7) {
            initialDate = parsedDate;
          }
        }
        // Clean URL so subsequent page reloads, browser tab restores, or bookmarked URLs don't lock onto the old date
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) {}
      }
      
      if (viewParam && ['week', 'day', 'month'].includes(viewParam)) {
        initialView = viewParam;
      } else if (window.innerWidth < 768) {
        initialView = 'day';
      }
    }

    const monday = getStartOfWeek(initialDate);
    setCurrentWeekStart(monday);
    setSelectedDate(initialDate);
    setViewMode(initialView);

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
      const gridStartMins = startHour * 60;
      const gridEndMins = endHour * 60;

      if (currentMinutes >= gridStartMins && currentMinutes <= gridEndMins) {
        const top = (currentMinutes - gridStartMins) * (100 / 60);
        setNowPosition(top);
      } else {
        setNowPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000);
    return () => clearInterval(interval);
  }, [startHour, endHour]);

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

  // 3. Fetch appointments robustly (calculates date boundaries directly to avoid initial render race conditions)
  const fetchAppointments = useCallback(() => {
    const baseDate = selectedDate || new Date();
    setLoading(true);
    let startStr, endStr;
    
    if (viewMode === 'month') {
      const monthDates = getMonthGridDates(baseDate);
      if (monthDates.length > 0) {
        startStr = toYYYYMMDD(monthDates[0]);
        endStr = toYYYYMMDD(monthDates[monthDates.length - 1]);
      } else {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        startStr = toYYYYMMDD(new Date(year, month, 1));
        endStr = toYYYYMMDD(new Date(year, month + 1, 0));
      }
    } else if (viewMode === 'day') {
      startStr = toYYYYMMDD(baseDate);
      endStr = toYYYYMMDD(baseDate);
    } else {
      // 'week' view
      const monday = currentWeekStart || getStartOfWeek(baseDate);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      startStr = toYYYYMMDD(monday);
      endStr = toYYYYMMDD(saturday);
    }

    if (!startStr || !endStr) {
      setLoading(false);
      return;
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
  }, [viewMode, selectedDate, currentWeekStart]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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
      setSelectedDate(prev);
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
      setSelectedDate(next);
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

    const gridStartMin = startHour * 60;
    
    const top = Math.max(0, (startMin - gridStartMin) * (100 / 60));
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

  // Dedicated cancellation execution
  const executeCancelTurno = async (turnoId, preserveDeposit) => {
    try {
      setIsCanceling(true);
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: 'CANCELADO', 
          preserveDeposit 
        })
      });
      if (res.ok) {
        setCancelModalTurno(null);
        setIsDetailsOpen(false);
        fetchAppointments();
        if (preserveDeposit) {
          showToast('Turno cancelado. Seña conservada a favor del cliente.');
        } else {
          showToast('Turno cancelado. Seña retenida según políticas.');
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al cancelar turno.', 'error');
      }
    } catch (e) {
      console.error('Error canceling turno:', e);
      showToast('Error de red al cancelar turno.', 'error');
    } finally {
      setIsCanceling(false);
    }
  };

  // Handle Turno quick action: CANCEL, REALIZADO, APPROVE, MANTENIMIENTO, VA_A_AVISAR, NO_ASISTIO
  const handleUpdateStatus = async (turnoId, newStatus, actionType = null) => {
    try {
      let preserveDeposit = false;
      let markClientFinalizado = false;
      let markClientVaAAvisar = false;

      if (newStatus === 'CANCELADO') {
        if (selectedTurno) {
          setCancelModalTurno(selectedTurno);
        }
        return;
      }
      
      if (actionType === 'FINALIZADO' || actionType === 'MANTENIMIENTO') {
        const isFin = actionType === 'FINALIZADO';
        const confirmFin = confirm(isFin 
          ? '¿Finalizar tratamiento del cliente?\n\nEsto marcará el turno como Realizado, el estado del cliente como Finalizado y activará el seguimiento de mantenimiento.'
          : '¿Marcar al cliente en Mantenimiento?\n\nEsto marcará el turno como Realizado, el estado del cliente en Mantenimiento y programará el recordatorio de mantenimiento de 2 meses.');
        if (!confirmFin) return;
        markClientFinalizado = true;
      }

      if (actionType === 'VA_A_AVISAR') {
        const confirmAviso = confirm('¿Registrar que el cliente "Va a avisar"?\n\nEsto marcará el turno como Realizado y dejará una nota para que avise cuando desee agendar su próximo turno.');
        if (!confirmAviso) return;
        markClientVaAAvisar = true;
      }

      const updateBody = { 
        estado: newStatus, 
        preserveDeposit, 
        markClientFinalizado, 
        markClientVaAAvisar
      };

      // Only send client observations/notes if they were explicitly modified by the user
      if (selectedTurno?.cliente) {
        if (tempClientObservaciones !== (selectedTurno.cliente.observaciones || '')) {
          updateBody.observaciones = tempClientObservaciones;
        }
        if (tempClientNotasGonzalo !== (selectedTurno.cliente.notasGonzalo || '')) {
          updateBody.notasGonzalo = tempClientNotasGonzalo;
        }
        if (tempClientFrecuencia !== (selectedTurno.cliente.frecuencia || 4)) {
          updateBody.frecuencia = tempClientFrecuencia;
        }
      }

      if (selectedTurno && (newStatus === 'REALIZADO' || actionType === 'FINALIZADO' || actionType === 'MANTENIMIENTO' || actionType === 'VA_A_AVISAR')) {
        const dynPrices = getUpdatedTurnoPrices(selectedTurno);
        if (dynPrices && dynPrices.hasPriceUpdate) {
          updateBody.valorTotal = dynPrices.valorTotal;
          updateBody.bonificacion = dynPrices.bonificacion;
        }
      }

      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });
      if (res.ok) {
        setIsDetailsOpen(false);
        fetchAppointments();
        if (actionType === 'FINALIZADO') {
          showToast('Tratamiento del cliente marcado como Finalizado.');
        } else if (actionType === 'MANTENIMIENTO') {
          showToast('Cliente marcado en Mantenimiento.');
        } else if (actionType === 'VA_A_AVISAR') {
          showToast('Registrado: El cliente va a avisar para el próximo turno.');
        } else {
          showToast(`Turno actualizado a ${newStatus}.`);
        }
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
    setSendingReceipt(prev => ({ ...prev, [turnoId]: true }));
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
    } finally {
      setSendingReceipt(prev => ({ ...prev, [turnoId]: false }));
    }
  };

  // Open modal to edit email and resend appointment notice
  const handleOpenResendEmail = (turno) => {
    setResendEmailModalTurno(turno);
    setResendEmailAddress(turno.cliente?.email || '');
    setResendEmailType('RECORDATORIO');
  };

  // Open modal to resend WhatsApp appointment notice
  const handleOpenResendWpp = (turno) => {
    setResendWppModalTurno(turno);
    setResendWppPhone(turno.cliente?.whatsapp || '');
    setResendWppType('RECORDATORIO_48H');
    fetch('/api/whatsapp/status')
      .then(r => r.json())
      .then(d => setWppConnectionStatus(d.status || 'UNKNOWN'))
      .catch(() => setWppConnectionStatus('DISCONNECTED'));
  };

  // Send selected WhatsApp notice
  const handleSendWppNotice = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!resendWppModalTurno) return;
    if (!resendWppPhone.trim()) {
      showToast('Por favor, ingresa un número de WhatsApp válido.', 'error');
      return;
    }

    setSendingWppNotice(true);
    try {
      const res = await fetch(`/api/admin/turnos/${resendWppModalTurno.id}/enviar-aviso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal: 'WHATSAPP',
          whatsapp: resendWppPhone.trim(),
          tipo: resendWppType
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Mensaje de WhatsApp reenviado correctamente.`);
        if (selectedTurno && selectedTurno.id === resendWppModalTurno.id) {
          setSelectedTurno(prev => ({
            ...prev,
            cliente: {
              ...(prev.cliente || {}),
              whatsapp: data.updatedWhatsapp || resendWppPhone.trim()
            }
          }));
        }
        setResendWppModalTurno(null);
        fetchAppointments();
      } else {
        showToast(data.error || 'Error al enviar el WhatsApp.', 'error');
      }
    } catch (err) {
      console.error('Error sending WhatsApp notice:', err);
      showToast('Error de red al enviar el mensaje de WhatsApp.', 'error');
    } finally {
      setSendingWppNotice(false);
    }
  };

  // Send selected email notice (and update client email in DB if changed)
  const handleSendEmailNotice = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!resendEmailModalTurno) return;
    if (!resendEmailAddress.trim() || !resendEmailAddress.includes('@')) {
      showToast('Por favor, ingresa una casilla de correo válida.', 'error');
      return;
    }

    setSendingEmailNotice(true);
    try {
      const res = await fetch(`/api/admin/turnos/${resendEmailModalTurno.id}/enviar-aviso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal: 'EMAIL',
          email: resendEmailAddress.trim(),
          tipo: resendEmailType
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Aviso enviado correctamente a ${resendEmailAddress}.`);
        if (selectedTurno && selectedTurno.id === resendEmailModalTurno.id) {
          setSelectedTurno(prev => ({
            ...prev,
            cliente: {
              ...(prev.cliente || {}),
              email: data.updatedEmail || resendEmailAddress.trim()
            }
          }));
        }
        setResendEmailModalTurno(null);
        fetchAppointments();
      } else {
        showToast(data.error || 'Error al enviar el aviso por correo.', 'error');
      }
    } catch (err) {
      console.error('Error sending email notice:', err);
      showToast('Error de red al enviar el aviso.', 'error');
    } finally {
      setSendingEmailNotice(false);
    }
  };

  const [pendingNextScheduleData, setPendingNextScheduleData] = useState(null);

  // Schedule next turno based on client's treatment frequency: navigate calendar to target week
  const handleScheduleNextTurn = (turno) => {
    if (!turno || !turno.cliente) return;
    
    const fechaStr = typeof turno.fecha === 'string' ? turno.fecha.split('T')[0] : toYYYYMMDD(turno.fecha);
    const [year, month, day] = fechaStr.split('-').map(Number);
    const currentFecha = new Date(year, month - 1, day, 12, 0, 0);
    const freqWeeks = turno.cliente.frecuencia || 4;
    
    const targetDate = new Date(currentFecha);
    targetDate.setDate(targetDate.getDate() + freqWeeks * 7);

    // Calculate Monday of that target week cleanly at local noon
    const targetDay = targetDate.getDay();
    const diffToMonday = targetDate.getDate() - targetDay + (targetDay === 0 ? -6 : 1);
    const mondayOfWeek = new Date(targetDate);
    mondayOfWeek.setDate(diffToMonday);
    mondayOfWeek.setHours(12, 0, 0, 0);

    const { preselectedZoneIds, hasOtros, otrosTexto, otrosPrecio } = extractZoneSelection(turno.zonas, zones);

    const fullName = turno.cliente.nombreCompleto || '';
    const lastSpaceIdx = fullName.lastIndexOf(' ');
    const nombreVal = lastSpaceIdx !== -1 ? fullName.substring(0, lastSpaceIdx) : fullName;
    const apellidoVal = lastSpaceIdx !== -1 ? fullName.substring(lastSpaceIdx + 1) : '';

    const { countryCode, number, customCode } = parsePhoneCountryAndNumber(turno.cliente.whatsapp);

    let previousDuration = 30;
    if (turno.horaInicio && turno.horaFin) {
      const s = timeToMinutes(turno.horaInicio);
      const e = timeToMinutes(turno.horaFin);
      if (e > s) {
        previousDuration = e - s;
      }
    } else if (preselectedZoneIds.length > 0) {
      const selectedZ = zones.filter(z => preselectedZoneIds.some(id => String(id) === String(z.id)));
      const calcsZ = calculateTurnDetails(selectedZ, false);
      if (calcsZ.duracionMinutos > 0) previousDuration = calcsZ.duracionMinutos;
    }

    setPendingNextScheduleData({
      clienteId: turno.cliente.id,
      nombre: nombreVal,
      apellido: apellidoVal,
      nombreCompleto: fullName,
      whatsapp: number,
      whatsappCountry: countryCode,
      whatsappCustomCode: customCode,
      email: turno.cliente.email || '',
      dni: turno.cliente.dni || '',
      selectedZoneIds: preselectedZoneIds,
      hasOtros,
      otrosTexto,
      otrosPrecio: otrosPrecio || '',
      descuentoTipo: turno.descuentoTipo || (turno.bonificacion > 0 ? 'PESOS' : 'NINGUNO'),
      descuentoValor: turno.descuentoValor || turno.bonificacion || '',
      manualTotalOverride: undefined,
      valorSeña: Number(turno.valorSeña || 0),
      manualSeñaOverride: Number(turno.valorSeña || 0),
      inheritedDuration: previousDuration
    });

    // If observations were edited in the modal before clicking next turn, persist them silently
    if (turno.cliente?.id && (
      tempClientObservaciones !== (turno.cliente?.observaciones || '') ||
      tempClientNotasGonzalo !== (turno.cliente?.notasGonzalo || '') ||
      tempClientFrecuencia !== (turno.cliente?.frecuencia || 4)
    )) {
      handleSaveClientObservaciones(true);
    }

    setIsDetailsOpen(false);
    setSelectedDate(targetDate);
    setCurrentWeekStart(mondayOfWeek);
    setViewMode('week');

    // Pre-fetch target week appointments immediately so they show on screen without delay
    const startStr = toYYYYMMDD(mondayOfWeek);
    const satDate = new Date(mondayOfWeek);
    satDate.setDate(satDate.getDate() + 5);
    const endStr = toYYYYMMDD(satDate);

    fetch(`/api/admin/turnos?start=${startStr}&end=${endStr}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAppointments(data);
        }
      })
      .catch(err => console.error('Error pre-fetching next week appointments:', err));

    const formattedTarget = targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    showToast(`Navegando a la semana del ${formattedTarget} (${freqWeeks} semanas después). Hace clic en un horario libre para agendar con los datos pre-cargados de ${fullName}.`);
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
          descuentoTipo: editTurno.descuentoTipo,
          descuentoValor: Number(editTurno.descuentoValor || 0),
          observaciones: editTurno.observaciones,
          notasGonzalo: editTurno.notasGonzalo && editTurno.notasGonzalo.trim() !== '' ? editTurno.notasGonzalo : undefined,
          frecuencia: editTurno.frecuencia,
          selectedZoneIds: editTurno.selectedZoneIds,
          hasOtros: editTurno.hasOtros,
          otrosTexto: editTurno.otrosTexto,
          otrosPrecio: Number(editTurno.otrosPrecio || 0)
        })
      });
      if (res.ok) {
        setIsEditing(false);
        setIsDetailsOpen(false);
        showToast('Turno guardado con éxito.');
        fetchAppointments();
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
    setSelectedDate(date);
    setIsNextScheduling(false);
    const startHour = Math.floor(startMin / 60);
    const startMins = startMin % 60;
    const timeStr = `${startHour.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`;
    const dateStr = typeof date === 'string' ? date.split('T')[0] : toYYYYMMDD(date);

    if (pendingNextScheduleData) {
      let durationMins = pendingNextScheduleData.inheritedDuration;
      if (!durationMins || durationMins <= 0) {
        if (pendingNextScheduleData.selectedZoneIds && pendingNextScheduleData.selectedZoneIds.length > 0) {
          const selectedZ = zones.filter(z => (pendingNextScheduleData.selectedZoneIds || []).some(id => String(id) === String(z.id)));
          const calcsZ = calculateTurnDetails(selectedZ, false);
          if (calcsZ.duracionMinutos > 0) durationMins = calcsZ.duracionMinutos;
        }
      }
      if (!durationMins || durationMins <= 0) durationMins = 30;

      const endMinutes = startMin + durationMins;
      const endHour = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      setNewTurno({
        ...pendingNextScheduleData,
        fechaStr: dateStr,
        horaInicio: timeStr,
        horaFin: endTimeStr,
        autoHoraFin: endTimeStr,
        estado: 'PENDIENTE_PAGO'
      });
      setPendingNextScheduleData(null);
    } else {
      const endMinutes = startMin + 30;
      const endHour = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      setNewTurno({
        nombreCompleto: '',
        nombre: '',
        apellido: '',
        whatsapp: '',
        whatsappCountry: '54',
        whatsappCustomCode: '',
        email: '',
        dni: '',
        fechaStr: dateStr,
        horaInicio: timeStr,
        horaFin: endTimeStr,
        autoHoraFin: endTimeStr,
        selectedZoneIds: [],
        valorTotal: '',
        valorSeña: '',
        descuentoTipo: 'NINGUNO',
        descuentoValor: '',
        bonificacion: 0,
        estado: 'PENDIENTE_PAGO',
        observaciones: '',
        clienteId: null,
        hasOtros: false,
        otrosTexto: '',
        otrosPrecio: ''
      });
    }
    setIsNewOpen(true);
  };

  // Re-calculate pricing/durations when newTurno inputs change
  useEffect(() => {
    if (newTurno.selectedZoneIds.length === 0 && !newTurno.hasOtros) {
      const startMin = timeToMinutes(newTurno.horaInicio);
      const endMin = startMin + (newTurno.estado === 'BLOQUEADO' ? 30 : 0);
      const endHour = Math.floor(endMin / 60);
      const endMins = endMin % 60;
      const horaFinStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      setNewTurno(prev => ({
        ...prev,
        horaFin: horaFinStr,
        autoHoraFin: horaFinStr,
        valorTotal: 0,
        valorSeña: 0,
        autoTotal: 0,
        autoTotalZonas: 0,
        autoSeña: 0,
        bonificacion: 0
      }));
      return;
    }
    const selected = zones.filter(z => (newTurno.selectedZoneIds || []).some(id => String(id) === String(z.id)));
    
    // Assume regular/new based on form (defaults to new=false for manual scheduler)
    const calcs = calculateTurnDetails(selected, false);
    
    // Calculate horaFin based on start time + calculated duration
    const startMin = timeToMinutes(newTurno.horaInicio);
    const endMin = startMin + (calcs.duracionMinutos > 0 ? calcs.duracionMinutos : 30);
    const endHour = Math.floor(endMin / 60);
    const endMins = endMin % 60;
    const horaFinStr = `${endHour.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    const baseZonasTotal = calcs.valorTotal;
    const otrosExtra = newTurno.hasOtros ? Number(newTurno.otrosPrecio || 0) : 0;
    const totalBaseCombinado = baseZonasTotal + otrosExtra;

    let finalTotal = 0;
    let bonificacion = 0;

    if (newTurno.manualTotalOverride !== undefined && newTurno.manualTotalOverride !== null && newTurno.manualTotalOverride !== '') {
      finalTotal = Number(newTurno.manualTotalOverride);
      bonificacion = Math.max(0, totalBaseCombinado - finalTotal);
    } else {
      if (newTurno.descuentoTipo === 'PORCENTAJE') {
        const rawDiscounted = totalBaseCombinado * (1 - Number(newTurno.descuentoValor || 0) / 100);
        finalTotal = Math.max(0, Math.round(rawDiscounted / 1000) * 1000);
        bonificacion = Math.max(0, totalBaseCombinado - finalTotal);
      } else if (newTurno.descuentoTipo === 'PESOS') {
        bonificacion = Math.min(totalBaseCombinado, Number(newTurno.descuentoValor || 0));
        finalTotal = Math.max(0, totalBaseCombinado - bonificacion);
      } else {
        finalTotal = totalBaseCombinado;
        bonificacion = 0;
      }
    }

    setNewTurno(prev => {
      const shouldUpdateHoraFin = !prev.horaFin || prev.horaFin === prev.autoHoraFin || !prev.autoHoraFin;
      return {
        ...prev,
        horaFin: (shouldUpdateHoraFin && calcs.duracionMinutos > 0) ? horaFinStr : (prev.horaFin || horaFinStr),
        autoHoraFin: horaFinStr,
        valorTotal: finalTotal,
        valorSeña: (prev.manualSeñaOverride !== undefined && prev.manualSeñaOverride !== null)
          ? prev.manualSeñaOverride
          : (calcs.valorSeña + Math.round(otrosExtra * 0.5)),
        autoTotal: totalBaseCombinado,
        autoTotalZonas: baseZonasTotal,
        autoSeña: calcs.valorSeña + Math.round(otrosExtra * 0.5),
        bonificacion: bonificacion
      };
    });
  }, [newTurno.selectedZoneIds, newTurno.descuentoTipo, newTurno.descuentoValor, newTurno.hasOtros, newTurno.otrosPrecio, newTurno.manualTotalOverride, newTurno.manualSeñaOverride]);

  // Re-calculate pricing/discount and duration for editTurno
  useEffect(() => {
    if (!isEditing || !selectedTurno) return;

    if (editTurno.isInitialEdit) {
      setEditTurno(prev => ({
        ...prev,
        isInitialEdit: false
      }));
      return;
    }
    
    if ((!editTurno.selectedZoneIds || editTurno.selectedZoneIds.length === 0) && !editTurno.hasOtros) {
      setEditTurno(prev => ({
        ...prev,
        valorTotal: 0,
        valorSeña: prev.manualSeñaOverride !== undefined ? prev.manualSeñaOverride : (prev.initialValorSeña !== undefined ? prev.initialValorSeña : 0),
        autoTotal: 0,
        autoTotalZonas: 0,
        autoSeña: 0,
        bonificacion: 0
      }));
      return;
    }

    const currentSelectedZones = zones.filter(z => (editTurno.selectedZoneIds || []).some(id => String(id) === String(z.id)));
    const calcs = calculateTurnDetails(currentSelectedZones, false);

    const baseZonasTotal = calcs.valorTotal;
    const otrosExtra = editTurno.hasOtros ? Number(editTurno.otrosPrecio || 0) : 0;
    const totalBaseCombinado = baseZonasTotal + otrosExtra;

    let finalTotal = 0;
    let bonificacion = 0;

    if (editTurno.manualTotalOverride !== undefined && editTurno.manualTotalOverride !== null && editTurno.manualTotalOverride !== '') {
      finalTotal = Number(editTurno.manualTotalOverride);
      bonificacion = Math.max(0, totalBaseCombinado - finalTotal);
    } else {
      if (editTurno.descuentoTipo === 'PORCENTAJE') {
        const rawDiscounted = totalBaseCombinado * (1 - Number(editTurno.descuentoValor || 0) / 100);
        finalTotal = Math.max(0, Math.round(rawDiscounted / 1000) * 1000);
        bonificacion = Math.max(0, totalBaseCombinado - finalTotal);
      } else if (editTurno.descuentoTipo === 'PESOS') {
        bonificacion = Math.min(totalBaseCombinado, Number(editTurno.descuentoValor || 0));
        finalTotal = Math.max(0, totalBaseCombinado - bonificacion);
      } else {
        finalTotal = totalBaseCombinado;
        bonificacion = 0;
      }
    }

    // Seña MUST STAY FIXED at initial deposit or manual override
    const fixedSeña = (editTurno.manualSeñaOverride !== undefined && editTurno.manualSeñaOverride !== null)
      ? editTurno.manualSeñaOverride 
      : (editTurno.initialValorSeña !== undefined ? editTurno.initialValorSeña : editTurno.valorSeña);

    setEditTurno(prev => ({
      ...prev,
      valorTotal: finalTotal,
      valorSeña: fixedSeña,
      autoTotal: totalBaseCombinado,
      autoTotalZonas: baseZonasTotal,
      bonificacion: bonificacion
    }));
  }, [editTurno.selectedZoneIds, editTurno.descuentoTipo, editTurno.descuentoValor, editTurno.hasOtros, editTurno.otrosPrecio, editTurno.manualTotalOverride, editTurno.manualSeñaOverride, isEditing]);

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
      const fullPhone = buildFullPhone(newTurno.whatsappCountry, newTurno.whatsappCustomCode, newTurno.whatsapp);
      const res = await fetch('/api/admin/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTurno,
          whatsapp: fullPhone,
          valorTotal: Number(newTurno.valorTotal),
          valorSeña: Number(newTurno.valorSeña)
        })
      });
      if (res.ok) {
        setIsNewOpen(false);
        showToast('Turno agendado con éxito.');
        fetchAppointments();
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
    const exists = (newTurno.selectedZoneIds || []).some(id => String(id) === String(zoneId));

    setNewTurno(prev => {
      const newZoneIds = exists
        ? (prev.selectedZoneIds || []).filter(id => String(id) !== String(zoneId))
        : [...(prev.selectedZoneIds || []), zoneId];

      const newZones = zones.filter(z => newZoneIds.some(id => String(id) === String(z.id)));
      const calcs = calculateTurnDetails(newZones, false);
      let newHoraFin = prev.horaFin;
      if (prev.horaInicio && calcs.duracionMinutos > 0) {
        newHoraFin = addMinutesToTime(prev.horaInicio, calcs.duracionMinutos);
      }

      return {
        ...prev,
        manualTotalOverride: undefined,
        selectedZoneIds: newZoneIds,
        horaFin: newHoraFin,
        autoHoraFin: newHoraFin
      };
    });
  };

  const checkHasUnsavedChanges = () => {
    if (!selectedTurno) return false;

    if (isEditing) {
      if (!editTurno) return false;
      const originalFechaStr = typeof selectedTurno.fecha === 'string' 
        ? selectedTurno.fecha.split('T')[0] 
        : toYYYYMMDD(selectedTurno.fecha);
      
      const isFechaChanged = editTurno.fechaStr !== originalFechaStr;
      const isHoraInicioChanged = editTurno.horaInicio !== selectedTurno.horaInicio;
      const isHoraFinChanged = editTurno.horaFin !== selectedTurno.horaFin;
      const isEstadoChanged = editTurno.estado !== selectedTurno.estado;
      const isValorTotalChanged = editTurno.manualTotalOverride !== undefined && Number(editTurno.manualTotalOverride) !== Number(editTurno.initialValorTotal);
      const isValorSeñaChanged = editTurno.manualSeñaOverride !== undefined && Number(editTurno.manualSeñaOverride) !== Number(editTurno.initialValorSeña);
      const isObsChanged = (editTurno.observaciones || '').trim() !== (editTurno.initialObservaciones || '');
      const isNotasChanged = (editTurno.notasGonzalo || '').trim() !== (editTurno.initialNotasGonzalo || '');
      const isFreqChanged = editTurno.frecuencia !== (editTurno.initialFrecuencia || 4);
      
      const isOtrosChanged = Boolean(editTurno.hasOtros) !== Boolean(editTurno.initialHasOtros) ||
        (editTurno.otrosTexto || '').trim() !== (editTurno.initialOtrosTexto || '') ||
        String(editTurno.otrosPrecio || '') !== String(editTurno.initialOtrosPrecio || '');

      const initialZonesStr = JSON.stringify([...(editTurno.initialZoneIds || [])].sort());
      const currentZonesStr = JSON.stringify([...(editTurno.selectedZoneIds || [])].sort());
      const isZonesChanged = initialZonesStr !== currentZonesStr;

      return isFechaChanged || isHoraInicioChanged || isHoraFinChanged || isEstadoChanged || isValorTotalChanged || isValorSeñaChanged || isObsChanged || isNotasChanged || isFreqChanged || isOtrosChanged || isZonesChanged;
    } else {
      const isObsChanged = (tempClientObservaciones || '').trim() !== (selectedTurno.cliente?.observaciones || '').trim();
      const isNotasChanged = (tempClientNotasGonzalo || '').trim() !== (selectedTurno.cliente?.notasGonzalo || '').trim();
      const isFreqChanged = tempClientFrecuencia !== (selectedTurno.cliente?.frecuencia || 4);

      return isObsChanged || isNotasChanged || isFreqChanged;
    }
  };

  const handleCloseDetailsModal = () => {
    if (checkHasUnsavedChanges()) {
      const confirmClose = window.confirm('Tenés cambios sin guardar. ¿Estás seguro de cerrar sin guardar los cambios?');
      if (!confirmClose) return;
    }
    setIsDetailsOpen(false);
    setIsEditing(false);
  };

  const checkHasUnsavedNewTurnoChanges = () => {
    if (!newTurno) return false;
    return (
      (newTurno.nombreCompleto || '').trim() !== '' ||
      (newTurno.whatsapp || '').trim() !== '' ||
      ((newTurno.selectedZoneIds || []).length > 0 && !pendingNextScheduleData) ||
      (newTurno.observaciones || '').trim() !== ''
    );
  };

  const handleCloseNewModal = () => {
    if (checkHasUnsavedNewTurnoChanges()) {
      const confirmClose = window.confirm('Tenés cambios sin guardar. ¿Estás seguro de cerrar sin guardar los cambios?');
      if (!confirmClose) return;
    }
    setIsNewOpen(false);
  };

  const toggleEditTurnoZone = (zoneId) => {
    const exists = (editTurno.selectedZoneIds || []).some(id => String(id) === String(zoneId));

    setEditTurno(prev => {
      const newZoneIds = exists
        ? (prev.selectedZoneIds || []).filter(id => String(id) !== String(zoneId))
        : [...(prev.selectedZoneIds || []), zoneId];

      const newZones = zones.filter(z => newZoneIds.some(id => String(id) === String(z.id)));
      const calcs = calculateTurnDetails(newZones, false);
      let newHoraFin = prev.horaFin;
      if (prev.horaInicio && calcs.duracionMinutos > 0) {
        newHoraFin = addMinutesToTime(prev.horaInicio, calcs.duracionMinutos);
      }

      return {
        ...prev,
        manualTotalOverride: undefined,
        selectedZoneIds: newZoneIds,
        horaFin: newHoraFin,
        autoHoraFin: newHoraFin
      };
    });
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
              onClick={() => { setViewMode('day'); }} 
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
              onClick={() => {
                const target = selectedDate || new Date();
                const day = target.getDay();
                const diffToMonday = target.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(target);
                monday.setDate(diffToMonday);
                setCurrentWeekStart(monday);
                setViewMode('week');
              }} 
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
              onClick={() => { setViewMode('month'); }} 
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

          {/* Quick Return to Today */}
          <button 
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              const monday = getStartOfWeek(today);
              setCurrentWeekStart(monday);
              try {
                window.history.replaceState({}, '', window.location.pathname);
              } catch (e) {}
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            📅 Hoy
          </button>

          {/* Toggle Show/Hide Cancelled Appointments */}
          <button 
            onClick={() => setShowCancelled(!showCancelled)}
            style={{
              background: showCancelled ? 'rgba(239, 83, 80, 0.15)' : 'var(--bg-secondary)',
              border: showCancelled ? '1px solid #ef5350' : '1px solid var(--border-color)',
              color: showCancelled ? '#ef5350' : 'var(--text-secondary)',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
            title="Mostrar u ocultar turnos cancelados en la grilla visual de la agenda"
          >
            {showCancelled ? '👁️ Ver Cancelados' : '🙈 Ocultar Cancelados'}
          </button>

          {/* Jump to Date Picker */}
          <input 
            type="date"
            value={selectedDate ? toYYYYMMDD(selectedDate) : ''}
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
                const dateStr = toYYYYMMDD(selectedDate);
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
              fechaStr: selectedDate ? toYYYYMMDD(selectedDate) : toYYYYMMDD(new Date()),
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
                const dateStr = toYYYYMMDD(date);
                const isToday = new Date().toDateString() === date.toDateString();
                const isOutsideMonth = date.getMonth() !== selectedDate.getMonth();
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const cellDate = new Date(date);
                cellDate.setHours(0,0,0,0);
                const isPast = cellDate < today;

                const dayAppointments = appointments.filter(app => {
                  const appDateStr = getAppDateStr(app.fecha);
                  if (appDateStr !== dateStr) return false;
                  if (!showCancelled && app.estado === 'CANCELADO') return false;
                  return true;
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
            <div ref={gridBodyRef} className={styles.gridBody} style={viewMode === 'day' ? { gridTemplateColumns: '80px 1fr', minWidth: 'auto' } : { minWidth: '800px' }}>
              {/* Time Column */}
              <div className={styles.timeColumn}>
                {timeLabels.map((time, idx) => (
                  <div key={idx} className={styles.timeLabel}>
                    <span className={styles.timeLabelText}>{time}</span>
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {viewMode === 'day' ? (
                (() => {
                  if (!selectedDate) return null;
                  const dateStr = toYYYYMMDD(selectedDate);
                  const dayAppointments = appointments.filter(app => {
                    const appDateStr = getAppDateStr(app.fecha);
                    if (appDateStr !== dateStr) return false;
                    if (!showCancelled && app.estado === 'CANCELADO') return false;
                    return true;
                  });

                  return (
                    <div className={styles.dayColumn} style={{ height: `${dayColumnHeight}px` }}>
                      {/* Background grid lines for hours */}
                      <div className={styles.gridLines}>
                        {Array.from({ length: endHour - startHour }).map((_, idx) => (
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
                            {app.duracionMinutos <= 25 ? (
                              <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <span className={styles.appTitle} style={{ fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.1' }}>
                                  {app.cliente?.nombreCompleto || 'Cliente'} <span style={{ opacity: 0.9, fontWeight: '500', fontSize: '0.67rem' }}>({app.horaInicio})</span>
                                </span>
                              </div>
                            ) : app.duracionMinutos <= 45 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '2px 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <span className={styles.appTitle} style={{ fontSize: '0.78rem', fontWeight: '700', lineHeight: '1.15', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {app.cliente?.nombreCompleto || 'Cliente'}
                                </span>
                                <span className={styles.appTime} style={{ fontSize: '0.7rem', opacity: 0.95, lineHeight: '1.15', marginTop: '1px', fontWeight: '500' }}>
                                  {app.horaInicio} - {app.horaFin}
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '3px 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <span className={styles.appTitle} style={{ fontSize: '0.82rem', fontWeight: '700', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {app.cliente?.nombreCompleto || 'Cliente Desconocido'}
                                </span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0' }}>{zonasText}</span>
                                <span className={styles.appTime} style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: 'auto', fontWeight: '500' }}>{app.horaInicio} - {app.horaFin}</span>
                              </div>
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
                  const dateStr = toYYYYMMDD(date);
                  const dayAppointments = appointments.filter(app => {
                    const appDateStr = getAppDateStr(app.fecha);
                    if (appDateStr !== dateStr) return false;
                    if (!showCancelled && app.estado === 'CANCELADO') return false;
                    return true;
                  });

                  return (
                    <div key={dayIdx} className={styles.dayColumn} style={{ height: `${dayColumnHeight}px` }}>
                      {/* Background grid lines for hours */}
                      <div className={styles.gridLines}>
                        {Array.from({ length: endHour - startHour }).map((_, idx) => (
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
                            {app.duracionMinutos <= 25 ? (
                              <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <span className={styles.appTitle} style={{ fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.1' }}>
                                  {app.cliente?.nombreCompleto || 'Cliente'} <span style={{ opacity: 0.9, fontWeight: '500', fontSize: '0.67rem' }}>({app.horaInicio})</span>
                                </span>
                              </div>
                            ) : app.duracionMinutos <= 45 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '2px 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <span className={styles.appTitle} style={{ fontSize: '0.78rem', fontWeight: '700', lineHeight: '1.15', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {app.cliente?.nombreCompleto || 'Cliente'}
                                </span>
                                <span className={styles.appTime} style={{ fontSize: '0.7rem', opacity: 0.95, lineHeight: '1.15', marginTop: '1px', fontWeight: '500' }}>
                                  {app.horaInicio} - {app.horaFin}
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '3px 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <span className={styles.appTitle} style={{ fontSize: '0.82rem', fontWeight: '700', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {app.cliente?.nombreCompleto || 'Cliente Desconocido'}
                                </span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0' }}>{zonasText}</span>
                                <span className={styles.appTime} style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: 'auto', fontWeight: '500' }}>{app.horaInicio} - {app.horaFin}</span>
                              </div>
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
        <div className={styles.modalOverlay} onClick={handleCloseDetailsModal}>
          <div className={`glass-card premium-border ${styles.modalContent}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>
                {isEditing ? 'Editar / Reprogramar Turno' : 'Detalle del Turno'}
              </h3>
              <button onClick={handleCloseDetailsModal} className={styles.closeBtn}>&times;</button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEditTurno}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
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

                  <div className={styles.inputRow} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
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
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Hora Fin</label>
                      <input
                        type="time"
                        value={editTurno.horaFin}
                        onChange={(e) => setEditTurno({ ...editTurno, horaFin: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Zones Checkboxes */}
                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.inputLabel}>Seleccionar Zonas *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', opacity: editTurno.estado === 'BLOQUEADO' ? 0.5 : 1, pointerEvents: editTurno.estado === 'BLOQUEADO' ? 'none' : 'auto' }}>
                      {zones.map(z => {
                        const isChecked = (editTurno.selectedZoneIds || []).some(id => String(id) === String(z.id));
                        return (
                          <div key={z.id} onClick={() => toggleEditTurnoZone(z.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={isChecked} readOnly style={{ width: 'auto' }} />
                            <span>{z.nombre}</span>
                          </div>
                        );
                      })}
                      {/* OTROS Checkbox */}
                      <div onClick={() => setEditTurno(prev => ({ ...prev, manualTotalOverride: undefined, hasOtros: !prev.hasOtros }))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={editTurno.hasOtros || false} readOnly style={{ width: 'auto' }} />
                        <span style={{ fontWeight: 'bold' }}>Otros</span>
                      </div>
                    </div>
                  </div>

                  {editTurno.hasOtros && (
                    <div className={styles.inputRow} style={{ gridColumn: '1 / -1', marginTop: '-0.25rem' }}>
                      <div className={styles.inputGroup} style={{ flex: 2 }}>
                        <label className={styles.inputLabel}>Escribir Zona Extra (Otros) *</label>
                        <input
                          type="text"
                          placeholder="Ej: Cintura, Nuca o zonas combinadas"
                          value={editTurno.otrosTexto || ''}
                          onChange={(e) => setEditTurno({ ...editTurno, otrosTexto: e.target.value })}
                          required
                        />
                      </div>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Valor Zonas Extras ($)</label>
                        <input
                          type="number"
                          placeholder="Ej. 15000"
                          value={editTurno.otrosPrecio ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTurno(prev => ({
                              ...prev,
                              otrosPrecio: val,
                              manualTotalOverride: undefined
                            }));
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {editTurno.hasOtros ? (
                    <div className={styles.inputRow} style={{ gridColumn: '1 / -1' }}>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Zonas Normales ($)</label>
                        <input
                          type="text"
                          value={`$${Number(editTurno.autoTotalZonas || 0).toLocaleString('es-ES')}`}
                          disabled
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 600 }}
                        />
                      </div>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Valor Total ($)</label>
                        <input
                          type="number"
                          value={editTurno.valorTotal ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTurno(prev => ({
                              ...prev,
                              valorTotal: val,
                              manualTotalOverride: val
                            }));
                          }}
                          required
                        />
                      </div>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Seña Recibida ($)</label>
                        <input
                          type="number"
                          value={editTurno.valorSeña ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTurno(prev => ({
                              ...prev,
                              valorSeña: val,
                              manualSeñaOverride: val
                            }));
                          }}
                          required
                          placeholder="Auto-calculado al elegir zona"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.inputRow} style={{ gridColumn: '1 / -1' }}>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Valor Total ($)</label>
                        <input
                          type="number"
                          value={editTurno.valorTotal ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTurno(prev => ({
                              ...prev,
                              valorTotal: val,
                              manualTotalOverride: val
                            }));
                          }}
                          required
                          placeholder="Auto-calculado al elegir zona"
                        />
                      </div>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Seña Recibida ($)</label>
                        <input
                          type="number"
                          value={editTurno.valorSeña ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTurno(prev => ({
                              ...prev,
                              valorSeña: val,
                              manualSeñaOverride: val
                            }));
                          }}
                          required
                          placeholder="Auto-calculado al elegir zona"
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Tipo de Descuento</label>
                    <select
                      value={editTurno.descuentoTipo}
                      onChange={(e) => setEditTurno(prev => ({ ...prev, manualTotalOverride: undefined, descuentoTipo: e.target.value }))}
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
                      onChange={(e) => setEditTurno(prev => ({ ...prev, manualTotalOverride: undefined, descuentoValor: e.target.value }))}
                      placeholder="Ej. 10 o 500"
                      disabled={editTurno.descuentoTipo === 'NINGUNO'}
                    />
                  </div>

                  {/* Resumen de Descuento y Saldo a Pagar */}
                  {editTurno.estado !== 'BLOQUEADO' && (
                    <div className={styles.inputGroup} style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', gap: '0.25rem', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Base (Zonas):</span>
                        <span style={{ fontWeight: '600' }}>
                          ${(editTurno.manualTotalOverride !== undefined && editTurno.manualTotalOverride !== null && editTurno.manualTotalOverride !== '' ? Number(editTurno.manualTotalOverride) : (editTurno.autoTotal || 0)).toLocaleString('es-ES')}
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

                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.inputLabel}>Observaciones Generales del Cliente</label>
                    <textarea
                      value={editTurno.observaciones || ''}
                      onChange={(e) => setEditTurno({ ...editTurno, observaciones: e.target.value })}
                      placeholder="Observaciones generales del cliente que se guardarán para todos sus turnos..."
                      rows="2"
                    />
                  </div>

                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.inputLabel} style={{ color: 'var(--color-gold)' }}>
                      🛡️ Observaciones del Operador (Potencia, Clínica, Indicaciones)
                    </label>
                    <textarea
                      value={editTurno.notasGonzalo || ''}
                      onChange={(e) => setEditTurno({ ...editTurno, notasGonzalo: e.target.value })}
                      placeholder="Potencia utilizada (J), tolerancia al dolor, zonas sensibles o notas clínicas..."
                      rows="2"
                    />
                  </div>
                </div>

                {editTurnoWarning && (
                  <div style={{ color: '#b45309', backgroundColor: 'rgba(180, 83, 9, 0.08)', border: '1px solid #d97706', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', marginTop: '1rem', textAlign: 'center', width: '100%' }}>
                    {editTurnoWarning}
                  </div>
                )}

                <div className={styles.modalFooter}>
                  <button type="button" onClick={handleCloseDetailsModal} className="btn btn-secondary">Cancelar</button>
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
                    <span className={styles.detailValue}>
                      {selectedTurno.horaInicio} a {selectedTurno.horaFin} ({(() => {
                        const startM = timeToMinutes(selectedTurno.horaInicio);
                        const endM = timeToMinutes(selectedTurno.horaFin);
                        const diff = endM - startM;
                        return diff > 0 ? diff : selectedTurno.duracionMinutos;
                      })()} min)
                    </span>
                  </div>
                  {(() => {
                    const dynPrices = getUpdatedTurnoPrices(selectedTurno);
                    return (
                      <>
                        <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                          <span className={styles.detailLabel}>Zonas a depilar</span>
                          <span className={styles.detailValue} style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {(() => {
                              try {
                                return JSON.parse(selectedTurno.zonas).map(z => z.nombre || z.name).filter(Boolean).join(', ') || 'Ninguna (Bloqueo)';
                              } catch(e) {
                                return selectedTurno.zonas || 'Ninguna (Bloqueo)';
                              }
                            })()}
                          </span>
                        </div>

                        {/* Swapped order per Gonzalo's request: VALOR TOTAL in big gold box on top */}
                        <div className={styles.detailItem} style={{ gridColumn: '1 / -1', backgroundColor: 'rgba(212, 165, 77, 0.14)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(212, 165, 77, 0.4)', marginBottom: '0.25rem' }}>
                          <span className={styles.detailLabel} style={{ color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.85rem' }}>VALOR TOTAL (A COBRAR)</span>
                          <span className={styles.detailValue} style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                            ${Number(dynPrices.valorTotal).toLocaleString('es-ES')}
                          </span>
                        </div>

                        {Boolean(selectedTurno.descuentoTipo && selectedTurno.descuentoTipo !== 'NINGUNO' && selectedTurno.descuentoTipo !== 'SIN_DESCUENTO' && (dynPrices.bonificacion > 0 || (selectedTurno.bonificacion && selectedTurno.bonificacion > 0))) && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Valor Original (Sin Descuento)</span>
                            <span className={styles.detailValue} style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.3rem', textDecoration: 'line-through' }}>
                              ${Number(dynPrices.valorOriginal).toLocaleString('es-ES')}
                            </span>
                          </div>
                        )}
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Seña Cobrada</span>
                          <span className={styles.detailValue} style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2e7d32', marginTop: '0.3rem' }}>
                            ${Number(selectedTurno.valorSeña || 0).toLocaleString('es-ES')}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Saldo Pendiente en Local</span>
                          <span className={styles.detailValue} style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-gold)', marginTop: '0.3rem' }}>
                            ${(Math.max(0, Number(dynPrices.valorTotal || 0) - Number(selectedTurno.valorSeña || 0))).toLocaleString('es-ES')}
                          </span>
                        </div>
                        {Boolean(selectedTurno.descuentoTipo && selectedTurno.descuentoTipo !== 'NINGUNO' && selectedTurno.descuentoTipo !== 'SIN_DESCUENTO' && (dynPrices.bonificacion > 0 || (selectedTurno.bonificacion && selectedTurno.bonificacion > 0))) && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Descuento Aplicado</span>
                            <span className={styles.detailValue} style={{ color: '#ff5252', fontWeight: 700, marginTop: '0.3rem' }}>
                              -${Number(dynPrices.bonificacion || selectedTurno.bonificacion).toLocaleString('es-ES')} ({selectedTurno.descuentoTipo === 'PORCENTAJE' ? `${selectedTurno.descuentoValor || Math.round((dynPrices.bonificacion / dynPrices.valorOriginal) * 100)}%` : `$${Number(selectedTurno.descuentoValor || dynPrices.bonificacion).toLocaleString('es-ES')}`})
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>WhatsApp</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span className={styles.detailValue}>
                        {selectedTurno.cliente?.whatsapp ? formatDisplayPhone(selectedTurno.cliente.whatsapp) : 'N/A'}
                      </span>
                      {selectedTurno.cliente?.whatsapp && (
                        <button
                          type="button"
                          onClick={() => handleOpenResendWpp(selectedTurno)}
                          title="Reenviar recordatorio o aviso por WhatsApp"
                          style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid #22c55e',
                            color: '#4ade80',
                            borderRadius: '6px',
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📲 Reenviar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span className={styles.detailValue} style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                        {selectedTurno.cliente?.email || 'Sin email'}
                      </span>
                      {selectedTurno.cliente && (
                        <button
                          type="button"
                          onClick={() => handleOpenResendEmail(selectedTurno)}
                          title="Editar correo y reenviar aviso"
                          style={{
                            backgroundColor: 'rgba(212, 165, 77, 0.15)',
                            border: '1px solid var(--color-gold)',
                            color: 'var(--color-gold)',
                            borderRadius: '6px',
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          ✏️ Reenviar
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedTurno.clienteId && (
                    <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                      <span className={styles.detailLabel}>Frecuencia Estimada del Tratamiento (Semanas)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <select
                          value={tempClientFrecuencia}
                          onChange={(e) => setTempClientFrecuencia(Number(e.target.value))}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            flex: 1
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(w => (
                            <option key={w} value={w}>Cada {w} semana{w > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                        {(tempClientFrecuencia !== (selectedTurno.cliente?.frecuencia || 4) || tempClientObservaciones !== (selectedTurno.cliente?.observaciones || '')) && (
                          <button
                            onClick={handleSaveClientObservaciones}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            💾 Guardar Frecuencia
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Observaciones Generales del Cliente</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <textarea
                        value={tempClientObservaciones}
                        onChange={(e) => setTempClientObservaciones(e.target.value)}
                        onBlur={() => handleSaveClientObservaciones(true)}
                        placeholder="Escribe observaciones generales del cliente que se guardarán para todos sus turnos..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>
                      Observaciones del Operador (Potencia, Clínica, Indicaciones)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <textarea
                        value={tempClientNotasGonzalo}
                        onChange={(e) => setTempClientNotasGonzalo(e.target.value)}
                        onBlur={() => handleSaveClientObservaciones(true)}
                        placeholder="Potencia utilizada (J), tolerancia al dolor, zonas sensibles o notas clínicas..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: '1px solid #d4a54d50',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          resize: 'vertical'
                        }}
                      />
                      {(tempClientObservaciones !== (selectedTurno.cliente?.observaciones || '') || 
                        tempClientFrecuencia !== (selectedTurno.cliente?.frecuencia || 4) ||
                        tempClientNotasGonzalo !== (selectedTurno.cliente?.notasGonzalo || '')) && (
                        <button
                          onClick={handleSaveClientObservaciones}
                          className="btn btn-primary"
                          style={{ alignSelf: 'flex-end', fontSize: '0.75rem', padding: '0.35rem 0.85rem', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          💾 Guardar Cambios
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Panel */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', width: '100%', boxSizing: 'border-box' }}>
                  <span className={styles.detailLabel} style={{ display: 'block', marginBottom: '0.5rem' }}>Acciones Rápidas</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
                    {selectedTurno.clienteId && (
                      <>
                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined' && gridBodyRef.current) {
                              sessionStorage.setItem('agenda_scroll_pos', gridBodyRef.current.scrollTop.toString());
                            }
                            const dateStr = selectedDate ? toYYYYMMDD(selectedDate) : '';
                            window.location.href = `/admin/clientes?id=${selectedTurno.clienteId}&from=agenda&date=${dateStr}&view=${viewMode}`;
                          }}
                          className="btn"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#7a1e1e', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}
                        >
                          📁 Ficha Cliente
                        </button>
                        <button
                          onClick={() => handleScheduleNextTurn(selectedTurno)}
                          className="btn"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}
                        >
                          📅 Siguiente Turno
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        const hasDiscount = (selectedTurno.bonificacion || 0) > 0;
                        const { preselectedZoneIds, hasOtros, otrosTexto, otrosPrecio } = extractZoneSelection(selectedTurno.zonas, zones);
                        const dynPrices = getUpdatedTurnoPrices(selectedTurno);
                        const initialObs = (tempClientObservaciones || selectedTurno.cliente?.observaciones || selectedTurno.observaciones || '').trim();
                        const initialNotas = (tempClientNotasGonzalo || selectedTurno.cliente?.notasGonzalo || '').trim();
                        const initialFreq = tempClientFrecuencia || selectedTurno.cliente?.frecuencia || 4;

                        setEditTurno({
                          isInitialEdit: true,
                          initialValorTotal: Number(dynPrices.valorTotal || selectedTurno.valorTotal || 0),
                          initialValorSeña: Number(selectedTurno.valorSeña || 0),
                          initialZoneIds: [...preselectedZoneIds],
                          initialHasOtros: Boolean(hasOtros),
                          initialOtrosTexto: (otrosTexto || '').trim(),
                          initialOtrosPrecio: String(otrosPrecio || ''),
                          initialObservaciones: initialObs,
                          initialNotasGonzalo: initialNotas,
                          initialFrecuencia: initialFreq,
                          fechaStr: typeof selectedTurno.fecha === 'string' ? selectedTurno.fecha.split('T')[0] : toYYYYMMDD(selectedTurno.fecha),
                          horaInicio: selectedTurno.horaInicio,
                          horaFin: selectedTurno.horaFin,
                          estado: selectedTurno.estado,
                          valorTotal: dynPrices.valorTotal,
                          valorSeña: selectedTurno.valorSeña,
                          manualTotalOverride: undefined,
                          manualSeñaOverride: undefined,
                          descuentoTipo: selectedTurno.descuentoTipo || (hasDiscount ? 'PESOS' : 'NINGUNO'),
                          descuentoValor: selectedTurno.descuentoValor !== undefined && selectedTurno.descuentoValor !== null && selectedTurno.descuentoValor !== '' ? selectedTurno.descuentoValor : (hasDiscount ? dynPrices.bonificacion : ''),
                          bonificacion: dynPrices.bonificacion,
                          autoTotal: dynPrices.valorTotal,
                          autoTotalZonas: dynPrices.valorOriginal,
                          autoSeña: selectedTurno.valorSeña,
                          selectedZoneIds: preselectedZoneIds,
                          observaciones: initialObs,
                          notasGonzalo: initialNotas,
                          frecuencia: initialFreq,
                          hasOtros: Boolean(hasOtros),
                          otrosTexto: otrosTexto || '',
                          otrosPrecio: otrosPrecio || ''
                        });
                        setIsEditing(true);
                      }}
                      className="btn"
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#d4a54d', color: '#000', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}
                    >
                      ✏️ Editar Turno
                    </button>
                    {selectedTurno.estado === 'PENDIENTE_AUTORIZACION' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        ✓ Aprobar
                      </button>
                    )}
                    {selectedTurno.estado !== 'REALIZADO' && selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        ✓ Realizado
                      </button>
                    )}
                    {selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO', 'FINALIZADO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#1e40af', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        🏁 Finalizar
                      </button>
                    )}
                    {selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO', 'MANTENIMIENTO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#1565c0', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        🛠️ Mantenimiento
                      </button>
                    )}
                    {selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'REALIZADO', 'VA_A_AVISAR')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#d97706', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        ⏳ Va a Avisar
                      </button>
                    )}
                    {selectedTurno.estado !== 'NO_ASISTIO' && selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'NO_ASISTIO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#ef6c00', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        ❌ No Asistió
                      </button>
                    )}
                    {selectedTurno.estado !== 'CANCELADO' && selectedTurno.estado !== 'BLOQUEADO' && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'CANCELADO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#c62828', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        ✕ Cancelar
                      </button>
                    )}
                    {(selectedTurno.estado === 'CANCELADO' || selectedTurno.estado === 'NO_ASISTIO') && (
                      <button onClick={() => handleUpdateStatus(selectedTurno.id, 'SEÑADO')} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}>
                        🔄 Reactivar
                      </button>
                    )}
                    {selectedTurno.estado !== 'BLOQUEADO' && (
                      <a href={getWhatsAppLink(selectedTurno.cliente?.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#25D366', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box', textDecoration: 'none' }}>
                        💬 WhatsApp
                      </a>
                    )}
                    {selectedTurno.cliente?.whatsapp && (
                      <button
                        type="button"
                        onClick={() => handleOpenResendWpp(selectedTurno)}
                        className="btn"
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}
                      >
                        📲 Reenviar WhatsApp (48hs)
                      </button>
                    )}
                    {selectedTurno.cliente && (
                      <button
                        type="button"
                        onClick={() => handleOpenResendEmail(selectedTurno)}
                        className="btn"
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box' }}
                      >
                        📧 Reenviar Aviso Email
                      </button>
                    )}
                    {selectedTurno.cliente?.email && (
                      <button
                        onClick={() => handleSendReceipt(selectedTurno.id)}
                        disabled={sendingReceipt[selectedTurno.id]}
                        className="btn"
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#5c6bc0', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: '1 1 calc(50% - 0.5rem)', minWidth: 0, boxSizing: 'border-box', opacity: sendingReceipt[selectedTurno.id] ? 0.7 : 1 }}
                      >
                        {sendingReceipt[selectedTurno.id] ? 'Enviando...' : '🧾 Recibo Email'}
                      </button>
                    )}
                    <button onClick={() => handleDeleteTurno(selectedTurno.id)} className="btn" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: '#c62828', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', width: '100%', boxSizing: 'border-box' }}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancelModalTurno && (
        <div className={styles.modalOverlay} style={{ zIndex: 10000 }}>
          <div className={`glass-card premium-border ${styles.modalContent}`} style={{ maxWidth: '480px', width: '100%', boxSizing: 'border-box' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: '#e53935', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <span>✕</span> Cancelar Turno
              </h3>
              <button type="button" onClick={() => setCancelModalTurno(null)} className={styles.closeBtn}>&times;</button>
            </div>

            <div style={{ padding: '0.5rem 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {cancelModalTurno.cliente?.nombreCompleto || cancelModalTurno.nombre || 'Cliente'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  📅 {formatLocalDate(cancelModalTurno.fecha)} — ⏰ {cancelModalTurno.horaInicio} a {cancelModalTurno.horaFin} hs
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2e7d32', marginTop: '0.5rem' }}>
                  Seña Abonada: ${Number(cancelModalTurno.valorSeña || 0).toLocaleString('es-ES')}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                ¿Cómo deseas proceder con la seña abonada por el cliente?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="button"
                  disabled={isCanceling}
                  onClick={() => executeCancelTurno(cancelModalTurno.id, true)}
                  className="btn"
                  style={{
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    border: '1px solid #2e7d32',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.25rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    🟢 Conservar Seña a Favor del Cliente
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
                    Excepción: la seña de ${Number(cancelModalTurno.valorSeña || 0).toLocaleString('es-ES')} queda guardada en su ficha para su próxima sesión.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isCanceling}
                  onClick={() => executeCancelTurno(cancelModalTurno.id, false)}
                  className="btn"
                  style={{
                    backgroundColor: '#b71c1c',
                    color: '#ffffff',
                    border: '1px solid #c62828',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.25rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    🔴 Retener Seña (Sin Reembolso)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
                    Cancelación habitual: la seña se retiene para cubrir el costo de reserva según las políticas.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isCanceling}
                  onClick={() => setCancelModalTurno(null)}
                  className="btn"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginTop: '0.25rem'
                  }}
                >
                  Volver sin Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: New Manual Turno */}
      {isNewOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseNewModal}>
          <div className={`glass-card premium-border ${styles.modalContent}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '100%', boxSizing: 'border-box' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>Agendar Nuevo Turno</h3>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCloseNewModal(); }} className={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleCreateTurno}>
              <div className={styles.detailGrid}>
                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1', position: 'relative' }}>
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
                                targetDateStr = toYYYYMMDD(lastDate);
                              }

                              const fullName = client.nombreCompleto || '';
                              let nombreVal = fullName;
                              let apellidoVal = '';
                              const lastSpaceIdx = fullName.lastIndexOf(' ');
                              if (lastSpaceIdx !== -1) {
                                nombreVal = fullName.substring(0, lastSpaceIdx);
                                apellidoVal = fullName.substring(lastSpaceIdx + 1);
                              }

                              const lastTurno = client.turnos && client.turnos.length > 0 ? client.turnos[0] : null;
                              const clientLastSeña = lastTurno && lastTurno.valorSeña !== undefined ? Number(lastTurno.valorSeña) : undefined;
                              const { countryCode, number, customCode } = parsePhoneCountryAndNumber(client.whatsapp);

                              setNewTurno(prev => ({
                                ...prev,
                                nombreCompleto: fullName,
                                nombre: nombreVal,
                                apellido: apellidoVal,
                                whatsapp: number,
                                whatsappCountry: countryCode,
                                whatsappCustomCode: customCode,
                                email: client.email,
                                dni: client.dni || '',
                                clienteId: client.id,
                                fechaStr: targetDateStr,
                                ...(clientLastSeña !== undefined ? { valorSeña: clientLastSeña, manualSeñaOverride: clientLastSeña } : {})
                              }));
                              
                              if (isNextScheduling && targetDateStr) {
                                setSelectedDate(new Date(targetDateStr + 'T00:00:00'));
                              }
                              
                              setShowAutocomplete(false);
                            }}
                          >
                            <span>{client.nombreCompleto}</span>
                             <span style={{ fontSize: '0.75rem', color: '#d4a54d' }}>{formatDisplayPhone(client.whatsapp)}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
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

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.inputLabel}>DNI del Cliente (Opcional)</label>
                  <input
                    type="text"
                    value={newTurno.dni}
                    onChange={(e) => setNewTurno({ ...newTurno, dni: e.target.value })}
                    placeholder="Ej. 12345678"
                  />
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.inputLabel}>WhatsApp *</label>
                  <PhoneInput
                    countryCode={newTurno.whatsappCountry || '54'}
                    onCountryChange={(code) => setNewTurno({ ...newTurno, whatsappCountry: code })}
                    customCode={newTurno.whatsappCustomCode || ''}
                    onCustomCodeChange={(code) => setNewTurno({ ...newTurno, whatsappCustomCode: code })}
                    phoneNumber={newTurno.whatsapp || ''}
                    onPhoneChange={(num) => setNewTurno({ ...newTurno, whatsapp: num })}
                    required
                  />
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.inputLabel}>Email *</label>
                  <input
                    type="email"
                    value={newTurno.email}
                    onChange={(e) => setNewTurno({ ...newTurno, email: e.target.value })}
                    required
                    placeholder="Ej. cliente@correo.com"
                  />
                </div>

                {/* Date on full row */}
                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.inputLabel}>Fecha *</label>
                  <input
                    type="date"
                    value={newTurno.fechaStr}
                    onChange={(e) => setNewTurno({ ...newTurno, fechaStr: e.target.value })}
                    required
                  />
                </div>

                {/* Hora Inicio and Hora Fin side-by-side */}
                <div className={styles.inputRow} style={{ gridColumn: '1 / -1' }}>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.inputLabel}>Hora Inicio *</label>
                    <input
                      type="time"
                      value={newTurno.horaInicio}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const oldStart = newTurno.horaInicio;
                        const oldEnd = newTurno.horaFin;
                        let duration = timeToMinutes(oldEnd) - timeToMinutes(oldStart);
                        if (isNaN(duration) || duration <= 0) {
                          duration = 30; // fallback
                        }
                        const newEnd = addMinutesToTime(newStart, duration);
                        setNewTurno(prev => ({
                          ...prev,
                          horaInicio: newStart,
                          horaFin: newEnd,
                          autoHoraFin: newEnd
                        }));
                      }}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.inputLabel}>Hora Fin (Calculado)</label>
                    <input
                      type="time"
                      value={newTurno.horaFin}
                      onChange={(e) => setNewTurno({ ...newTurno, horaFin: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Zones Checkboxes */}
                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.inputLabel}>Seleccionar Zonas *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', opacity: newTurno.estado === 'BLOQUEADO' ? 0.5 : 1, pointerEvents: newTurno.estado === 'BLOQUEADO' ? 'none' : 'auto' }}>
                    {zones.map(z => {
                      const isChecked = (newTurno.selectedZoneIds || []).some(id => String(id) === String(z.id));
                      return (
                        <div key={z.id} onClick={() => toggleNewTurnoZone(z.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={isChecked} readOnly style={{ width: 'auto' }} />
                          <span>{z.nombre}</span>
                        </div>
                      );
                    })}
                    {/* OTROS Checkbox */}
                    <div onClick={() => setNewTurno(prev => ({ ...prev, manualTotalOverride: undefined, hasOtros: !prev.hasOtros }))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={newTurno.hasOtros || false} readOnly style={{ width: 'auto' }} />
                      <span style={{ fontWeight: 'bold' }}>Otros</span>
                    </div>
                  </div>
                </div>

                {newTurno.hasOtros && (
                  <div className={styles.inputRow} style={{ gridColumn: '1 / -1', marginTop: '-0.25rem' }}>
                    <div className={styles.inputGroup} style={{ flex: 2 }}>
                      <label className={styles.inputLabel}>Escribir Zona Extra (Otros) *</label>
                      <input
                        type="text"
                        placeholder="Ej: Cintura, Nuca o zonas combinadas"
                        value={newTurno.otrosTexto || ''}
                        onChange={(e) => setNewTurno({ ...newTurno, otrosTexto: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Valor Zonas Extras ($)</label>
                      <input
                        type="number"
                        placeholder="Ej. 15000"
                        value={newTurno.otrosPrecio ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTurno(prev => ({
                            ...prev,
                            otrosPrecio: val,
                            manualTotalOverride: undefined
                          }));
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Total de Venta and Seña Recibida */}
                {newTurno.hasOtros ? (
                  <div className={styles.inputRow} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Zonas Normales ($)</label>
                      <input
                        type="text"
                        value={`$${Number(newTurno.autoTotalZonas || 0).toLocaleString('es-ES')}`}
                        disabled
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 600 }}
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Total Turno Base ($)</label>
                      <input
                        type="number"
                        value={newTurno.valorTotal ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTurno(prev => ({
                            ...prev,
                            valorTotal: val,
                            manualTotalOverride: val
                          }));
                        }}
                        required
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Seña Recibida ($)</label>
                      <input
                        type="number"
                        value={newTurno.valorSeña ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTurno(prev => ({
                            ...prev,
                            valorSeña: val,
                            manualSeñaOverride: val
                          }));
                        }}
                        required
                        placeholder="Auto-calculado al elegir zona"
                      />
                    </div>
                  </div>
                ) : (
                  <div className={styles.inputRow} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Total de Venta ($)</label>
                      <input
                        type="number"
                        value={newTurno.valorTotal ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTurno(prev => ({
                            ...prev,
                            valorTotal: val,
                            manualTotalOverride: val
                          }));
                        }}
                        required
                        placeholder="Auto-calculado al elegir zona"
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.inputLabel}>Seña Recibida ($)</label>
                      <input
                        type="number"
                        value={newTurno.valorSeña ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTurno(prev => ({
                            ...prev,
                            valorSeña: val,
                            manualSeñaOverride: val
                          }));
                        }}
                        required
                        placeholder="Auto-calculado al elegir zona"
                      />
                    </div>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Tipo de Descuento</label>
                  <select
                    value={newTurno.descuentoTipo}
                    onChange={(e) => setNewTurno(prev => ({ ...prev, manualTotalOverride: undefined, descuentoTipo: e.target.value }))}
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
                    onChange={(e) => setNewTurno(prev => ({ ...prev, manualTotalOverride: undefined, descuentoValor: e.target.value }))}
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
                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', gap: '0.25rem', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Base (Zonas):</span>
                      <span style={{ fontWeight: '600' }}>${(newTurno.manualTotalOverride !== undefined && newTurno.manualTotalOverride !== null && newTurno.manualTotalOverride !== '' ? Number(newTurno.manualTotalOverride) : (newTurno.autoTotal || 0)).toLocaleString('es-ES')}</span>
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

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
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
                <div style={{ color: '#b45309', backgroundColor: 'rgba(180, 83, 9, 0.08)', border: '1px solid #d97706', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', width: '100%' }}>
                  {newTurnoWarning}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" onClick={handleCloseNewModal} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={newTurno.estado !== 'BLOQUEADO' && newTurno.selectedZoneIds.length === 0 && !newTurno.hasOtros}>Guardar Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESEND EMAIL NOTICE MODAL */}
      {resendEmailModalTurno && (
        <div className={styles.modalOverlay} style={{ zIndex: 10000 }}>
          <div className={`glass-card premium-border ${styles.modalContent}`} style={{ maxWidth: '520px', width: '100%', boxSizing: 'border-box' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <span>📧</span> Reenviar Aviso por Email
              </h3>
              <button type="button" onClick={() => setResendEmailModalTurno(null)} className={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleSendEmailNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '0.5rem 0 1rem 0' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {resendEmailModalTurno.cliente?.nombreCompleto || 'Cliente'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  📅 {formatLocalDate(resendEmailModalTurno.fecha)} — ⏰ {resendEmailModalTurno.horaInicio} a {resendEmailModalTurno.horaFin} hs
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} style={{ fontWeight: 600 }}>
                  Casilla de Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={resendEmailAddress}
                  onChange={(e) => setResendEmailAddress(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>
                  ℹ️ Si corriges el email aquí, se actualizará automáticamente en la ficha del cliente.
                </small>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} style={{ fontWeight: 600 }}>
                  Tipo de Aviso a Reenviar
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', backgroundColor: resendEmailType === 'RECORDATORIO' ? 'rgba(212, 165, 77, 0.12)' : 'transparent', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid', borderColor: resendEmailType === 'RECORDATORIO' ? 'var(--color-gold)' : 'var(--border-color)' }}>
                    <input
                      type="radio"
                      name="emailType"
                      value="RECORDATORIO"
                      checked={resendEmailType === 'RECORDATORIO'}
                      onChange={(e) => setResendEmailType(e.target.value)}
                    />
                    <span><strong>Recordatorio de Turno</strong> (Plantilla de 7 días con zonas, seña y ubicación)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', backgroundColor: resendEmailType === 'CONFIRMACION' ? 'rgba(212, 165, 77, 0.12)' : 'transparent', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid', borderColor: resendEmailType === 'CONFIRMACION' ? 'var(--color-gold)' : 'var(--border-color)' }}>
                    <input
                      type="radio"
                      name="emailType"
                      value="CONFIRMACION"
                      checked={resendEmailType === 'CONFIRMACION'}
                      onChange={(e) => setResendEmailType(e.target.value)}
                    />
                    <span><strong>Confirmación de Turno</strong> (Aviso inicial de reserva / seña confirmada)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', backgroundColor: resendEmailType === 'RECIBO' ? 'rgba(212, 165, 77, 0.12)' : 'transparent', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid', borderColor: resendEmailType === 'RECIBO' ? 'var(--color-gold)' : 'var(--border-color)' }}>
                    <input
                      type="radio"
                      name="emailType"
                      value="RECIBO"
                      checked={resendEmailType === 'RECIBO'}
                      onChange={(e) => setResendEmailType(e.target.value)}
                    />
                    <span><strong>Comprobante / Recibo de Pago</strong> (Detalle de pago y saldo)</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter} style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setResendEmailModalTurno(null)}
                  className="btn btn-secondary"
                  disabled={sendingEmailNotice}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingEmailNotice}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
                >
                  {sendingEmailNotice ? 'Enviando...' : '🚀 Enviar Correo Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESEND WHATSAPP NOTICE MODAL */}
      {resendWppModalTurno && (
        <div className={styles.modalOverlay} style={{ zIndex: 10000 }}>
          <div className={`glass-card premium-border ${styles.modalContent}`} style={{ maxWidth: '520px', width: '100%', boxSizing: 'border-box' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <span>📲</span> Reenviar Mensaje por WhatsApp
              </h3>
              <button type="button" onClick={() => setResendWppModalTurno(null)} className={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleSendWppNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '0.5rem 0 1rem 0' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {resendWppModalTurno.cliente?.nombreCompleto || 'Cliente'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  📅 {formatLocalDate(resendWppModalTurno.fecha)} — ⏰ {resendWppModalTurno.horaInicio} a {resendWppModalTurno.horaFin} hs
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: wppConnectionStatus === 'CONNECTED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${wppConnectionStatus === 'CONNECTED' ? '#22c55e' : '#ef4444'}`,
                fontSize: '0.82rem'
              }}>
                <span>{wppConnectionStatus === 'CONNECTED' ? '🟢' : '🔴'}</span>
                <span style={{ color: wppConnectionStatus === 'CONNECTED' ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
                  {wppConnectionStatus === 'CONNECTED' 
                    ? 'Servicio de WhatsApp Conectado y Listo' 
                    : 'Servicio de WhatsApp Desconectado (Vincula el QR en Notificaciones)'}
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} style={{ fontWeight: 600 }}>
                  Número de WhatsApp *
                </label>
                <input
                  type="tel"
                  value={resendWppPhone}
                  onChange={(e) => setResendWppPhone(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>
                  ℹ️ Si modificas el número aquí, se actualizará en la ficha del cliente.
                </small>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} style={{ fontWeight: 600 }}>
                  Tipo de Mensaje a Reenviar
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', backgroundColor: resendWppType === 'RECORDATORIO_48H' ? 'rgba(34, 197, 94, 0.12)' : 'transparent', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid', borderColor: resendWppType === 'RECORDATORIO_48H' ? '#22c55e' : 'var(--border-color)' }}>
                    <input
                      type="radio"
                      name="agendaWppType"
                      value="RECORDATORIO_48H"
                      checked={resendWppType === 'RECORDATORIO_48H'}
                      onChange={(e) => setResendWppType(e.target.value)}
                    />
                    <span><strong>Recordatorio de Turno (48 hs)</strong> (Plantilla oficial con día, horario, zonas, seña y ubicación)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', backgroundColor: resendWppType === 'CONFIRMACION' ? 'rgba(34, 197, 94, 0.12)' : 'transparent', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid', borderColor: resendWppType === 'CONFIRMACION' ? '#22c55e' : 'var(--border-color)' }}>
                    <input
                      type="radio"
                      name="agendaWppType"
                      value="CONFIRMACION"
                      checked={resendWppType === 'CONFIRMACION'}
                      onChange={(e) => setResendWppType(e.target.value)}
                    />
                    <span><strong>Confirmación de Turno</strong> (Aviso oficial de confirmación de reserva)</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter} style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setResendWppModalTurno(null)}
                  className="btn btn-secondary"
                  disabled={sendingWppNotice}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={sendingWppNotice || wppConnectionStatus === 'DISCONNECTED'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#16a34a',
                    borderColor: '#16a34a',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: (sendingWppNotice || wppConnectionStatus === 'DISCONNECTED') ? 'not-allowed' : 'pointer',
                    opacity: (sendingWppNotice || wppConnectionStatus === 'DISCONNECTED') ? 0.65 : 1
                  }}
                >
                  {sendingWppNotice ? 'Enviando...' : '📲 Enviar WhatsApp Ahora'}
                </button>
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
