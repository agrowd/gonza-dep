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
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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

  // Servicios State (Fase 2 Multidisciplinaria)
  const [servicios, setServicios] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [isServicioModalOpen, setIsServicioModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState(null);
  const [servicioForm, setServicioForm] = useState({
    nombre: '',
    descripcion: '',
    icono: '⚡',
    orden: 0
  });

  const [zoneForm, setZoneForm] = useState({
    nombre: '',
    precioBase: '',
    duracionMinutos: '',
    señaBase: '',
    servicioId: ''
  });

  // Configurations State
  const [configs, setConfigs] = useState({
    wtsp_reminder_template: '',
    wtsp_confirmation_template: '',
    address: '',
    work_start: '12:30',
    work_end: '22:00',
    booking_work_start: '14:00',
    booking_work_end: '22:00',
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
    email_reminder_7days_body: '',
    wtsp_va_a_avisar_template: '',
    wtsp_mantenimiento_template: '',
    email_va_a_avisar_subject: '',
    email_va_a_avisar_body: '',
    wtsp_birthday_template: '',
    email_birthday_subject: '',
    email_birthday_body: '',
    seña_retencion_horas: '72',
    recordatorio_horas: '48',
    mensaje_previo_dias: '7',
    duracion_formula: 'ZONA_MAX_MAS_TERCIO',
    canales_adquisicion: JSON.stringify(["ORGANICO", "RECOMENDADO", "GOOGLE", "INSTAGRAM", "CAMPANAS", "WEB", "MANUAL"])
  });
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [savingConfigs, setSavingConfigs] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');

  // Promociones State
  const [promociones, setPromociones] = useState([]);
  const [loadingPromociones, setLoadingPromociones] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    nombre: '',
    zonas: [],
    descuentoTipo: 'PORCENTAJE',
    descuentoValor: '',
    fechaInicio: '',
    fechaFin: '',
    activo: true
  });

  // Cupones State
  const [cupones, setCupones] = useState([]);
  const [loadingCupones, setLoadingCupones] = useState(false);
  const [isCuponModalOpen, setIsCuponModalOpen] = useState(false);
  const [editingCupon, setEditingCupon] = useState(null);
  const [cuponForm, setCuponForm] = useState({
    codigo: '',
    descuentoTipo: 'PORCENTAJE',
    descuentoValor: '',
    usosPermitidos: 1,
    fechaVencimiento: '',
    activo: true
  });

  // Users / Operators State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nombre: '',
    usuario: '',
    password: '',
    rol: 'OPERADOR',
    email: '',
    telefono: '',
    direccion: '',
    horaInicio: '14:00',
    horaFin: '22:00',
    diasLaborales: '1,2,3,4,5',
    serviciosIds: '[]',
    activo: true,
    fechaNacimiento: '',
    vacacionesInicio: '',
    vacacionesFin: '',
    comisionTipo: 'POR_HORA',
    comisionValor: ''
  });

  // Feriados y Bloqueos State (D-133)
  const currentYear = new Date().getFullYear();
  const [selectedFeriadosYear, setSelectedFeriadosYear] = useState(currentYear);
  const [feriados, setFeriados] = useState([]);
  const [feriadoFilterTipo, setFeriadoFilterTipo] = useState('ALL');
  const [loadingFeriados, setLoadingFeriados] = useState(false);
  const [feriadoForm, setFeriadoForm] = useState({
    fechaStr: new Date().toISOString().split('T')[0],
    tipo: 'FIJO', // 'FIJO', 'MOVIL', 'UNICO'
    color: '#dc2626',
    motivo: '',
    esDiaCompleto: true,
    horaInicio: '10:00',
    horaFin: '20:00'
  });
  const [moveModal, setMoveModal] = useState({
    isOpen: false,
    feriado: null,
    nuevaFechaStr: ''
  });

  // Boxes State & Handlers (Fase 3)
  const [boxes, setBoxes] = useState([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [boxForm, setBoxForm] = useState({
    nombre: '',
    descripcion: '',
    color: '#7a1f1e',
    horaInicio: '14:00',
    horaFin: '22:00',
    diasAtencion: '1,2,3,4,5',
    servicioId: '',
    activo: true
  });

  const fetchBoxes = () => {
    setLoadingBoxes(true);
    fetch('/api/admin/boxes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBoxes(data);
      })
      .catch(err => console.error('Error fetching boxes:', err))
      .finally(() => setLoadingBoxes(false));
  };

  const handleOpenNewBox = () => {
    setEditingBox(null);
    setBoxForm({
      nombre: '',
      descripcion: '',
      color: '#7a1f1e',
      horaInicio: '14:00',
      horaFin: '22:00',
      diasAtencion: '1,2,3,4,5',
      servicioId: '',
      activo: true
    });
    setIsBoxModalOpen(true);
  };

  const handleOpenEditBox = (b) => {
    setEditingBox(b);
    setBoxForm({
      nombre: b.nombre || '',
      descripcion: b.descripcion || '',
      color: b.color || '#7a1f1e',
      horaInicio: b.horaInicio || '14:00',
      horaFin: b.horaFin || '22:00',
      diasAtencion: b.diasAtencion || '1,2,3,4,5',
      servicioId: b.servicioId || '',
      activo: b.activo !== false
    });
    setIsBoxModalOpen(true);
  };

  const handleSaveBox = async (e) => {
    e.preventDefault();
    if (!boxForm.nombre.trim()) {
      showToast('El nombre del box es requerido', 'error');
      return;
    }
    try {
      const url = editingBox ? `/api/admin/boxes/${editingBox.id}` : '/api/admin/boxes';
      const method = editingBox ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boxForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar box');
      showToast(editingBox ? 'Box actualizado con éxito' : 'Box creado con éxito');
      setIsBoxModalOpen(false);
      fetchBoxes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteBox = async (b) => {
    if (b.esPrincipal) {
      showToast('El Box Principal no puede ser eliminado', 'error');
      return;
    }
    if (!confirm(`¿Eliminar el box "${b.nombre}"? Sus turnos asignados se reasignarán automáticamente al Box Principal.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/boxes/${b.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar box');
      showToast('Box eliminado correctamente');
      fetchBoxes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatBoxDays = (diasStr) => {
    if (!diasStr) return 'Lunes a Viernes';
    const dayMap = {
      '1': 'Lun',
      '2': 'Mar',
      '3': 'Mié',
      '4': 'Jue',
      '5': 'Vie',
      '6': 'Sáb',
      '0': 'Dom',
      '7': 'Dom'
    };
    const parts = diasStr.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 5 && ['1','2','3','4','5'].every(d => parts.includes(d))) {
      return 'Lunes a Viernes';
    }
    if (parts.length === 7) {
      return 'Toda la semana (Lun a Dom)';
    }
    return parts.map(p => dayMap[p] || p).join(', ');
  };

  // Helpers de Fechas Seguras para Feriados (inmunes a desfasajes de zona horaria)
  const formatFeriadoDate = (dateVal) => {
    if (!dateVal) return '-';
    if (typeof dateVal === 'string' && dateVal.includes('-')) {
      const parts = dateVal.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getFeriadoDayName = (dateVal) => {
    if (!dateVal) return '';
    let d;
    if (typeof dateVal === 'string' && dateVal.includes('-')) {
      const parts = dateVal.split('T')[0].split('-');
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[d.getDay()];
  };

  // Fetch Feriados
  const fetchFeriados = (year = selectedFeriadosYear) => {
    setLoadingFeriados(true);
    fetch(`/api/admin/bloqueos?ano=${year}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFeriados(data);
        }
      })
      .catch(err => console.error('Error fetching feriados:', err))
      .finally(() => setLoadingFeriados(false));
  };

  const handleCreateFeriado = async (e) => {
    e.preventDefault();
    if (!feriadoForm.fechaStr) {
      showToast('Selecciona una fecha para el bloqueo', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/bloqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feriadoForm)
      });
      if (res.ok) {
        showToast('Feriado o bloqueo registrado con éxito');
        setFeriadoForm(prev => ({
          ...prev,
          motivo: '',
          esDiaCompleto: true
        }));
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al guardar bloqueo', 'error');
      }
    } catch (err) {
      console.error('Error creating feriado:', err);
      showToast('Error de red al crear bloqueo', 'error');
    }
  };

  const handleDeleteFeriado = async (id, isSynthesized, originalId) => {
    const targetId = originalId || id;
    if (!confirm('¿Seguro de que deseas eliminar este feriado o bloqueo de la agenda?')) return;
    try {
      const res = await fetch(`/api/admin/bloqueos/${targetId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Feriado o bloqueo eliminado correctamente');
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al eliminar bloqueo', 'error');
      }
    } catch (err) {
      console.error('Error deleting feriado:', err);
      showToast('Error de red al eliminar bloqueo', 'error');
    }
  };

  const handleOpenMoveModal = (feriado) => {
    const origDateStr = feriado.fecha ? (typeof feriado.fecha === 'string' ? feriado.fecha.split('T')[0] : new Date(feriado.fecha).toISOString().split('T')[0]) : '';
    const movedDateStr = feriado.fechaMovida ? (typeof feriado.fechaMovida === 'string' ? feriado.fechaMovida.split('T')[0] : new Date(feriado.fechaMovida).toISOString().split('T')[0]) : origDateStr;
    setMoveModal({
      isOpen: true,
      feriado,
      nuevaFechaStr: movedDateStr
    });
  };

  const handleSaveMoveFeriado = async () => {
    if (!moveModal.feriado || !moveModal.nuevaFechaStr) return;
    try {
      const targetId = moveModal.feriado.originalId || moveModal.feriado.id;
      const res = await fetch(`/api/admin/bloqueos/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaMovidaStr: moveModal.nuevaFechaStr,
          originalId: targetId
        })
      });
      if (res.ok) {
        showToast('Fecha de feriado móvil reubicada exitosamente');
        setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' });
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al reubicar fecha', 'error');
      }
    } catch (err) {
      console.error('Error moving feriado:', err);
      showToast('Error de red al mover feriado', 'error');
    }
  };

  const handleResetMoveFeriado = async (feriado) => {
    if (!confirm('¿Restaurar la fecha original de este feriado móvil?')) return;
    try {
      const targetId = feriado.originalId || feriado.id;
      const res = await fetch(`/api/admin/bloqueos/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaMovidaStr: '',
          originalId: targetId
        })
      });
      if (res.ok) {
        showToast('Feriado restaurado a su fecha original');
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al restaurar fecha', 'error');
      }
    } catch (err) {
      console.error('Error resetting feriado:', err);
      showToast('Error de red al restaurar fecha', 'error');
    }
  };

  // 0. Fetch Servicios (Fase 2)
  const fetchServicios = () => {
    setLoadingServicios(true);
    fetch('/api/admin/servicios')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setServicios(data);
        }
      })
      .catch(err => console.error('Error fetching servicios:', err))
      .finally(() => setLoadingServicios(false));
  };

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
            work_start: data.work_start || '12:30',
            work_end: data.work_end || '22:00',
            booking_work_start: data.booking_work_start || '14:00',
            booking_work_end: data.booking_work_end || '22:00',
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
            email_reminder_7days_body: data.email_reminder_7days_body || '',
            wtsp_va_a_avisar_template: data.wtsp_va_a_avisar_template || '',
            wtsp_mantenimiento_template: data.wtsp_mantenimiento_template || '',
            email_va_a_avisar_subject: data.email_va_a_avisar_subject || '',
            email_va_a_avisar_body: data.email_va_a_avisar_body || '',
            wtsp_birthday_template: data.wtsp_birthday_template || '',
            email_birthday_subject: data.email_birthday_subject || '',
            email_birthday_body: data.email_birthday_body || '',
            seña_retencion_horas: data.seña_retencion_horas || '72',
            recordatorio_horas: data.recordatorio_horas || '48',
            mensaje_previo_dias: data.mensaje_previo_dias || '7',
            duracion_formula: data.duracion_formula || 'ZONA_MAX_MAS_TERCIO',
            canales_adquisicion: data.canales_adquisicion || JSON.stringify(["ORGANICO", "RECOMENDADO", "GOOGLE", "INSTAGRAM", "CAMPANAS", "WEB", "MANUAL"])
          });
        }
      })
      .catch(err => console.error('Error fetching configs:', err))
      .finally(() => setLoadingConfigs(false));
  };

  // 3. Fetch Promociones
  const fetchPromociones = () => {
    setLoadingPromociones(true);
    fetch('/api/admin/promociones')
      .then(res => res.json())
      .then(data => {
        if (data.promociones) setPromociones(data.promociones);
      })
      .catch(err => console.error('Error fetching promociones:', err))
      .finally(() => setLoadingPromociones(false));
  };

  // 4. Fetch Cupones
  const fetchCupones = () => {
    setLoadingCupones(true);
    fetch('/api/admin/cupones')
      .then(res => res.json())
      .then(data => {
        if (data.cupones) setCupones(data.cupones);
      })
      .catch(err => console.error('Error fetching cupones:', err))
      .finally(() => setLoadingCupones(false));
  };

  // 5. Fetch Users / Operators
  const fetchUsers = () => {
    setLoadingUsers(true);
    fetch('/api/admin/usuarios')
      .then(res => res.json())
      .then(data => {
        if (data.usuarios) setUsers(data.usuarios);
      })
      .catch(err => console.error('Error fetching users:', err))
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    fetchServicios();
    fetchZones();
    fetchConfigs();
    fetchPromociones();
    fetchCupones();
    fetchUsers();
    fetchFeriados();
    fetchBoxes();
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

  // 4. CRUD Servicios (Fase 2 Multidisciplinaria)
  const handleOpenNewServicio = () => {
    setEditingServicio(null);
    setServicioForm({
      nombre: '',
      descripcion: '',
      icono: '💆‍♂️',
      orden: (servicios.length + 1) * 10
    });
    setIsServicioModalOpen(true);
  };

  const handleOpenEditServicio = (serv) => {
    setEditingServicio(serv);
    setServicioForm({
      nombre: serv.nombre,
      descripcion: serv.descripcion || '',
      icono: serv.icono || '⚡',
      orden: serv.orden || 0
    });
    setIsServicioModalOpen(true);
  };

  const handleSaveServicio = async (e) => {
    e.preventDefault();
    if (!servicioForm.nombre.trim()) {
      showToast('Ingresa el nombre del servicio.', 'error');
      return;
    }
    try {
      const url = editingServicio ? `/api/admin/servicios/${editingServicio.id}` : '/api/admin/servicios';
      const method = editingServicio ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingServicio ? 'Servicio actualizado correctamente.' : 'Nuevo servicio agregado con éxito.');
        setIsServicioModalOpen(false);
        fetchServicios();
        fetchZones();
      } else {
        showToast(data.error || 'Error al guardar el servicio.', 'error');
      }
    } catch (err) {
      console.error('Error saving servicio:', err);
      showToast('Error de red al guardar el servicio.', 'error');
    }
  };

  const handleDeleteServicio = async (serv) => {
    if (serv.nombre.toLowerCase().includes('depilaci')) {
      showToast('No se puede eliminar el servicio base de Depilación Láser.', 'error');
      return;
    }
    if (!confirm(`¿Estás seguro de que deseas eliminar el servicio "${serv.nombre}"? Sus zonas pasarán a Depilación Láser.`)) return;
    try {
      const res = await fetch(`/api/admin/servicios/${serv.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Servicio eliminado correctamente.');
        fetchServicios();
        fetchZones();
      } else {
        showToast(data.error || 'Error al eliminar servicio.', 'error');
      }
    } catch (err) {
      console.error('Error deleting servicio:', err);
      showToast('Error de red al eliminar servicio.', 'error');
    }
  };

  // 5. CRUD Zone: Open creation modal
  const handleOpenNewZone = (targetServicioId = null) => {
    setEditingZone(null);
    setZoneForm({
      nombre: '',
      precioBase: '',
      duracionMinutos: '',
      señaBase: '',
      servicioId: targetServicioId || (servicios[0]?.id || '')
    });
    setIsZoneModalOpen(true);
  };

  // 5.1 CRUD Zone: Open inline edit row
  const handleOpenEditZone = (zone) => {
    setEditingZoneId(zone.id);
    setZoneForm({
      nombre: zone.nombre,
      precioBase: zone.precioBase,
      duracionMinutos: zone.duracionMinutos,
      señaBase: zone.señaBase,
      servicioId: zone.servicioId || (servicios[0]?.id || '')
    });
  };

  // 5.2 CRUD Zone: Submit inline edit
  const handleSaveInlineZone = async (e, zoneId) => {
    e.preventDefault();
    if (!zoneForm.nombre || !zoneForm.duracionMinutos) {
      showToast('Por favor, completa todos los campos requeridos.', 'error');
      return;
    }

    try {
      const calculatedSena = Math.round(Number(zoneForm.precioBase || 0) * 0.5);
      const res = await fetch(`/api/zonas/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: zoneForm.nombre,
          precioBase: Number(zoneForm.precioBase || 0),
          duracionMinutos: Number(zoneForm.duracionMinutos),
          señaBase: calculatedSena,
          servicioId: zoneForm.servicioId || undefined
        })
      });

      if (res.ok) {
        setEditingZoneId(null);
        showToast('Zona modificada correctamente.');
        fetchZones();
        fetchServicios();
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
    if (!zoneForm.nombre || !zoneForm.duracionMinutos) {
      showToast('Por favor, completa todos los campos requeridos.', 'error');
      return;
    }

    try {
      const calculatedSena = Math.round(Number(zoneForm.precioBase || 0) * 0.5);
      const url = editingZone ? `/api/zonas/${editingZone.id}` : '/api/zonas';
      const method = editingZone ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: zoneForm.nombre,
          precioBase: Number(zoneForm.precioBase || 0),
          duracionMinutos: Number(zoneForm.duracionMinutos),
          señaBase: calculatedSena,
          servicioId: zoneForm.servicioId || null
        })
      });

      if (res.ok) {
        setIsZoneModalOpen(false);
        showToast(editingZone ? 'Zona modificada con éxito.' : 'Nueva zona agregada con éxito.');
        fetchZones();
        fetchServicios();
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
        fetchServicios();
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

  // --- PROMOCIONES HANDLERS ---
  const handleOpenNewPromo = () => {
    setEditingPromo(null);
    setPromoForm({
      nombre: '',
      zonas: [],
      descuentoTipo: 'PORCENTAJE',
      descuentoValor: '',
      fechaInicio: '',
      fechaFin: '',
      activo: true
    });
    setIsPromoModalOpen(true);
  };

  const handleOpenEditPromo = (promo) => {
    setEditingPromo(promo);
    let parsedZonas = [];
    try {
      parsedZonas = typeof promo.zonas === 'string' ? JSON.parse(promo.zonas) : (promo.zonas || []);
    } catch {
      parsedZonas = [];
    }
    setPromoForm({
      nombre: promo.nombre || '',
      zonas: parsedZonas,
      descuentoTipo: promo.descuentoTipo || 'PORCENTAJE',
      descuentoValor: promo.descuentoValor !== undefined ? promo.descuentoValor : '',
      fechaInicio: promo.fechaInicio ? promo.fechaInicio.slice(0, 10) : '',
      fechaFin: promo.fechaFin ? promo.fechaFin.slice(0, 10) : '',
      activo: promo.activo !== undefined ? promo.activo : true
    });
    setIsPromoModalOpen(true);
  };

  const togglePromoZone = (zoneName) => {
    setPromoForm(prev => {
      const exists = prev.zonas.includes(zoneName);
      return {
        ...prev,
        zonas: exists ? prev.zonas.filter(z => z !== zoneName) : [...prev.zonas, zoneName]
      };
    });
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    if (!promoForm.nombre.trim()) {
      showToast('Ingresa un nombre para la promoción.', 'error');
      return;
    }
    if (promoForm.zonas.length === 0) {
      showToast('Selecciona al menos una zona para la promoción.', 'error');
      return;
    }
    if (!promoForm.descuentoValor || Number(promoForm.descuentoValor) <= 0) {
      showToast('Ingresa un descuento válido mayor a 0.', 'error');
      return;
    }

    try {
      const url = editingPromo ? `/api/admin/promociones/${editingPromo.id}` : '/api/admin/promociones';
      const method = editingPromo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingPromo ? 'Promoción modificada con éxito.' : 'Promoción creada con éxito.');
        setIsPromoModalOpen(false);
        fetchPromociones();
      } else {
        showToast(data.error || 'Error al guardar la promoción.', 'error');
      }
    } catch (err) {
      console.error('Error saving promo:', err);
      showToast('Error de conexión al guardar promoción.', 'error');
    }
  };

  const handleTogglePromoActivo = async (promo) => {
    try {
      const res = await fetch(`/api/admin/promociones/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !promo.activo })
      });
      if (res.ok) {
        showToast(`Promoción ${!promo.activo ? 'activada' : 'pausada'}.`);
        fetchPromociones();
      } else {
        showToast('Error al cambiar estado.', 'error');
      }
    } catch {
      showToast('Error de red al actualizar estado.', 'error');
    }
  };

  const handleDeletePromo = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta promoción?')) return;
    try {
      const res = await fetch(`/api/admin/promociones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Promoción eliminada con éxito.');
        fetchPromociones();
      } else {
        showToast('Error al eliminar promoción.', 'error');
      }
    } catch {
      showToast('Error al eliminar promoción.', 'error');
    }
  };

  // --- CUPONES HANDLERS ---
  const handleOpenNewCupon = () => {
    setEditingCupon(null);
    setCuponForm({
      codigo: '',
      descuentoTipo: 'PORCENTAJE',
      descuentoValor: '',
      usosPermitidos: 1,
      fechaVencimiento: '',
      activo: true
    });
    setIsCuponModalOpen(true);
  };

  const handleOpenEditCupon = (cupon) => {
    setEditingCupon(cupon);
    setCuponForm({
      codigo: cupon.codigo || '',
      descuentoTipo: cupon.descuentoTipo || 'PORCENTAJE',
      descuentoValor: cupon.descuentoValor !== undefined ? cupon.descuentoValor : '',
      usosPermitidos: cupon.usosPermitidos !== undefined ? cupon.usosPermitidos : 1,
      fechaVencimiento: cupon.fechaVencimiento ? cupon.fechaVencimiento.slice(0, 10) : '',
      activo: cupon.activo !== undefined ? cupon.activo : true
    });
    setIsCuponModalOpen(true);
  };

  const handleSaveCupon = async (e) => {
    e.preventDefault();
    if (!cuponForm.codigo.trim()) {
      showToast('Ingresa un código de cupón.', 'error');
      return;
    }
    if (!cuponForm.descuentoValor || Number(cuponForm.descuentoValor) <= 0) {
      showToast('Ingresa un descuento válido mayor a 0.', 'error');
      return;
    }

    try {
      const url = editingCupon ? `/api/admin/cupones/${editingCupon.id}` : '/api/admin/cupones';
      const method = editingCupon ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuponForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingCupon ? 'Cupón modificado con éxito.' : 'Cupón creado con éxito.');
        setIsCuponModalOpen(false);
        fetchCupones();
      } else {
        showToast(data.error || 'Error al guardar cupón.', 'error');
      }
    } catch (err) {
      console.error('Error saving cupon:', err);
      showToast('Error de conexión al guardar cupón.', 'error');
    }
  };

  const handleToggleCuponActivo = async (cupon) => {
    try {
      const res = await fetch(`/api/admin/cupones/${cupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !cupon.activo })
      });
      if (res.ok) {
        showToast(`Cupón ${!cupon.activo ? 'activado' : 'pausado'}.`);
        fetchCupones();
      } else {
        showToast('Error al cambiar estado.', 'error');
      }
    } catch {
      showToast('Error de red al actualizar estado.', 'error');
    }
  };

  const handleDeleteCupon = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cupón?')) return;
    try {
      const res = await fetch(`/api/admin/cupones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Cupón eliminado con éxito.');
        fetchCupones();
      } else {
        showToast('Error al eliminar cupón.', 'error');
      }
    } catch {
      showToast('Error al eliminar cupón.', 'error');
    }
  };

  // --- PARAMETERS HANDLERS ---
  const getParsedCanales = () => {
    try {
      const arr = JSON.parse(configs.canales_adquisicion || '[]');
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      // fallback
    }
    return ["ORGANICO", "RECOMENDADO", "GOOGLE", "INSTAGRAM", "CAMPANAS", "WEB", "MANUAL"];
  };

  const handleAddChannel = () => {
    if (!newChannelInput.trim()) return;
    const clean = newChannelInput.trim().toUpperCase().replace(/\s+/g, '_');
    const current = getParsedCanales();
    if (current.includes(clean)) {
      showToast('Ese canal ya está agregado en la lista.', 'error');
      return;
    }
    const updated = [...current, clean];
    setConfigs(prev => ({ ...prev, canales_adquisicion: JSON.stringify(updated) }));
    setNewChannelInput('');
  };

  const handleRemoveChannel = (channelToRemove) => {
    const current = getParsedCanales();
    const updated = current.filter(c => c !== channelToRemove);
    setConfigs(prev => ({ ...prev, canales_adquisicion: JSON.stringify(updated) }));
  };

  // --- USUARIOS Y OPERADORES HANDLERS ---
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({
      nombre: '',
      usuario: '',
      password: '',
      rol: 'OPERADOR',
      email: '',
      telefono: '',
      direccion: '',
      horaInicio: '14:00',
      horaFin: '22:00',
      diasLaborales: '1,2,3,4,5',
      serviciosIds: '[]',
      activo: true,
      fechaNacimiento: '',
      vacacionesInicio: '',
      vacacionesFin: '',
      comisionTipo: 'POR_HORA',
      comisionValor: ''
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      nombre: u.nombre || '',
      usuario: u.usuario || '',
      password: '',
      rol: u.rol || 'OPERADOR',
      email: u.email || '',
      telefono: u.telefono || '',
      direccion: u.direccion || '',
      horaInicio: u.horaInicio || '14:00',
      horaFin: u.horaFin || '22:00',
      diasLaborales: u.diasLaborales || '1,2,3,4,5',
      serviciosIds: u.serviciosIds || '[]',
      activo: u.activo !== false,
      fechaNacimiento: u.fechaNacimiento ? u.fechaNacimiento.slice(0, 10) : '',
      vacacionesInicio: u.vacacionesInicio ? u.vacacionesInicio.slice(0, 10) : '',
      vacacionesFin: u.vacacionesFin ? u.vacacionesFin.slice(0, 10) : '',
      comisionTipo: u.comisionTipo === 'POR_DIA' ? 'POR_HORA' : (u.comisionTipo || 'POR_HORA'),
      comisionValor: u.comisionValor !== undefined && u.comisionValor !== null ? u.comisionValor : ''
    });
    setIsUserModalOpen(true);
  };

  const handleToggleUserActive = async (u) => {
    const nextActivo = u.activo === false ? true : false;
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nextActivo })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(nextActivo ? `Operador ${u.nombre} reactivado/desbloqueado.` : `Operador ${u.nombre} bloqueado.`);
        fetchUsers();
      } else {
        showToast(data.error || 'Error al cambiar estado del usuario.', 'error');
      }
    } catch {
      showToast('Error de red al actualizar estado.', 'error');
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.nombre.trim()) {
      showToast('Ingresa el nombre del usuario.', 'error');
      return;
    }
    if (!userForm.usuario.trim()) {
      showToast('Ingresa el nombre de usuario.', 'error');
      return;
    }
    if (!editingUser && (!userForm.password || userForm.password.length < 4)) {
      showToast('La contraseña debe tener al menos 4 caracteres.', 'error');
      return;
    }

    try {
      const url = editingUser ? `/api/admin/usuarios/${editingUser.id}` : '/api/admin/usuarios';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingUser ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.');
        setIsUserModalOpen(false);
        fetchUsers();
      } else {
        showToast(data.error || 'Error al guardar usuario.', 'error');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      showToast('Error de red al guardar usuario.', 'error');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar o bloquear al operador/usuario ${u.nombre}?`)) return;
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        if (data.action === 'BLOCKED') {
          showToast(data.message || 'El operador tiene turnos en su historial y fue bloqueado.', 'info');
        } else {
          showToast(data.message || 'Usuario eliminado con éxito.');
        }
        fetchUsers();
      } else {
        showToast(data.error || 'Error al eliminar usuario.', 'error');
      }
    } catch {
      showToast('Error al eliminar usuario.', 'error');
    }
  };


  const renderBloqueosSection = () => (
    <div className={styles.bloqueosSectionCard}>
            <div className={styles.bloqueosTitleRow}>
              <div className={styles.bloqueosSectionTitle}>
                <span>Bloqueos de Agenda y Feriados Anuales</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Año a consultar:</span>
                <select 
                  className={styles.input} 
                  style={{ width: 'auto', padding: '0.4rem 0.8rem', fontWeight: 700 }}
                  value={selectedFeriadosYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    setSelectedFeriadosYear(y);
                    fetchFeriados(y);
                  }}
                >
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.5rem 0 1.25rem 0', lineHeight: '1.5' }}>
              Bloquea días u horarios en la agenda para feriados o eventos festivos. Los feriados <strong>Fijos</strong> se replican automáticamente todos los años. Los feriados <strong>Móviles</strong> permiten reubicar su fecha con anticipación (ej. feriados puente). Los bloqueos <strong>Únicos</strong> aplican solo a esa fecha específica.
            </p>

            {/* Formulario de Alta Rápida */}
            <form onSubmit={handleCreateFeriado} className={styles.bloqueoFormCard}>
              <div className={styles.bloqueoFormTitle}>
                <span>+ Crear Nuevo Bloqueo o Feriado</span>
              </div>

              <div className={styles.bloqueoFormGrid}>
                {/* 1. Tipo de Feriado */}
                <div className={styles.formField}>
                  <label>Tipo de Bloqueo / Feriado *</label>
                  <select
                    className={styles.input}
                    value={feriadoForm.tipo}
                    onChange={(e) => {
                      const t = e.target.value;
                      let defaultC = '#dc2626';
                      if (t === 'MOVIL') defaultC = '#d97706';
                      if (t === 'UNICO') defaultC = '#2563eb';
                      setFeriadoForm(prev => ({
                        ...prev,
                        tipo: t,
                        color: defaultC
                      }));
                    }}
                    required
                  >
                    <option value="FIJO">Fijo (Se repite todos los años, ej: Navidad)</option>
                    <option value="MOVIL">Móvil (Se define o reubica por año, ej: Feriado puente)</option>
                    <option value="UNICO">Único (Aplica solo a este día específico)</option>
                  </select>
                </div>

                {/* 2. Fecha */}
                <div className={styles.formField}>
                  <label>Fecha a Bloquear *</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={feriadoForm.fechaStr}
                    onChange={(e) => setFeriadoForm(prev => ({ ...prev, fechaStr: e.target.value }))}
                    required
                  />
                </div>

                {/* 3. Selector de Color */}
                <div className={styles.formField}>
                  <label>Color Identificador</label>
                  <div className={styles.colorSwatches}>
                    {[
                      { code: '#dc2626', label: 'Rojo Feriado' },
                      { code: '#d97706', label: 'Ámbar Móvil' },
                      { code: '#2563eb', label: 'Azul Único' },
                      { code: '#7c3aed', label: 'Violeta' },
                      { code: '#059669', label: 'Esmeralda' },
                      { code: '#e11d48', label: 'Rosa' }
                    ].map(col => (
                      <button
                        key={col.code}
                        type="button"
                        className={`${styles.colorSwatchBtn} ${feriadoForm.color === col.code ? styles.colorSwatchActive : ''}`}
                        style={{ backgroundColor: col.code }}
                        onClick={() => setFeriadoForm(prev => ({ ...prev, color: col.code }))}
                        title={col.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={feriadoForm.color || '#dc2626'}
                      onChange={(e) => setFeriadoForm(prev => ({ ...prev, color: e.target.value }))}
                      style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                      title="Color personalizado"
                    />
                  </div>
                </div>

                {/* 4. Motivo */}
                <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                  <label>Motivo del Bloqueo *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej: Navidad, Feriado Puente Turístico, Capacitación de Personal"
                    value={feriadoForm.motivo}
                    onChange={(e) => setFeriadoForm(prev => ({ ...prev, motivo: e.target.value }))}
                    required
                  />
                </div>

                {/* 5. Día completo o franja */}
                <div className={styles.formField}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={feriadoForm.esDiaCompleto}
                      onChange={(e) => setFeriadoForm(prev => ({ ...prev, esDiaCompleto: e.target.checked }))}
                    />
                    <span style={{ fontWeight: 600 }}>Día Completo (Bloquea toda la jornada)</span>
                  </label>
                </div>

                {/* 6. Horarios si no es día completo */}
                {!feriadoForm.esDiaCompleto && (
                  <>
                    <div className={styles.formField}>
                      <label>Hora Inicio</label>
                      <input
                        type="time"
                        className={styles.input}
                        value={feriadoForm.horaInicio}
                        onChange={(e) => setFeriadoForm(prev => ({ ...prev, horaInicio: e.target.value }))}
                        required={!feriadoForm.esDiaCompleto}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label>Hora Fin</label>
                      <input
                        type="time"
                        className={styles.input}
                        value={feriadoForm.horaFin}
                        onChange={(e) => setFeriadoForm(prev => ({ ...prev, horaFin: e.target.value }))}
                        required={!feriadoForm.esDiaCompleto}
                      />
                    </div>
                  </>
                )}

                {/* Botón de envío */}
                <div className={styles.formField} style={{ alignSelf: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}>
                    + Crear Feriado / Bloqueo
                  </button>
                </div>
              </div>
            </form>

            {/* Listado de Feriados del Año */}
            <div className={styles.feriadosFilterHeader}>
              <div className={styles.feriadosStats}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>Filtrar bloqueos {selectedFeriadosYear}:</span>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: feriadoFilterTipo === 'ALL' ? '1px solid #7a1f1e' : '1px solid #cbd5e1',
                      backgroundColor: feriadoFilterTipo === 'ALL' ? '#7a1f1e' : '#ffffff',
                      color: feriadoFilterTipo === 'ALL' ? '#ffffff' : '#475569'
                    }}
                    onClick={() => setFeriadoFilterTipo('ALL')}
                  >
                    Todos ({feriados.length})
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: feriadoFilterTipo === 'UNICO' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: feriadoFilterTipo === 'UNICO' ? '#2563eb' : '#ffffff',
                      color: feriadoFilterTipo === 'UNICO' ? '#ffffff' : '#475569'
                    }}
                    onClick={() => setFeriadoFilterTipo('UNICO')}
                  >
                    🔵 Únicos ({feriados.filter(f => f.tipo === 'UNICO' || !f.tipo).length})
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: feriadoFilterTipo === 'FIJO' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: feriadoFilterTipo === 'FIJO' ? '#dc2626' : '#ffffff',
                      color: feriadoFilterTipo === 'FIJO' ? '#ffffff' : '#475569'
                    }}
                    onClick={() => setFeriadoFilterTipo('FIJO')}
                  >
                    🔴 Fijos ({feriados.filter(f => f.tipo === 'FIJO').length})
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: feriadoFilterTipo === 'MOVIL' ? '1px solid #d97706' : '1px solid #cbd5e1',
                      backgroundColor: feriadoFilterTipo === 'MOVIL' ? '#d97706' : '#ffffff',
                      color: feriadoFilterTipo === 'MOVIL' ? '#ffffff' : '#475569'
                    }}
                    onClick={() => setFeriadoFilterTipo('MOVIL')}
                  >
                    🟠 Móviles ({feriados.filter(f => f.tipo === 'MOVIL').length})
                  </button>
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => fetchFeriados(selectedFeriadosYear)}
              >
                🔄 Actualizar Lista
              </button>
            </div>

            {loadingFeriados ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem 0' }}>Cargando feriados y bloqueos...</p>
            ) : feriados.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                No hay feriados ni bloqueos registrados para el año {selectedFeriadosYear}.
              </div>
            ) : (
              <div className={styles.bloqueoCardList}>
                {feriados
                  .filter(f => {
                    if (feriadoFilterTipo === 'ALL') return true;
                    if (feriadoFilterTipo === 'UNICO') return f.tipo === 'UNICO' || !f.tipo;
                    if (feriadoFilterTipo === 'FIJO') return f.tipo === 'FIJO';
                    if (feriadoFilterTipo === 'MOVIL') return f.tipo === 'MOVIL';
                    return true;
                  })
                  .map((f) => {
                    const isMovil = f.tipo === 'MOVIL';
                    const isFijo = f.tipo === 'FIJO';
                    const hasMoved = isMovil && f.fechaMovida;
                    const dotColor = f.color || (isFijo ? '#dc2626' : (isMovil ? '#d97706' : '#2563eb'));
                    const dayName = getFeriadoDayName(f.fecha);
                    const dateFormatted = `${formatFeriadoDate(f.fecha)} (${dayName})`;

                    return (
                      <div key={f.id} className={styles.bloqueoCardItem}>
                        {/* Header: Dot + Badge + Fecha */}
                        <div className={styles.bloqueoCardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span 
                              className={styles.colorDot} 
                              style={{ backgroundColor: dotColor, width: '10px', height: '10px', margin: 0, flexShrink: 0 }} 
                            />
                            {isFijo ? (
                              <span className={styles.badgeFijo}>FIJO</span>
                            ) : isMovil ? (
                              <span className={styles.badgeMovil}>MÓVIL</span>
                            ) : (
                              <span className={styles.badgeUnico}>ÚNICO</span>
                            )}
                            <span className={styles.bloqueoCardDateText}>{dateFormatted}</span>
                          </div>
                        </div>

                        {/* Body: Motivo | Horario | Acciones */}
                        <div className={styles.bloqueoCardBody}>
                          <div className={styles.bloqueoCardField} style={{ flex: 1.5, minWidth: '150px' }}>
                            <span className={styles.bloqueoCardFieldLabel}>Motivo</span>
                            <span className={styles.bloqueoCardFieldValue}>{f.motivo || 'Sin motivo'}</span>
                            {hasMoved && (
                              <div className={styles.badgeMovedAlert} style={{ marginTop: '0.35rem' }}>
                                ➡️ Reubicado al: <strong>{formatFeriadoDate(f.fechaMovida)} ({getFeriadoDayName(f.fechaMovida)})</strong>
                              </div>
                            )}
                          </div>

                          <div className={styles.bloqueoCardField} style={{ flex: 1, minWidth: '110px' }}>
                            <span className={styles.bloqueoCardFieldLabel}>Horario</span>
                            <span className={styles.bloqueoCardFieldValue}>
                              {f.esDiaCompleto ? (
                                <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
                                  Día completo
                                </span>
                              ) : (
                                <span style={{ color: '#334155', fontWeight: 600 }}>{f.horaInicio} - {f.horaFin} hs</span>
                              )}
                            </span>
                          </div>

                          <div className={styles.bloqueoCardActions}>
                            {isMovil && (
                              <>
                                <button
                                  type="button"
                                  className={styles.actionBtnSmall}
                                  onClick={() => handleOpenMoveModal(f)}
                                  title="Reubicar este feriado a otra fecha"
                                >
                                  🗓️ Reubicar
                                </button>
                                {hasMoved && (
                                  <button
                                    type="button"
                                    className={styles.actionBtnSmall}
                                    onClick={() => handleResetMoveFeriado(f)}
                                    title="Restaurar fecha original"
                                  >
                                    ↩️ Restaurar
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              className={`${styles.actionBtnSmall} ${styles.actionBtnDanger}`}
                              onClick={() => handleDeleteFeriado(f.id, f.isSynthesized, f.originalId)}
                              title="Eliminar este feriado o bloqueo"
                            >
                              <TrashIcon /> Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Configuración del Sistema</h2>
        <p>Administra las zonas de depilación, los horarios de atención, las plantillas y los parámetros operativos.</p>
      </div>

      {/* Selector Desplegable Unificado de Secciones (Consistente en Desktop y Móvil) */}
      <div className={styles.tabDropdownWrapper}>
        <label className={styles.tabDropdownLabel}>
          <SettingsIcon /> Seleccionar Ventana / Sección de Configuración:
        </label>
        <select
          className={styles.tabSelectDropdown}
          value={activeTab}
          onChange={(e) => {
            const tab = e.target.value;
            setActiveTab(tab);
            if (tab === 'users') fetchUsers();
            if (tab === 'promos') { fetchPromociones(); fetchCupones(); }
            if (tab === 'parametros' || tab === 'bloqueos') { fetchFeriados(selectedFeriadosYear); }
            if (tab === 'boxes') fetchBoxes();
          }}
        >
          <option value="zones">Servicios (Zonas de Depilación)</option>
          <option value="hours">Horarios Laborales</option>
          <option value="templates">Mensajes y Plantillas</option>
          <option value="users">Usuarios y Operadores</option>
          <option value="parametros">Parámetros Operativos (Seña, Notificaciones, Canales)</option>
          <option value="bloqueos">Bloqueos de Agenda y Feriados Anuales</option>
          <option value="promos">Promociones y Cupones</option>
          <option value="boxes">Boxes y Cabinas (Agendas Paralelas)</option>
        </select>
      </div>

      {/* Tab Content 1: Servicios y Zonas Management (Fase 2) */}
      {activeTab === 'zones' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>
            <div>
              <span>🏷️ Catálogo de Servicios y Zonas</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 'normal', margin: '0.35rem 0 0 0', lineHeight: 1.5 }}>
                Administra los servicios del centro (Depilación Láser, Masajes, Faciales) y las zonas o tratamientos específicos de cada uno.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={handleOpenNewServicio} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <span>➕ Nuevo Servicio</span>
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={() => handleOpenNewZone()} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <PlusIcon /> Agregar Zona
              </button>
            </div>
          </div>

          {loadingServicios ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#7a1f1e', fontWeight: 600 }}>Cargando servicios y zonas...</div>
          ) : servicios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay servicios configurados. Crea uno para comenzar.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
              {servicios.map((s) => {
                const isBase = s.nombre.toLowerCase().includes('depilaci');
                const sZonas = s.zonas || [];
                return (
                  <div key={s.id} className={styles.serviceGroupCard}>
                    <div className={styles.serviceGroupHeader}>
                      <div className={styles.serviceGroupTitle}>
                        <span className={styles.serviceGroupIcon}>{s.icono || '⚡'}</span>
                        <span>{s.nombre}</span>
                        <span className={styles.serviceGroupBadge}>
                          {sZonas.length} {sZonas.length === 1 ? 'zona' : 'zonas'}
                        </span>
                        {isBase && (
                          <span style={{ fontSize: '0.72rem', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                            ⭐ Servicio Principal
                          </span>
                        )}
                      </div>
                      <div className={styles.serviceGroupActions}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => handleOpenNewZone(s.id)}
                          title={`Agregar una zona a ${s.nombre}`}
                        >
                          <PlusIcon /> Agregar Zona
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem' }}
                          onClick={() => handleOpenEditServicio(s)}
                          title="Editar información de este servicio"
                        >
                          <EditIcon />
                        </button>
                        {!isBase && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={() => handleDeleteServicio(s)}
                            title="Eliminar este servicio"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>

                    {sZonas.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem', background: '#fafafa' }}>
                        No hay zonas ni tratamientos cargados para este servicio. Usa el botón <strong>"+ Agregar Zona"</strong> para cargar el primer tratamiento.
                      </div>
                    ) : (
                      <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th className={styles.th}>Zona / Tratamiento</th>
                              <th className={styles.th}>Precio Base</th>
                              <th className={styles.th}>Seña Requerida</th>
                              <th className={styles.th}>Duración</th>
                              <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sZonas.map((z) => {
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
                                                onChange={(e) => {
                                                  const p = Number(e.target.value);
                                                  setZoneForm({ ...zoneForm, precioBase: p, señaBase: Math.round(p * 0.5) });
                                                }}
                                                required 
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                              />
                                            </div>
                                            <div className={styles.formGroup} style={{ margin: 0 }}>
                                              <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Duración (min)</label>
                                              <input 
                                                type="number" 
                                                className={styles.input} 
                                                value={zoneForm.duracionMinutos}
                                                onChange={(e) => setZoneForm({ ...zoneForm, duracionMinutos: e.target.value })}
                                                required 
                                                min="5" 
                                                step="5" 
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                              />
                                            </div>
                                            <div className={styles.formGroup} style={{ margin: 0 }}>
                                              <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Servicio</label>
                                              <select
                                                className={styles.input}
                                                value={zoneForm.servicioId || s.id}
                                                onChange={(e) => setZoneForm({ ...zoneForm, servicioId: e.target.value })}
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                              >
                                                {servicios.map(srv => (
                                                  <option key={srv.id} value={srv.id}>{srv.icono} {srv.nombre}</option>
                                                ))}
                                              </select>
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
                );
              })}
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
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-gold)', marginBottom: '0.75rem' }}>
                Agenda Interna (Gonzalo / Admin)
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora Inicio Agenda Interna</label>
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
                  <label className={styles.label}>Hora Fin Agenda Interna</label>
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

              <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: '1.5rem 0' }} />

              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-gold)', marginBottom: '0.75rem' }}>
                Autogestión / Reserva Online de Clientes
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora Inicio Reserva Online</label>
                  <select 
                    className={styles.input} 
                    value={configs.booking_work_start}
                    onChange={(e) => setConfigs({ ...configs, booking_work_start: e.target.value })}
                  >
                    {hourSlots.map(slot => (
                      <option key={`bstart-${slot}`} value={slot}>{slot} hs</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora Fin Reserva Online</label>
                  <select 
                    className={styles.input} 
                    value={configs.booking_work_end}
                    onChange={(e) => setConfigs({ ...configs, booking_work_end: e.target.value })}
                  >
                    {hourSlots.map(slot => (
                      <option key={`bend-${slot}`} value={slot}>{slot} hs</option>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>Mensaje de Seguimiento ("Va a Avisar") por WhatsApp</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_va_a_avisar_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_va_a_avisar_template: e.target.value })}
                  placeholder="¡Hola [Nombre]! Te escribimos de Gonzalo Depilación Masculina para consultar sobre tu próxima sesión..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>🛠️ Mensaje de Mantenimiento / Finalizado por WhatsApp (Enviado automáticamente 2,5 meses después)</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_mantenimiento_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_mantenimiento_template: e.target.value })}
                  placeholder="¡Hola [Nombre]! Te escribimos de Gonzalo Depilación ✨ Ya pasaron dos meses y medio desde tu última sesión de tratamiento..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>🎂 Saludo de Cumpleaños por WhatsApp (Enviado automáticamente a las 10:00 AM)</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`}
                  value={configs.wtsp_birthday_template}
                  onChange={(e) => setConfigs({ ...configs, wtsp_birthday_template: e.target.value })}
                  placeholder="¡Feliz cumpleaños [Nombre]! 🎉🎂 Desde Gonzalo Depilación te deseamos que pases un excelente día..."
                  rows="4"
                  required
                />
              </div>

              {/* Variable Helper */}
              <div className={styles.variableHelper} style={{ marginBottom: '2rem' }}>
                <div className={styles.variableTitle}>Variables Automáticas WhatsApp (Toca para copiar):</div>
                <div className={styles.variableGrid}>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Nombre]')}>[Nombre]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Apellido]')}>[Apellido]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Día]')}>[Día]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[DiaCompleto]')}>[DiaCompleto]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[FechaTurno]')}>[FechaTurno]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[Horario]')}>[Horario]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[HoraInicio]')}>[HoraInicio]</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('[HoraFin]')}>[HoraFin]</div>
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

              {/* Email 7: Seguimiento Va a Avisar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#ba68c8' }}>📧 Correo de Seguimiento ("Va a Avisar")</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_va_a_avisar_subject}
                    onChange={(e) => setConfigs({ ...configs, email_va_a_avisar_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_va_a_avisar_body}
                    onChange={(e) => setConfigs({ ...configs, email_va_a_avisar_body: e.target.value })}
                    rows="5"
                    required
                  />
                </div>
              </div>

              {/* Email 8: Saludo de Cumpleaños */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#ff7043' }}>🎂 Correo de Saludo de Cumpleaños (Enviado automáticamente a las 10:00 AM)</div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asunto del Correo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={configs.email_birthday_subject}
                    onChange={(e) => setConfigs({ ...configs, email_birthday_subject: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cuerpo del Mensaje</label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`}
                    value={configs.email_birthday_body}
                    onChange={(e) => setConfigs({ ...configs, email_birthday_body: e.target.value })}
                    rows="5"
                    required
                  />
                </div>
              </div>

              {/* Variable Helper for Emails */}
              <div className={styles.variableHelper} style={{ marginBottom: '1.5rem' }}>
                <div className={styles.variableTitle}>Variables Automáticas Email (Toca para copiar):</div>
                <div className={styles.variableGrid}>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{cliente}')}>{"{cliente}"}</div>
                  <div className={styles.variableBadge} onClick={() => handleCopyVariable('{día}')}>{"{día}"}</div>
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

      {/* Tab Content: Parameters Management */}
      {activeTab === 'parametros' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>
            <span>⚙️ Parámetros Generales del Sistema</span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Configura los plazos de pérdida de seña, la antelación de avisos y recordatorios por WhatsApp y correo, la fórmula de cálculo de tiempo para turnos y los canales de adquisición de clientes.
          </p>

          <form onSubmit={handleSaveConfigs}>
            {/* 1. Plazo de Pérdida de Seña */}
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupTitle}>
                <span>⏱️ Plazo de Pérdida de Seña (Horas antes)</span>
              </div>
              <p className={styles.paramGroupDesc}>
                Horas mínimas de antelación requeridas para cancelar o reprogramar un turno conservando la seña abonada. Si el cliente cancela o reprograma con menos antelación que este plazo, la seña se retiene.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <input 
                  type="number"
                  className={styles.input}
                  style={{ maxWidth: '140px' }}
                  value={configs.seña_retencion_horas || '72'}
                  onChange={(e) => setConfigs({ ...configs, seña_retencion_horas: e.target.value })}
                  min="1"
                  max="168"
                  required
                />
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>horas (Por defecto: 72 hs = 3 días hábiles)</span>
              </div>
            </div>

            {/* 2. Antelación de Recordatorio de WhatsApp */}
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupTitle}>
                <span>📲 Antelación de Recordatorio de WhatsApp (Horas antes)</span>
              </div>
              <p className={styles.paramGroupDesc}>
                Horas antes del turno en las que el cron automático despachará el recordatorio interactivo de WhatsApp al cliente.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <input 
                  type="number"
                  className={styles.input}
                  style={{ maxWidth: '140px' }}
                  value={configs.recordatorio_horas || '48'}
                  onChange={(e) => setConfigs({ ...configs, recordatorio_horas: e.target.value })}
                  min="1"
                  max="168"
                  required
                />
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>horas antes del turno (Ej: 48 hs o 24 hs)</span>
              </div>
            </div>

            {/* 3. Antelación de Aviso Previo */}
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupTitle}>
                <span>✉️ Antelación de Aviso Previo por Correo (Días antes)</span>
              </div>
              <p className={styles.paramGroupDesc}>
                Días de anticipación para el envío del aviso previo por correo electrónico de preparación para el turno.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <input 
                  type="number"
                  className={styles.input}
                  style={{ maxWidth: '140px' }}
                  value={configs.mensaje_previo_dias || '7'}
                  onChange={(e) => setConfigs({ ...configs, mensaje_previo_dias: e.target.value })}
                  min="1"
                  max="30"
                  required
                />
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>días antes del turno (Ej: 7 días = 1 semana, o 4 días)</span>
              </div>
            </div>

            {/* 4. Fórmula para Cálculo de Tiempo de Turnos */}
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupTitle}>
                <span>📐 Regla de Cálculo de Duración de Turnos</span>
              </div>
              <p className={styles.paramGroupDesc}>
                Fórmula para determinar la duración en minutos de un turno al combinar múltiples zonas de depilación.
              </p>
              <div style={{ marginTop: '0.4rem' }}>
                <select 
                  className={styles.input}
                  style={{ maxWidth: '650px', width: '100%' }}
                  value={configs.duracion_formula || 'ZONA_MAX_MAS_TERCIO'}
                  onChange={(e) => setConfigs({ ...configs, duracion_formula: e.target.value })}
                >
                  <option value="ZONA_MAX_MAS_10MIN">
                    Zona más larga + 10 min por zona adicional (sin Ax, gl ni hom)
                  </option>
                  <option value="ZONA_MAX_MAS_TERCIO">
                    Zona más larga + ⅓ del resto (si son 4+ zonas resta 10 min, redondeo a 10 min)
                  </option>
                  <option value="ZONA_MAX_MAS_MITAD">
                    Zona más larga + 50% de las demás zonas (Fórmula Clásica)
                  </option>
                </select>
              </div>
            </div>

            {/* 5. Canales de Obtención / Adquisición de Clientes */}
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupTitle}>
                <span>📊 Canales de Obtención de Clientes</span>
              </div>
              <p className={styles.paramGroupDesc}>
                Gestiona los canales disponibles para registrar el origen de los clientes (campañas, redes, recomendaciones, etc.).
              </p>
              <div className={styles.channelsGrid}>
                {getParsedCanales().map((canal) => (
                  <span key={canal} className={styles.channelTag}>
                    <span>{canal}</span>
                    <button 
                      type="button" 
                      className={styles.channelTagDeleteBtn}
                      onClick={() => handleRemoveChannel(canal)}
                      title={`Eliminar canal ${canal}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <input 
                  type="text"
                  className={styles.input}
                  style={{ maxWidth: '240px' }}
                  value={newChannelInput}
                  onChange={(e) => setNewChannelInput(e.target.value)}
                  placeholder="Nuevo canal (ej: TIKTOK)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChannel();
                    }
                  }}
                />
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddChannel}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  + Agregar Canal
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={savingConfigs}
                style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
              >
                {savingConfigs ? 'Guardando...' : '💾 Guardar Parámetros'}
              </button>
            </div>
          </form>

          {/* Acceso directo a Bloqueos y Feriados Anuales (D-140) */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Bloqueos de Agenda y Feriados Anuales</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Gestioná los feriados fijos, móviles y bloqueos específicos en su sección independiente.</div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setActiveTab('bloqueos');
                fetchFeriados(selectedFeriadosYear);
              }}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Ir a Bloqueos de Agenda →
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: Bloqueos de Agenda y Feriados Anuales (Dedicado D-137) */}
      {activeTab === 'bloqueos' && renderBloqueosSection()}

      {/* Tab Content 4: Promociones y Cupones Management */}
      {activeTab === 'promos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Promociones por Combinación de Zonas */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>
              <div>
                <span>🎁 Promociones por Combinación de Zonas</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal', margin: '0.25rem 0 0 0' }}>
                  Aplica descuentos automáticos cuando un turno incluye una combinación específica de zonas (ej: Espalda + Pecho).
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleOpenNewPromo} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem', flexShrink: 0 }}
              >
                <PlusIcon /> Nueva Promoción
              </button>
            </div>

            {loadingPromociones ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gold)' }}>Cargando promociones...</div>
            ) : promociones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No hay promociones configuradas aún. Crea combos de zonas para incentivar la venta.
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Promoción</th>
                      <th className={styles.th}>Zonas Incluidas</th>
                      <th className={styles.th}>Descuento</th>
                      <th className={styles.th}>Vigencia</th>
                      <th className={styles.th}>Estado</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promociones.map(promo => {
                      let promoZonas = [];
                      try {
                        promoZonas = typeof promo.zonas === 'string' ? JSON.parse(promo.zonas) : (promo.zonas || []);
                      } catch {
                        promoZonas = [];
                      }
                      return (
                        <tr key={promo.id} className={styles.tr}>
                          <td className={styles.td} data-label="Promoción" style={{ fontWeight: 600 }}>
                            {promo.nombre}
                          </td>
                          <td className={styles.td} data-label="Zonas">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {promoZonas.map((z, idx) => (
                                <span key={idx} className={styles.zoneChip}>{z}</span>
                              ))}
                            </div>
                          </td>
                          <td className={styles.td} data-label="Descuento">
                            <span className={styles.promoBadge}>
                              {promo.descuentoTipo === 'PORCENTAJE' ? `${promo.descuentoValor}% OFF` : `${formatMoney(promo.descuentoValor)} OFF`}
                            </span>
                          </td>
                          <td className={styles.td} data-label="Vigencia" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {promo.fechaInicio || promo.fechaFin ? (
                              `${promo.fechaInicio ? new Date(promo.fechaInicio).toLocaleDateString('es-AR') : 'Inicio'} al ${promo.fechaFin ? new Date(promo.fechaFin).toLocaleDateString('es-AR') : 'Fin'}`
                            ) : (
                              'Permanente'
                            )}
                          </td>
                          <td className={styles.td} data-label="Estado">
                            <span 
                              className={promo.activo ? styles.statusActive : styles.statusInactive}
                              onClick={() => handleTogglePromoActivo(promo)}
                              title="Haz clic para activar/pausar"
                            >
                              {promo.activo ? '🟢 Activa' : '⚪ Pausada'}
                            </span>
                          </td>
                          <td className={styles.td} data-label="Acciones" style={{ textAlign: 'right' }}>
                            <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem' }} 
                                onClick={() => handleOpenEditPromo(promo)}
                                title="Editar promoción"
                              >
                                <EditIcon />
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem', color: '#ff5252', borderColor: 'rgba(198, 40, 40, 0.15)' }} 
                                onClick={() => handleDeletePromo(promo.id)}
                                title="Eliminar promoción"
                              >
                                <TrashIcon />
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
          </div>

          {/* Cupones de Descuento */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>
              <div>
                <span>🏷️ Cupones de Descuento Alfanuméricos</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal', margin: '0.25rem 0 0 0' }}>
                  Códigos para campañas publicitarias o fidelización con límite de canjes y fecha de vencimiento.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleOpenNewCupon} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem', flexShrink: 0 }}
              >
                <PlusIcon /> Nuevo Cupón
              </button>
            </div>

            {loadingCupones ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gold)' }}>Cargando cupones...</div>
            ) : cupones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No hay cupones registrados. Crea códigos promocionales para tus clientes.
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Código</th>
                      <th className={styles.th}>Beneficio</th>
                      <th className={styles.th}>Usos / Límite</th>
                      <th className={styles.th}>Vencimiento</th>
                      <th className={styles.th}>Estado</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cupones.map(cupon => (
                      <tr key={cupon.id} className={styles.tr}>
                        <td className={styles.td} data-label="Código">
                          <span className={styles.cuponCode}>{cupon.codigo}</span>
                        </td>
                        <td className={styles.td} data-label="Beneficio">
                          <span className={styles.promoBadge}>
                            {cupon.descuentoTipo === 'PORCENTAJE' ? `${cupon.descuentoValor}% OFF` : `${formatMoney(cupon.descuentoValor)} OFF`}
                          </span>
                        </td>
                        <td className={styles.td} data-label="Usos">
                          <span style={{ fontWeight: 600 }}>{cupon.usosActuales || 0}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}> / {cupon.usosPermitidos ? cupon.usosPermitidos : '∞'} usos</span>
                        </td>
                        <td className={styles.td} data-label="Vencimiento" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {cupon.fechaVencimiento ? new Date(cupon.fechaVencimiento).toLocaleDateString('es-AR') : 'Sin vencimiento'}
                        </td>
                        <td className={styles.td} data-label="Estado">
                          <span 
                            className={cupon.activo ? styles.statusActive : styles.statusInactive}
                            onClick={() => handleToggleCuponActivo(cupon)}
                            title="Haz clic para activar/pausar"
                          >
                            {cupon.activo ? '🟢 Activo' : '⚪ Pausado'}
                          </span>
                        </td>
                        <td className={styles.td} data-label="Acciones" style={{ textAlign: 'right' }}>
                          <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.65rem' }} 
                              onClick={() => handleOpenEditCupon(cupon)}
                              title="Editar cupón"
                            >
                              <EditIcon />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.65rem', color: '#ff5252', borderColor: 'rgba(198, 40, 40, 0.15)' }} 
                              onClick={() => handleDeleteCupon(cupon.id)}
                              title="Eliminar cupón"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: Users and Operators Management */}
      {activeTab === 'users' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>
            <span>Gestión de Usuarios y Roles de Acceso</span>
            <button 
              className="btn btn-primary" 
              onClick={handleOpenNewUser}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <PlusIcon /> Nuevo Usuario / Operador
            </button>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Crea cuentas de acceso para operadores y recepcionistas. Los <strong>Operadores</strong> solo pueden ver y gestionar su agenda y clientes (sin acceso a caja, costos, métricas ni configuración).
          </p>

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gold)' }}>Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay usuarios registrados.</div>
          ) : (
            <div className={styles.userCardsGrid}>
              {users.map(u => (
                <div key={u.id} className={`${styles.userCard} ${u.activo === false ? styles.userCardBlocked : ''}`}>
                  <div className={styles.userCardHeader}>
                    <div>
                      <div className={styles.userCardName}>{u.nombre}</div>
                      <div className={styles.userCardHandle}>@{u.usuario}</div>
                    </div>
                    <div>
                      {u.rol === 'ADMIN' && (
                        <span className={styles.roleBadgeAdmin}>👑 Admin</span>
                      )}
                      {u.rol === 'OPERADOR' && (
                        <span className={styles.roleBadgeOperador}>✂️ Operador</span>
                      )}
                      {u.rol === 'RECEPCION' && (
                        <span className={styles.roleBadgeRecepcion}>📋 Recepción</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.userCardRate}>
                    {u.comisionValor ? (
                      u.comisionTipo === 'PORCENTAJE'
                        ? `${u.comisionValor}% por turno`
                        : (u.comisionTipo === 'POR_HORA' || u.comisionTipo === 'POR_DIA')
                        ? `$${Number(u.comisionValor).toLocaleString('es-AR')} / hora`
                        : `$${Number(u.comisionValor).toLocaleString('es-AR')} / turno`
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Sin comisión</span>
                    )}
                  </div>

                  <div className={styles.userCardDetails}>
                    {u.fechaNacimiento && (
                      <div className={styles.userCardDetailItem}>
                        <span>🎂</span>
                        <span>{new Date(u.fechaNacimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    )}
                    {u.vacacionesInicio && u.vacacionesFin && (
                      <div className={styles.userCardDetailItem} style={{ color: '#60a5fa' }}>
                        <span>🏖️</span>
                        <span>{new Date(u.vacacionesInicio).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} al {new Date(u.vacacionesFin).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                    )}
                    <div className={styles.userCardDetailItem}>
                      <span>📞</span>
                      <span>{u.telefono || 'Sin teléfono'}</span>
                    </div>
                    {u.direccion && (
                      <div className={styles.userCardDetailItem}>
                        <span>📍</span>
                        <span>{u.direccion}</span>
                      </div>
                    )}
                    <div className={styles.userCardDetailItem}>
                      <span>⏰</span>
                      <span>{formatBoxDays(u.diasLaborales)} de {u.horaInicio || '14:00'} a {u.horaFin || '22:00'} hs</span>
                    </div>
                    {u.email && (
                      <div className={styles.userCardDetailItem}>
                        <span>✉️</span>
                        <span style={{ wordBreak: 'break-all' }}>{u.email}</span>
                      </div>
                    )}
                    {/* Servicios Asignados */}
                    <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>Servicios:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(() => {
                          let userSIds = [];
                          try {
                            userSIds = u.serviciosIds ? JSON.parse(u.serviciosIds) : [];
                          } catch {
                            userSIds = (u.serviciosIds || '').split(',').map(s => s.trim()).filter(Boolean);
                          }
                          const assigned = (userSIds && userSIds.length > 0)
                            ? servicios.filter(s => userSIds.includes(s.id))
                            : servicios;
                          if (assigned.length === 0) {
                            return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sin servicios asignados</span>;
                          }
                          return assigned.map(s => (
                            <span key={s.id} style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(122, 31, 30, 0.08)', color: '#7a1f1e', fontWeight: 600 }}>
                              {s.icono || '⚡'} {s.nombre}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className={styles.userCardFooter}>
                    <div>
                      {u.activo === false ? (
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '9999px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171' }}>
                          🔒 Inactivo / Bloqueado
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '9999px', backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                          🟢 Activo
                        </span>
                      )}
                    </div>

                    <div className={styles.userCardActions}>
                      {u.activo === false && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.3)' }}
                          onClick={() => handleToggleUserActive(u)}
                          title="Desbloquear / Activar operador"
                        >
                          🔓 Desbloquear
                        </button>
                      )}
                      <button 
                        type="button"
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.65rem' }} 
                        onClick={() => handleOpenEditUser(u)}
                        title="Editar usuario"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        type="button"
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.65rem', color: '#ff5252', borderColor: 'rgba(198, 40, 40, 0.15)' }} 
                        onClick={() => handleDeleteUser(u)}
                        title="Eliminar o Bloquear usuario"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 7: Boxes y Cabinas (Fase 3 Staging & Producción) */}
      {activeTab === 'boxes' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>📦 Gestión de Boxes y Cabinas de Atención</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px', marginBottom: 0 }}>
                Configura los boxes y cabinas del centro con horarios propios y servicios asignados para habilitar agendas paralelas e independientes.
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.1rem', backgroundColor: '#7a1f1e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              onClick={handleOpenNewBox}
            >
              <PlusIcon /> + Nuevo Box / Cabina
            </button>
          </div>

          {loadingBoxes ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando boxes...</div>
          ) : boxes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No hay boxes configurados todavía.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '0.75rem', backgroundColor: '#7a1f1e', color: '#fff' }}
                onClick={handleOpenNewBox}
              >
                + Crear Primer Box
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
              {boxes.map(b => (
                <div
                  key={b.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    borderLeft: `6px solid ${b.color || '#7a1f1e'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: b.color || '#7a1f1e',
                            display: 'inline-block'
                          }}
                        />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          {b.nombre}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {b.esPrincipal && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px' }}>
                            ⭐ PRINCIPAL
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: b.activo ? '#dcfce7' : '#f1f5f9', color: b.activo ? '#166534' : '#64748b', border: `1px solid ${b.activo ? '#bbf7d0' : '#e2e8f0'}`, padding: '2px 8px', borderRadius: '4px' }}>
                          {b.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    {b.descripcion && (
                      <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
                        {b.descripcion}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#334155', backgroundColor: '#f8fafc', padding: '0.75rem 0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🕒</span>
                        <strong>Horario:</strong>
                        <span>{b.horaInicio} hs a {b.horaFin} hs</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📅</span>
                        <strong>Días:</strong>
                        <span>{formatBoxDays(b.diasAtencion)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🏷️</span>
                        <strong>Servicio:</strong>
                        <span>{b.servicio ? `${b.servicio.icono || '⚡'} ${b.servicio.nombre}` : 'Todos los servicios'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👥</span>
                        <strong>Turnos en sistema:</strong>
                        <span>{b._count?.turnos || 0} turnos</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                      onClick={() => handleOpenEditBox(b)}
                    >
                      ✏️ Editar
                    </button>
                    {!b.esPrincipal ? (
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => handleDeleteBox(b)}
                      >
                        🗑️ Eliminar
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        🔒 Box Principal protegido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {isZoneModalOpen && (
        <div className="modal-overlay" onClick={() => setIsZoneModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingZone ? 'Editar Zona o Tratamiento' : 'Agregar Nueva Zona o Tratamiento'}</h3>
              <button className="modal-close" onClick={() => setIsZoneModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveZone}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Servicio / Disciplina *</label>
                  <select
                    className={styles.input}
                    value={zoneForm.servicioId}
                    onChange={(e) => setZoneForm({ ...zoneForm, servicioId: e.target.value })}
                    required
                  >
                    {servicios.map(s => (
                      <option key={s.id} value={s.id}>{s.icono || '✨'} {s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de la Zona o Tratamiento *</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={zoneForm.nombre}
                    onChange={(e) => setZoneForm({ ...zoneForm, nombre: e.target.value })}
                    placeholder="Ej: Espalda Completa, Masaje Descontracturante, Peeling Facial"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Precio Base (ARS) *</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={zoneForm.precioBase}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setZoneForm({ ...zoneForm, precioBase: p, señaBase: Math.round(p * 0.5) });
                    }}
                    placeholder="Ej: 35000"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Seña Requerida (ARS) (50% Automático)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={Math.round(Number(zoneForm.precioBase || 0) * 0.5)}
                    readOnly
                    disabled
                    style={{ opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    title="La seña se calcula automáticamente como la mitad del precio base"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Duración (minutos) *</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={zoneForm.duracionMinutos}
                    onChange={(e) => setZoneForm({ ...zoneForm, duracionMinutos: e.target.value })}
                    placeholder="Ej: 40"
                    min="5"
                    step="5"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsZoneModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingZone ? 'Guardar Cambios' : 'Crear Zona'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo / Editar Servicio (Fase 2) */}
      {isServicioModalOpen && (
        <div className="modal-overlay" onClick={() => setIsServicioModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{editingServicio ? 'Editar Servicio' : '➕ Crear Nuevo Servicio'}</h3>
              <button className="modal-close" onClick={() => setIsServicioModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveServicio}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre del Servicio *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej: Masajes, Faciales, Barbería"
                    value={servicioForm.nombre}
                    onChange={(e) => setServicioForm({ ...servicioForm, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Ícono Representativo</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {['⚡', '💆‍♂️', '✨', '🌿', '🧖‍♂️', '✂️', '🧴', '🧘‍♂️'].map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setServicioForm({ ...servicioForm, icono: ic })}
                        style={{
                          fontSize: '1.25rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '8px',
                          border: servicioForm.icono === ic ? '2px solid #7a1f1e' : '1px solid #cbd5e1',
                          background: servicioForm.icono === ic ? '#fee2e2' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className={styles.input}
                    value={servicioForm.icono}
                    onChange={(e) => setServicioForm({ ...servicioForm, icono: e.target.value })}
                    placeholder="O escribe un emoji o ícono"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Descripción Breve (Opcional)</label>
                  <textarea
                    className={styles.input}
                    rows="2"
                    placeholder="Descripción para información del equipo u operadores"
                    value={servicioForm.descripcion}
                    onChange={(e) => setServicioForm({ ...servicioForm, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsServicioModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  💾 {editingServicio ? 'Guardar Cambios' : 'Crear Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promocion Create / Edit Modal */}
      {isPromoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPromoModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>{editingPromo ? 'Editar Promoción' : 'Nueva Promoción por Zonas'}</h3>
              <button className="modal-close" onClick={() => setIsPromoModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSavePromo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de la Promoción</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={promoForm.nombre}
                    onChange={(e) => setPromoForm({ ...promoForm, nombre: e.target.value })}
                    placeholder="Ej: Combo Espalda + Pecho 15% OFF"
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tipo de Descuento</label>
                    <select 
                      className={styles.input}
                      value={promoForm.descuentoTipo}
                      onChange={(e) => setPromoForm({ ...promoForm, descuentoTipo: e.target.value })}
                    >
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="MONTO_FIJO">Monto Fijo ($ ARS)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {promoForm.descuentoTipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto Descuento ($ ARS)'}
                    </label>
                    <input 
                      type="number" 
                      className={styles.input} 
                      value={promoForm.descuentoValor}
                      onChange={(e) => setPromoForm({ ...promoForm, descuentoValor: e.target.value })}
                      placeholder={promoForm.descuentoTipo === 'PORCENTAJE' ? '15' : '5000'}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Zonas Requeridas para Aplicar el Combo ({promoForm.zonas.length} seleccionadas)
                  </label>
                  <div className={styles.zoneSelectorGrid}>
                    {zones.map(z => {
                      const isSelected = promoForm.zonas.includes(z.nombre);
                      return (
                        <div 
                          key={z.id}
                          className={`${styles.zoneCheckItem} ${isSelected ? styles.zoneCheckItemActive : ''}`}
                          onClick={() => togglePromoZone(z.nombre)}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} 
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{z.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Vigencia Desde (Opcional)</label>
                    <input 
                      type="date" 
                      className={styles.input} 
                      value={promoForm.fechaInicio}
                      onChange={(e) => setPromoForm({ ...promoForm, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Vigencia Hasta (Opcional)</label>
                    <input 
                      type="date" 
                      className={styles.input} 
                      value={promoForm.fechaFin}
                      onChange={(e) => setPromoForm({ ...promoForm, fechaFin: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input 
                    type="checkbox" 
                    id="promoActivo"
                    checked={promoForm.activo}
                    onChange={(e) => setPromoForm({ ...promoForm, activo: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-gold)' }}
                  />
                  <label htmlFor="promoActivo" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                    Promoción Activa
                  </label>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPromoModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cupon Create / Edit Modal */}
      {isCuponModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCuponModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>{editingCupon ? 'Editar Cupón de Descuento' : 'Nuevo Cupón de Descuento'}</h3>
              <button className="modal-close" onClick={() => setIsCuponModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveCupon}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Código Alfanumérico del Cupón</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={cuponForm.codigo}
                    onChange={(e) => setCuponForm({ ...cuponForm, codigo: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="Ej: VERANO2026"
                    required
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tipo de Descuento</label>
                    <select 
                      className={styles.input}
                      value={cuponForm.descuentoTipo}
                      onChange={(e) => setCuponForm({ ...cuponForm, descuentoTipo: e.target.value })}
                    >
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="MONTO_FIJO">Monto Fijo ($ ARS)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {cuponForm.descuentoTipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto Descuento ($ ARS)'}
                    </label>
                    <input 
                      type="number" 
                      className={styles.input} 
                      value={cuponForm.descuentoValor}
                      onChange={(e) => setCuponForm({ ...cuponForm, descuentoValor: e.target.value })}
                      placeholder={cuponForm.descuentoTipo === 'PORCENTAJE' ? '20' : '6000'}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Límite de Canjes / Usos</label>
                    <input 
                      type="number" 
                      className={styles.input} 
                      value={cuponForm.usosPermitidos}
                      onChange={(e) => setCuponForm({ ...cuponForm, usosPermitidos: e.target.value })}
                      placeholder="Ej: 10 (Dejar vacío o 0 si es ilimitado)"
                      min="1"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Vencimiento (Opcional)</label>
                    <input 
                      type="date" 
                      className={styles.input} 
                      value={cuponForm.fechaVencimiento}
                      onChange={(e) => setCuponForm({ ...cuponForm, fechaVencimiento: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input 
                    type="checkbox" 
                    id="cuponActivo"
                    checked={cuponForm.activo}
                    onChange={(e) => setCuponForm({ ...cuponForm, activo: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-gold)' }}
                  />
                  <label htmlFor="cuponActivo" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                    Cupón Habilitado / Activo
                  </label>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCuponModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingCupon ? 'Guardar Cambios' : 'Crear Cupón'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Create / Edit Modal */}
      {isUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUserModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingUser ? 'Editar Usuario / Operador' : 'Nuevo Usuario / Operador'}</h3>
              <button className="modal-close" onClick={() => setIsUserModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre Completo</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={userForm.nombre}
                    onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                    placeholder="Ej: Sofía Operadora"
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Usuario (para Login)</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={userForm.usuario}
                      onChange={(e) => setUserForm({ ...userForm, usuario: e.target.value })}
                      placeholder="Ej: sofia"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                    </label>
                    <input 
                      type="password" 
                      className={styles.input} 
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder={editingUser ? 'Dejar en blanco para conservar' : '••••••••'}
                      required={!editingUser}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Rol de Acceso / Permisos</label>
                  <select 
                    className={styles.input}
                    value={userForm.rol}
                    onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
                  >
                    <option value="OPERADOR">✂️ Operador (Solo Agenda, Alta y Clientes)</option>
                    <option value="RECEPCION">📋 Recepción (Agenda, Alta, Clientes y Notificaciones)</option>
                    <option value="ADMIN">👑 Administrador (Acceso Total al Sistema)</option>
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Teléfono / WhatsApp (Opcional)</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={userForm.telefono}
                      onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                      placeholder="Ej: 1132519008"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email (Opcional)</label>
                    <input 
                      type="email" 
                      className={styles.input} 
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="Ej: operador@ejemplo.com"
                    />
                  </div>
                </div>

                {/* Dirección / Domicilio */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>📍 Dirección / Domicilio (Opcional)</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={userForm.direccion || ''}
                    onChange={(e) => setUserForm({ ...userForm, direccion: e.target.value })}
                    placeholder="Ej: Av. Santa Fe 1234, CABA"
                  />
                </div>

                {/* Horario Laboral Propio del Operador */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>⏰ Hora Inicio Jornada</label>
                    <input 
                      type="time" 
                      className={styles.input} 
                      value={userForm.horaInicio || '14:00'}
                      onChange={(e) => setUserForm({ ...userForm, horaInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>⏰ Hora Fin Jornada</label>
                    <input 
                      type="time" 
                      className={styles.input} 
                      value={userForm.horaFin || '22:00'}
                      onChange={(e) => setUserForm({ ...userForm, horaFin: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Días de Trabajo */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>📅 Días de Trabajo Semanal</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {[
                      { val: '1', label: 'Lunes' },
                      { val: '2', label: 'Martes' },
                      { val: '3', label: 'Miércoles' },
                      { val: '4', label: 'Jueves' },
                      { val: '5', label: 'Viernes' },
                      { val: '6', label: 'Sábado' },
                      { val: '0', label: 'Domingo' }
                    ].map(d => {
                      const currentDays = (userForm.diasLaborales || '1,2,3,4,5').split(',').map(s => s.trim()).filter(Boolean);
                      const isChecked = currentDays.includes(d.val);
                      return (
                        <label key={d.val} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', borderRadius: '6px', border: isChecked ? '1px solid #7a1f1e' : '1px solid #cbd5e1', background: isChecked ? 'rgba(122, 31, 30, 0.08)' : '#f8fafc', cursor: 'pointer', fontSize: '0.84rem', fontWeight: isChecked ? 600 : 400 }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              let updated;
                              if (e.target.checked) {
                                updated = [...currentDays, d.val];
                              } else {
                                updated = currentDays.filter(x => x !== d.val);
                              }
                              setUserForm({ ...userForm, diasLaborales: updated.join(',') });
                            }}
                            style={{ accentColor: '#7a1f1e' }}
                          />
                          <span>{d.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Servicios Asignados */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>⚡ Servicios Asignados (Disciplinas que atiende)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {servicios.map(s => {
                      let selectedServicios = [];
                      try {
                        selectedServicios = Array.isArray(userForm.serviciosIds) 
                          ? userForm.serviciosIds 
                          : (userForm.serviciosIds ? JSON.parse(userForm.serviciosIds) : []);
                      } catch {
                        selectedServicios = (userForm.serviciosIds || '').split(',').map(x => x.trim()).filter(Boolean);
                      }
                      const isChecked = selectedServicios.length === 0 || selectedServicios.includes(s.id);
                      return (
                        <label key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: isChecked ? '1px solid #7a1f1e' : '1px solid #cbd5e1', background: isChecked ? 'rgba(122, 31, 30, 0.08)' : '#f8fafc', cursor: 'pointer', fontSize: '0.85rem', fontWeight: isChecked ? 600 : 400 }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              let updated;
                              if (selectedServicios.length === 0) {
                                if (!e.target.checked) {
                                  updated = servicios.filter(other => other.id !== s.id).map(other => other.id);
                                } else {
                                  updated = [s.id];
                                }
                              } else {
                                if (e.target.checked) {
                                  updated = [...selectedServicios, s.id];
                                } else {
                                  updated = selectedServicios.filter(id => id !== s.id);
                                }
                              }
                              setUserForm({ ...userForm, serviciosIds: JSON.stringify(updated) });
                            }}
                            style={{ accentColor: '#7a1f1e' }}
                          />
                          <span>{s.icono || '⚡'} {s.nombre}</span>
                        </label>
                      );
                    })}
                  </div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                    Selecciona los servicios que puede realizar este operador. Si están todos marcados, podrá realizar cualquier servicio.
                  </small>
                </div>

                {/* Cumpleaños */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>🎂 Cumpleaños (Fecha de Nacimiento)</label>
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={userForm.fechaNacimiento}
                    onChange={(e) => setUserForm({ ...userForm, fechaNacimiento: e.target.value })}
                  />
                </div>

                {/* Vacaciones */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🏖️ Vacaciones Desde</label>
                    <input 
                      type="date" 
                      className={styles.input} 
                      value={userForm.vacacionesInicio}
                      onChange={(e) => setUserForm({ ...userForm, vacacionesInicio: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🏖️ Vacaciones Hasta</label>
                    <input 
                      type="date" 
                      className={styles.input} 
                      value={userForm.vacacionesFin}
                      onChange={(e) => setUserForm({ ...userForm, vacacionesFin: e.target.value })}
                    />
                  </div>
                </div>

                {/* Comisión */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>💰 Modalidad de Comisión</label>
                    <select 
                      className={styles.input}
                      value={userForm.comisionTipo === 'POR_DIA' ? 'POR_HORA' : userForm.comisionTipo}
                      onChange={(e) => setUserForm({ ...userForm, comisionTipo: e.target.value })}
                    >
                      <option value="POR_HORA">Por Hora Trabajada ($)</option>
                      <option value="POR_TURNO">Por Turno Realizado ($)</option>
                      <option value="PORCENTAJE">Porcentaje sobre el Turno (%)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Valor Comisión {userForm.comisionTipo === 'PORCENTAJE' ? '(%)' : userForm.comisionTipo === 'POR_TURNO' ? '(ARS $/turno)' : '(ARS $/hora)'}
                    </label>
                    <input 
                      type="number" 
                      className={styles.input} 
                      value={userForm.comisionValor}
                      onChange={(e) => setUserForm({ ...userForm, comisionValor: e.target.value })}
                      placeholder={userForm.comisionTipo === 'PORCENTAJE' ? 'Ej: 20' : userForm.comisionTipo === 'POR_TURNO' ? 'Ej: 5000' : 'Ej: 4000'}
                      min="0"
                      step="any"
                    />
                  </div>
                </div>

                {/* Estado del Usuario / Operador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: userForm.activo !== false ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: userForm.activo !== false ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <input 
                    type="checkbox" 
                    id="userActivo"
                    checked={userForm.activo !== false}
                    onChange={(e) => setUserForm({ ...userForm, activo: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                  />
                  <label htmlFor="userActivo" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: userForm.activo !== false ? '#16a34a' : '#ef4444' }}>
                    {userForm.activo !== false ? '🟢 Operador Activo (Visible en selectores de agendado)' : '🔒 Operador Bloqueado / Inactivo (Oculto en selectores)'}
                  </label>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUserModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reubicar Feriado Móvil (D-133) */}
      {moveModal.isOpen && (
        <div className="modal-overlay" onClick={() => setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>🗓️ Reubicar Feriado Móvil</h3>
              <button 
                className="modal-close" 
                onClick={() => setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' })}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Estás reubicando el feriado <strong>{moveModal.feriado?.motivo}</strong> (fecha original: {formatFeriadoDate(moveModal.feriado?.fecha)}).
                Selecciona la nueva fecha para la que se moverá (ej. feriado puente):
              </p>
              <div className={styles.formField}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Nueva Fecha Destino *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={moveModal.nuevaFechaStr}
                  onChange={(e) => setMoveModal(prev => ({ ...prev, nuevaFechaStr: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveMoveFeriado}
                disabled={!moveModal.nuevaFechaStr}
              >
                💾 Guardar Nueva Fecha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Box (Fase 3) */}
      {isBoxModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBoxModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>{editingBox ? 'Editar Box / Cabina' : 'Crear Nuevo Box / Cabina'}</h3>
              <button className="modal-close" onClick={() => setIsBoxModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveBox}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre del Box / Cabina *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={boxForm.nombre}
                    onChange={(e) => setBoxForm({ ...boxForm, nombre: e.target.value })}
                    placeholder="Ej: Box 2 - Secundario, Cabina Masajes"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Descripción / Equipamiento</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={boxForm.descripcion}
                    onChange={(e) => setBoxForm({ ...boxForm, descripcion: e.target.value })}
                    placeholder="Ej: Camilla 2, Láser Soprano Titanium"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Hora de Apertura *</label>
                    <input
                      type="time"
                      className={styles.input}
                      value={boxForm.horaInicio}
                      onChange={(e) => setBoxForm({ ...boxForm, horaInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Hora de Cierre *</label>
                    <input
                      type="time"
                      className={styles.input}
                      value={boxForm.horaFin}
                      onChange={(e) => setBoxForm({ ...boxForm, horaFin: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Días de Atención Habilitados</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {[
                      { id: '1', label: 'Lun' },
                      { id: '2', label: 'Mar' },
                      { id: '3', label: 'Mié' },
                      { id: '4', label: 'Jue' },
                      { id: '5', label: 'Vie' },
                      { id: '6', label: 'Sáb' },
                      { id: '0', label: 'Dom' }
                    ].map(d => {
                      const selectedDays = (boxForm.diasAtencion || '').split(',').map(s => s.trim());
                      const isSelected = selectedDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            let newDays;
                            if (isSelected) {
                              newDays = selectedDays.filter(x => x !== d.id);
                            } else {
                              newDays = [...selectedDays, d.id];
                            }
                            setBoxForm({ ...boxForm, diasAtencion: newDays.join(',') });
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #7a1f1e' : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? '#7a1f1e' : '#f8fafc',
                            color: isSelected ? '#ffffff' : '#334155',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Servicio Específico Asociado</label>
                  <select
                    className={styles.input}
                    value={boxForm.servicioId}
                    onChange={(e) => setBoxForm({ ...boxForm, servicioId: e.target.value })}
                  >
                    <option value="">✨ Todos los servicios permitidos</option>
                    {servicios.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.icono || '⚡'} {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Color Identificador en la Agenda</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="color"
                      value={boxForm.color}
                      onChange={(e) => setBoxForm({ ...boxForm, color: e.target.value })}
                      style={{ width: '42px', height: '36px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['#7a1f1e', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#475569'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBoxForm({ ...boxForm, color: c })}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: boxForm.color === c ? '2.5px solid #000' : '1px solid rgba(0,0,0,0.15)',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {!editingBox?.esPrincipal && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="boxActivo"
                      checked={boxForm.activo}
                      onChange={(e) => setBoxForm({ ...boxForm, activo: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#7a1f1e' }}
                    />
                    <label htmlFor="boxActivo" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                      Box activo para agendamiento de turnos
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsBoxModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#7a1f1e', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700 }}
                >
                  {editingBox ? 'Guardar Cambios' : 'Crear Box'}
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
