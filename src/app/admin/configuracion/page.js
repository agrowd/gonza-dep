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
    telefono: ''
  });

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
    fetchZones();
    fetchConfigs();
    fetchPromociones();
    fetchCupones();
    fetchUsers();
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
          señaBase: calculatedSena
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
    if (!zoneForm.nombre || !zoneForm.duracionMinutos) {
      showToast('Por favor, completa todos los campos requeridos.', 'error');
      return;
    }

    try {
      const calculatedSena = Math.round(Number(zoneForm.precioBase || 0) * 0.5);
      const res = await fetch('/api/zonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: zoneForm.nombre,
          precioBase: Number(zoneForm.precioBase || 0),
          duracionMinutos: Number(zoneForm.duracionMinutos),
          señaBase: calculatedSena
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Configuración del Sistema</h2>
        <p>Administra las zonas de depilación, los horarios de atención, las plantillas y los parámetros operativos.</p>
      </div>

      {/* Mobile Dropdown Selector (como en Estadísticas) */}
      <div className={styles.tabDropdownWrapper}>
        <label className={styles.tabDropdownLabel}>
          <SettingsIcon /> Seleccionar Ventana / Sección:
        </label>
        <select
          className={styles.tabSelectDropdown}
          value={activeTab}
          onChange={(e) => {
            const tab = e.target.value;
            setActiveTab(tab);
            if (tab === 'users') fetchUsers();
            if (tab === 'promos') { fetchPromociones(); fetchCupones(); }
          }}
        >
          <option value="zones">📍 Zonas de Depilación</option>
          <option value="hours">🕒 Horarios Laborales</option>
          <option value="templates">✉️ Mensajes y Plantillas</option>
          <option value="parametros">⚙️ Parámetros del Sistema</option>
          <option value="promos">🎁 Promociones y Cupones</option>
          <option value="users">👥 Usuarios y Operadores</option>
        </select>
      </div>

      {/* Tabs Selector (Desktop) */}
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
        <button 
          className={`${styles.tab} ${activeTab === 'parametros' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('parametros')}
        >
          ⚙️ Parámetros
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'promos' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('promos');
            fetchPromociones();
            fetchCupones();
          }}
        >
          🎁 Promociones y Cupones
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('users');
            fetchUsers();
          }}
        >
          👥 Usuarios y Operadores
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
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Precio Base ($) (Automático Web)</label>
                                    <input 
                                      type="number" 
                                      className={styles.input} 
                                      value={zoneForm.precioBase}
                                      readOnly
                                      disabled
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                      title="El precio se toma automáticamente de la web y no se puede modificar manualmente"
                                    />
                                  </div>
                                  <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Seña (50% Automático)</label>
                                    <input 
                                      type="number" 
                                      className={styles.input} 
                                      value={Math.round(Number(zoneForm.precioBase || 0) * 0.5)}
                                      readOnly
                                      disabled
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                      title="La seña se calcula automáticamente como la mitad (50%) del valor de la zona"
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
                  <option value="ZONA_MAX_MAS_TERCIO">
                    ⭐ Zona más larga + ⅓ del resto (si son 4+ zonas resta 10 min, redondeo a 10 min) [Recomendada]
                  </option>
                  <option value="ZONA_MAX_MAS_10MIN">
                    Zona más larga + 10 min por zona adicional (Axilas, Hombros y Genitales 0 min)
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
        </div>
      )}

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
                    {u.email && (
                      <div className={styles.userCardDetailItem}>
                        <span>✉️</span>
                        <span style={{ wordBreak: 'break-all' }}>{u.email}</span>
                      </div>
                    )}
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
                  <label className={styles.label}>Precio Base (ARS) (Automático Web)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={zoneForm.precioBase}
                    readOnly
                    disabled
                    placeholder="Tomado automáticamente de la web"
                    style={{ opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    title="El precio se toma automáticamente de la web y no se puede modificar manualmente"
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
                    placeholder="50% del valor de la zona"
                    style={{ opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    title="La seña se calcula automáticamente como la mitad del precio base"
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
