'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { calculateTurnDetails } from '@/lib/calculations.js';

// Custom icons using standard SVG tags for simplicity and reliability
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const DollarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

export default function Home() {
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    nombreCompleto: '',
    whatsapp: '',
    email: '',
    dni: '',
    observaciones: '',
    otroZona: ''
  });

  const [dniChecked, setDniChecked] = useState(false);
  const [searchingDni, setSearchingDni] = useState(false);
  
  const [selectedZones, setSelectedZones] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // string YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState(null); // { horaInicio, horaFin }
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [activeTurno, setActiveTurno] = useState(null);
  const [isSelfManagement, setIsSelfManagement] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [selfMgmtSuccess, setSelfMgmtSuccess] = useState(null);

  // 1. Fetch default zones on mount
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

  // 2. Generate scrollable list of next 30 business days (excluding Saturday & Sunday)
  const [dateList, setDateList] = useState([]);
  useEffect(() => {
    const dates = [];
    let current = new Date();
    // Always start from tomorrow (do not allow today's booking)
    current.setDate(current.getDate() + 1);
    
    let count = 0;
    while (count < 30) {
      const day = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (day !== 0 && day !== 6) {
        dates.push(new Date(current));
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    setDateList(dates);
  }, []);

  // 3. Trigger availability query when selectedDate or selectedZones changes
  useEffect(() => {
    if (!selectedDate || selectedZones.length === 0) return;
    
    setLoadingSlots(true);
    setSelectedSlot(null);
    setErrorMessage('');
    
    const details = calculateTurnDetails(selectedZones, false); // assume normal for slots duration
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    fetch(`/api/disponibilidad?fecha=${dateStr}&duracion=${details.duracionMinutos}`)
      .then(res => res.json())
      .then(data => {
        if (data.slots) {
          setAvailableSlots(data.slots);
        } else if (data.error) {
          setErrorMessage(data.error);
        }
      })
      .catch(err => {
        console.error('Error fetching slots:', err);
        setErrorMessage('Error al cargar horarios disponibles.');
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate, selectedZones]);

  // Handle Email validation and check
  const handleDniCheck = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setErrorMessage('Por favor, ingresa tu Email.');
      return;
    }
    
    setSearchingDni(true);
    setErrorMessage('');
    
    try {
      const res = await fetch(`/api/clientes/consultar?email=${encodeURIComponent(formData.email.trim())}`);
      const data = await res.json();
      
      if (data.error) {
        setErrorMessage(data.error);
        return;
      }
      
      if (data.exists) {
        const fullName = data.client.nombreCompleto || '';
        const spaceIndex = fullName.indexOf(' ');
        const nombre = spaceIndex !== -1 ? fullName.substring(0, spaceIndex) : fullName;
        const apellido = spaceIndex !== -1 ? fullName.substring(spaceIndex + 1) : '';

        setFormData(prev => ({
          ...prev,
          nombre,
          apellido,
          nombreCompleto: fullName,
          whatsapp: data.client.whatsapp,
          email: data.client.email,
          dni: data.client.dni || ''
        }));

        if (data.hasActiveTurno) {
          const list = data.activeTurnos && data.activeTurnos.length > 0 ? data.activeTurnos : (data.activeTurno ? [data.activeTurno] : []);
          setActiveTurnos(list);
          setActiveTurno(list[0] || null);
          setIsSelfManagement(true);
          return;
        }
        
        setDniChecked(true);
        setStep(2);
      } else {
        setDniChecked(true);
      }
    } catch (err) {
      console.error('Error checking Email:', err);
      setErrorMessage('Error al verificar el Email. Por favor intenta nuevamente.');
    } finally {
      setSearchingDni(false);
    }
  };

  const handleCancelActiveTurno = async (targetTurno = activeTurno) => {
    if (!targetTurno) return;
    
    const now = new Date();
    const turnTime = new Date(targetTurno.fecha);
    const [h, m] = targetTurno.horaInicio.split(':').map(Number);
    turnTime.setUTCHours(h, m, 0, 0);
    const diffMs = turnTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const confirmMsg = '⚠️ Tu turno será cancelado y el horario se liberará. Tené en cuenta que al cancelar por autogestión perderás la seña abonada, sin importar la anticipación con la que lo hagas (no hay devolución ni transferencia de seña). ¿Deseas confirmar la cancelación?';
    
    if (!window.confirm(confirmMsg)) return;
    
    setSubmittingCancel(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/reservas/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId: targetTurno.id, email: formData.email })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setSelfMgmtSuccess({
          type: 'cancel',
          message: 'Tu turno ha sido cancelado con éxito. Se ha enviado un correo y mensaje de WhatsApp de confirmación.'
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Ocurrió un error al procesar la cancelación.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleRescheduleActiveTurno = (targetTurno = activeTurno) => {
    if (!targetTurno) return;
    setActiveTurno(targetTurno);
    
    const now = new Date();
    const turnTime = new Date(targetTurno.fecha);
    const [h, m] = targetTurno.horaInicio.split(':').map(Number);
    turnTime.setUTCHours(h, m, 0, 0);
    const diffMs = turnTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 72) {
      const confirmNew = window.confirm('⚠️ Faltan menos de 72 hs para tu turno. Si reprogramás ahora, se perderá la seña actual y deberás registrar un nuevo turno abonando una nueva seña.\n\n¿Deseas cancelar el turno actual para poder reservar uno nuevo?');
      if (confirmNew) {
        setSubmittingCancel(true);
        fetch('/api/reservas/cancelar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnoId: targetTurno.id, email: formData.email })
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setErrorMessage(data.error);
          } else {
            setActiveTurno(null);
            setActiveTurnos([]);
            setIsSelfManagement(false);
            setDniChecked(true);
            setStep(2);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorMessage('Error al procesar el cambio.');
        })
        .finally(() => {
          setSubmittingCancel(false);
        });
      }
    } else {
      try {
        const turnZones = JSON.parse(targetTurno.zonas).map(z => ({
          id: z.id,
          nombre: z.nombre,
          precioBase: z.precio || z.precioBase || 0,
          duracionMinutos: z.duracion || z.duracionMinutos || 0,
          señaBase: z.seña || z.señaBase || 0
        }));
        setSelectedZones(turnZones);
        setRescheduleMode(true);
        setStep(2);
      } catch (err) {
        setErrorMessage('Error al leer las zonas del turno actual. Por favor, comunícate con nosotros.');
      }
    }
  };

  const handleConfirmReschedule = async () => {
    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar las indicaciones previas para proceder.');
      return;
    }
    
    setLoadingCheckout(true);
    setErrorMessage('');
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch('/api/reservas/reprogramar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: activeTurno.id,
          email: formData.email,
          fechaStr: dateStr,
          horaInicio: selectedSlot.horaInicio
        })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setSelfMgmtSuccess({
          type: 'reschedule',
          message: 'Tu turno ha sido reprogramado con éxito. Se ha enviado un correo y mensaje de WhatsApp de confirmación con los nuevos detalles.'
        });
        setStep(1);
        setIsSelfManagement(true);
        setRescheduleMode(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Ocurrió un error al procesar la reprogramación.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  // Handle personal info submit
  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.apellido || !formData.whatsapp || !formData.email) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
      return;
    }
    formData.nombreCompleto = `${formData.nombre.trim()} ${formData.apellido.trim()}`.trim();
    setErrorMessage('');
    setStep(2);
  };

  // Handle zone selection toggle
  const toggleZone = (zone) => {
    setSelectedSlot(null); // clear slots if zones change duration
    const exists = selectedZones.find(z => z.id === zone.id);
    if (exists) {
      setSelectedZones(selectedZones.filter(z => z.id !== zone.id));
    } else {
      // If "Cuerpo Completo" is selected, deselect others, or vice versa
      if (zone.nombre === "Cuerpo Completo") {
        setSelectedZones([zone]);
      } else {
        setSelectedZones([...selectedZones.filter(z => z.nombre !== "Cuerpo Completo"), zone]);
      }
    }
  };

  const handleNextStep2 = () => {
    if (selectedZones.length === 0) {
      setErrorMessage('Por favor, selecciona al menos una zona a depilar.');
      return;
    }
    setErrorMessage('');
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!selectedDate || !selectedSlot) {
      setErrorMessage('Por favor, selecciona un día y horario para tu turno.');
      return;
    }
    setErrorMessage('');
    setStep(4);
  };

  // Submit appointment to backend and redirect to MercadoPago
  const handleCheckout = async () => {
    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar las indicaciones previas para proceder.');
      return;
    }
    
    setLoadingCheckout(true);
    setErrorMessage('');
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const zoneIds = selectedZones.map(z => z.id);
    
    // Concatenate "Otro" zone text to observations if selected
    let obs = formData.observaciones;
    if (selectedZones.some(z => z.nombre === 'Otro') && formData.otroZona) {
      obs = `[Zona solicitada: ${formData.otroZona}] ${obs}`;
    }

    try {
      const res = await fetch('/api/reservas/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCompleto: formData.nombreCompleto,
          whatsapp: formData.whatsapp,
          email: formData.email,
          dni: formData.dni,
          fechaStr: dateStr,
          horaInicio: selectedSlot.horaInicio,
          selectedZoneIds: zoneIds,
          observaciones: obs
        })
      });

      const data = await res.json();
      
      if (data.success && data.initPoint) {
        // Redirect client to MercadoPago Checkout
        window.location.href = data.initPoint;
      } else {
        setErrorMessage(data.error || 'Ocurrió un error al crear la reserva.');
        setLoadingCheckout(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage('Error de red. Intenta nuevamente.');
      setLoadingCheckout(false);
    }
  };

  // Calculate prices dynamically for Step 2+
  // Use isNewClient=false to match the availability API which also uses false
  const calculatedDetails = calculateTurnDetails(selectedZones, false);

  const progressPercent = ((step - 1) / 3) * 100;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <img src="/logo.png" alt="Gonzalo Depilación para Hombres" style={{ width: '240px', height: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.35))' }} />
          </div>
          <a href="/login" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#000000', borderColor: 'rgba(0, 0, 0, 0.4)', fontWeight: 600 }}>
            Acceso Interno
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        {/* Step Indicator */}
        <div className={styles.stepsContainer}>
          <div className={styles.progressBar} style={{ width: `${progressPercent}%` }}></div>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''} ${step > 1 ? styles.stepDotCompleted : ''}`}>1</div>
          <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''} ${step > 2 ? styles.stepDotCompleted : ''}`}>2</div>
          <div className={`${styles.stepDot} ${step >= 3 ? styles.stepDotActive : ''} ${step > 3 ? styles.stepDotCompleted : ''}`}>3</div>
          <div className={`${styles.stepDot} ${step >= 4 ? styles.stepDotActive : ''} ${step > 4 ? styles.stepDotCompleted : ''}`}>4</div>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(198, 40, 40, 0.1)',
            border: '1px solid var(--status-cancelado)',
            color: '#ff8a8a',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            {errorMessage}
          </div>
        )}

        {/* STEP 1: Personal Info or Self-Management */}
        {step === 1 && (
          isSelfManagement ? (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Gestionar mi Turno</h2>
              {selfMgmtSuccess ? (
                <div className="glass-card premium-border" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h3 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>¡Operación exitosa!</h3>
                  <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>{selfMgmtSuccess.message}</p>
                  <button
                    onClick={() => {
                      setIsSelfManagement(false);
                      setActiveTurno(null);
                      setSelfMgmtSuccess(null);
                      setDniChecked(false);
                      setFormData(prev => ({ ...prev, email: '' }));
                    }}
                    className="btn btn-primary"
                  >
                    Volver al inicio
                  </button>
                </div>
              ) : (
                <div>
                  <p className={styles.sectionSubtitle}>
                    Hola <strong>{formData.nombreCompleto || activeTurno?.cliente?.nombreCompleto}</strong>, aquí podés consultar y gestionar {activeTurnos.length > 1 ? 'tus turnos activos' : 'tu turno activo'}.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                    {(activeTurnos.length > 0 ? activeTurnos : (activeTurno ? [activeTurno] : [])).map((t, idx) => {
                      let zonasFormatted = '';
                      try {
                        zonasFormatted = JSON.parse(t.zonas).map(z => z.nombre).join(', ');
                      } catch (e) {
                        zonasFormatted = t.zonas;
                      }

                      return (
                        <div key={t.id || idx} className="glass-card premium-border" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {activeTurnos.length > 1 && (
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-gold)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                              Turno {idx + 1} de {activeTurnos.length}
                            </div>
                          )}
                          <div className={styles.summaryRow}>
                            <span>Día del Turno:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {new Date(t.fecha).toLocaleDateString('es-ES', { dateStyle: 'full', timeZone: 'UTC' })}
                            </span>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Horario:</span>
                            <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>
                              {t.horaInicio} a {t.horaFin}
                            </span>
                          </div>
                          <div className={styles.summaryRow} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span>Zonas contratadas:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
                              {zonasFormatted}
                            </span>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Seña abonada:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              ${t.valorSeña.toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Saldo a pagar en el local:</span>
                            <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>
                              ${(t.valorTotal - t.valorSeña).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                            <button 
                              onClick={() => handleRescheduleActiveTurno(t)} 
                              className="btn btn-primary" 
                              disabled={submittingCancel || submittingReschedule}
                              style={{ flex: 1 }}
                            >
                              🔄 Reprogramar
                            </button>

                            <button 
                              onClick={() => handleCancelActiveTurno(t)} 
                              className="btn btn-secondary" 
                              disabled={submittingCancel || submittingReschedule}
                              style={{ flex: 1, borderColor: '#ff5252', color: '#ffb4b4', backgroundColor: 'rgba(255,82,82,0.05)' }}
                            >
                              {submittingCancel ? 'Cancelando...' : '❌ Cancelar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => {
                      setIsSelfManagement(false);
                      setActiveTurno(null);
                      setActiveTurnos([]);
                      setDniChecked(false);
                      setFormData(prev => ({ ...prev, email: '' }));
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    Volver al inicio
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Datos Personales</h2>
              <p className={styles.sectionSubtitle}>Completá tus datos para iniciar la reserva del turno online.</p>

              {!dniChecked ? (
                <form onSubmit={handleDniCheck}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Ingresá tu Email (Correo Electrónico) *</label>
                  <input
                    type="email"
                    placeholder="Ej. juan@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>
                    Utilizamos tu Email para identificarte de forma segura y agilizar tu reserva.
                  </small>
                </div>
                <div className={styles.actionsBar} style={{ justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={searchingDni}>
                    {searchingDni ? 'Verificando...' : 'Continuar'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleNextStep1}>
                <div className={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.inputLabel}>Email</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setDniChecked(false);
                        setFormData(prev => ({ ...prev, email: '', nombreCompleto: '', whatsapp: '', dni: '' }));
                      }} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Modificar Email
                    </button>
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.inputLabel}>Nombre *</label>
                    <input
                      type="text"
                      placeholder="Ej. Gonzalo"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.inputLabel}>Apellido *</label>
                    <input
                      type="text"
                      placeholder="Ej. Pérez"
                      value={formData.apellido || ''}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Teléfono / WhatsApp *</label>
                  <div className={styles.phoneInputContainer}>
                    <div className={styles.phonePrefix}>
                      <span className={styles.flagIcon}>🇦🇷</span>
                      <span>+54</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="Ej. 11 7673 5678 (Celular sin 0 ni 15)"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      required
                      style={{ border: 'none', borderRadius: 0, flex: 1, padding: '0.75rem', outline: 'none', backgroundColor: 'transparent' }}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>DNI (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 12345678"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                  />
                  <small style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>
                    Opcional. Permite registrar tu documento para gestiones administrativas.
                  </small>
                </div>

                <div className={styles.actionsBar} style={{ justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary">Siguiente Paso</button>
                </div>
              </form>
            )}
          </div>
        ))}

        {/* STEP 2: Zone Selection */}
        {step === 2 && (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{rescheduleMode ? 'Zonas de tu Turno' : 'Zonas de Depilación'}</h2>
            {rescheduleMode ? (
              <div>
                <p className={styles.sectionSubtitle}>Zonas contratadas del turno que estás reprogramando:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                  {selectedZones.map((z, idx) => (
                    <div key={idx} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontWeight: 600 }}>{z.nombre}</span>
                      <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>${(z.precioBase || z.precio || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.actionsBar}>
                  <button onClick={() => {
                    setRescheduleMode(false);
                    setIsSelfManagement(true);
                    setStep(1);
                  }} className="btn btn-secondary">Atrás</button>
                  <button onClick={() => setStep(3)} className="btn btn-primary">Elegir Horario</button>
                </div>
              </div>
            ) : (
              <>
                <p className={styles.sectionSubtitle}>Selecciona una o más zonas corporales para realizarte el tratamiento.</p>

                <div className={styles.zonesGrid}>
                  {zones.map((zone) => {
                    const isActive = selectedZones.some(z => z.id === zone.id);
                    return (
                      <div
                        key={zone.id}
                        className={`${styles.zoneCard} ${isActive ? styles.zoneCardActive : ''}`}
                        onClick={() => toggleZone(zone)}
                      >
                        <div className={styles.zoneInfo}>
                          <span className={styles.zoneName}>{zone.nombre}</span>
                          <div className={styles.zoneMeta}>
                            <span className={styles.zoneMetaItem}>
                              <ClockIcon /> {zone.duracionMinutos} min
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span className={styles.zonePrice}>${zone.precioBase.toLocaleString()}</span>
                          <div className={`${styles.checkbox} ${isActive ? styles.checkboxActive : ''}`}>
                            {isActive && '✓'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-form if "Otro" is selected */}
                {selectedZones.some(z => z.nombre === 'Otro') && (
                  <div className={styles.inputGroup} style={{ animation: 'fadeIn 0.3s ease' }}>
                    <label className={styles.inputLabel}>Especificá qué zona deseas depilar y te contactaremos para cotizar *</label>
                    <input
                      type="text"
                      placeholder="Ej. Espalda completa y hombros"
                      value={formData.otroZona}
                      onChange={(e) => setFormData({ ...formData, otroZona: e.target.value })}
                      required
                    />
                  </div>
                )}

                {selectedZones.length > 0 && (
                  <div className="glass-card premium-border" style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-gold)' }}>Resumen del Servicio</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Duración estimada:</span>
                      <span style={{ fontWeight: 600 }}>{calculatedDetails.duracionMinutos} minutos</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Precio Total Estimado:</span>
                      <span style={{ fontWeight: 600 }}>${calculatedDetails.valorTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-gold)' }}>
                      <span>Seña a abonar hoy (MercadoPago):</span>
                      <span style={{ fontWeight: 700 }}>${calculatedDetails.valorSeña.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className={styles.actionsBar}>
                  <button onClick={() => setStep(1)} className="btn btn-secondary">Atrás</button>
                  <button onClick={handleNextStep2} className="btn btn-primary">Elegir Horario</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3: Day & Time Selection */}
        {step === 3 && (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Elegí Día y Horario</h2>
            <p className={styles.sectionSubtitle}>Selecciona el día de tu turno. Solo se mostrarán los horarios de atención disponibles.</p>

            <label className={styles.inputLabel}>Seleccionar Día</label>
            <div className={styles.datesContainer}>
              {dateList.map((date, index) => {
                const isActive = selectedDate && selectedDate.toDateString() === date.toDateString();
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
                return (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.dateButton} ${isActive ? styles.dateButtonActive : ''}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className={styles.dateDayName}>{dayName}</span>
                    <span className={styles.dateDayNumber}>{date.getDate()}</span>
                    <span className={styles.dateMonthName}>{monthName}</span>
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <label className={styles.inputLabel}>Horarios Disponibles para {selectedDate.toLocaleDateString('es-ES', { dateStyle: 'long' })}</label>
                
                {loadingSlots ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-gold)' }}>
                    Cargando horarios disponibles...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className={styles.emptyState}>
                    No hay horarios disponibles en este día para la duración seleccionada. Por favor, elegí otra fecha.
                  </div>
                ) : (
                  <div className={styles.slotsGrid}>
                    {availableSlots.map((slot, index) => {
                      const isActive = selectedSlot && selectedSlot.horaInicio === slot.horaInicio;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`${styles.slotButton} ${isActive ? styles.slotButtonActive : ''}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot.horaInicio}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className={styles.actionsBar}>
              <button onClick={() => setStep(2)} className="btn btn-secondary">Atrás</button>
              <button
                onClick={handleNextStep3}
                className="btn btn-primary"
                disabled={!selectedSlot}
              >
                Confirmar Reserva
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Checkout Summary and MercadoPago */}
        {step === 4 && (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{rescheduleMode ? 'Confirmar Reprogramación' : 'Confirmación y Pago'}</h2>
            <p className={styles.sectionSubtitle}>
              {rescheduleMode 
                ? 'Revisa los nuevos detalles de tu turno y confirma para aplicar los cambios. Tu seña se conservará.' 
                : 'Revisa los detalles de tu turno y procede al pago de la seña por MercadoPago.'}
            </p>

            <div className="glass-card premium-border" style={{ marginBottom: '2rem' }}>
              <div className={styles.summaryRow}>
                <span>Nombre Completo:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.nombreCompleto}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>WhatsApp:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.whatsapp}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Día del Turno:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedDate.toLocaleDateString('es-ES', { dateStyle: 'full' })}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Horario:</span>
                <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>
                  {selectedSlot.horaInicio} a {selectedSlot.horaFin} ({calculatedDetails.duracionMinutos} min)
                </span>
              </div>
              <div className={styles.summaryRow} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>Zonas seleccionadas:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
                  {selectedZones.map(z => z.nombre === 'Otro' ? formData.otroZona : z.nombre).join(', ')}
                </span>
              </div>

              <div className={styles.summaryContainer}>
                <div className={styles.summaryRow}>
                  <span>Valor Total:</span>
                  <span>${calculatedDetails.valorTotal.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRowSeña}>
                  <span>{rescheduleMode ? 'Seña (ya abonada):' : 'Seña a abonar:'}</span>
                  <span>${calculatedDetails.valorSeña.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRowTotal}>
                  <span>Saldo a abonar en el local:</span>
                  <span>${(calculatedDetails.valorTotal - calculatedDetails.valorSeña).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Pre-treatment Instructions */}
            <div className={styles.instructionsCard}>
              <h3 className={styles.instructionsTitle}>
                ⚠️ Indicaciones Previas Importantes
              </h3>
              <ul className={styles.instructionsList}>
                <li><span>Tenés que venir <strong>afeitado al ras</strong> con maquinita de afeitar (24hs antes) en las zonas a depilar. No uses cera ni pinza de depilar.</span></li>
                <li><span>Por favor, asiste con puntualidad. Al ser turnos cortos y precisos, la tolerancia de demora es de solo <strong>5 minutos</strong>.</span></li>
                <li><span>Dirección del estudio: <strong>Paraná 597, Piso 8, Depto 48 (Tribunales, CABA)</strong>.</span></li>
              </ul>
            </div>

            {/* Checkbox to accept terms */}
            <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '2rem' }}>
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ width: 'auto', marginTop: '0.25rem', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Confirmo que he leído y acepto venir afeitado al ras y las políticas de demora del local.
              </label>
            </div>

            <div className={styles.actionsBar}>
              <button onClick={() => setStep(3)} className="btn btn-secondary" disabled={loadingCheckout}>Atrás</button>
              {rescheduleMode ? (
                <button
                  onClick={handleConfirmReschedule}
                  className="btn btn-primary"
                  style={{ background: 'var(--color-gold)', color: '#000' }}
                  disabled={!acceptedTerms || loadingCheckout}
                >
                  {loadingCheckout ? 'Procesando...' : 'Confirmar Reprogramación'}
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  className="btn btn-primary"
                  style={{ background: '#009ee3', color: '#fff' }} // MercadoPago blue style
                  disabled={!acceptedTerms || loadingCheckout}
                >
                  {loadingCheckout ? 'Creando Reserva...' : 'Pagar Seña con MercadoPago'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Gonzalo Depilación para Hombres</p>
          <div className={styles.footerLinks}>
            <a href="https://www.instagram.com/depilacionparahombres/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              <span>📸 Instagram: @depilacionparahombres</span>
            </a>
            <a href="https://depilacionparahombres.com/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              <span>🌐 Sitio Web</span>
            </a>
            <span className={styles.footerLink}>
              📍 Paraná 597, Piso 8, Depto 48, Tribunales, CABA
            </span>
          </div>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.9918239088616!2d-58.3888365!3d-34.6043694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bccac0b790d96d%3A0xc3cf9e3c9cf1c26b!2sParan%C3%A1%20597%2C%20C1017%20CABA!5e0!3m2!1ses-419!2sar!4v1781197942000!5m2!1ses-419!2sar"
            className={styles.mapsEmbed}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          <p style={{ fontSize: '0.75rem', marginTop: '2rem', color: 'var(--text-muted)' }}>
            © 2026 Gonzalo Depilación. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
