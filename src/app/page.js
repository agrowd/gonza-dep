'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { calculateTurnDetails } from '@/lib/calculations.js';
import PhoneInput from '@/components/PhoneInput.js';
import { buildFullPhone } from '@/lib/countryCodes.js';

// SVG Icons
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const DollarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

const WhatsAppIcon = () => (
  <svg className={styles.whatsappIconSvg} viewBox="0 0 24 24">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.53.07-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.06 0 1.21.89 2.39 1.01 2.55.12.17 1.75 2.67 4.23 3.74.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
  </svg>
);

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Home() {
  // Step Management: 1=Identificación, 2=Zonas, 3=Calendario & Horarios, 4=Confirmación
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState([]);
  
  // Step 1: Client & Identification State
  const [emailInput, setEmailInput] = useState('');
  const [clientChecked, setClientChecked] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [existingClient, setExistingClient] = useState(null);
  const [activeTurno, setActiveTurno] = useState(null);
  const [activeTurnos, setActiveTurnos] = useState([]);

  // Form data for deferred registration (kept in memory, NOT in DB until booking)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    whatsapp: '',
    whatsappCountry: '54',
    whatsappCustomCode: '',
    dni: '',
    observaciones: ''
  });

  // Reschedule & 72hs policy state
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [show72hsAlert, setShow72hsAlert] = useState(false);
  const [alert72hsMessage, setAlert72hsMessage] = useState('');

  // Step 2: Selected Zones State
  const [selectedZoneIds, setSelectedZoneIds] = useState([]);

  // Step 3: Calendar & Availability State (Alta de Turno model)
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1); // 1-12
  const [monthData, setMonthData] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 4: Submission & WhatsApp Bypass
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Zones catalog on mount
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

  // 2. Compute calculated duration, total price, and seña
  const activeZoneObjs = useMemo(() => {
    return zones.filter(z => selectedZoneIds.includes(z.id));
  }, [zones, selectedZoneIds]);

  const calculations = useMemo(() => {
    return calculateTurnDetails(activeZoneObjs, false);
  }, [activeZoneObjs]);

  const valorTotal = calculations.valorTotal;
  const valorSeña = calculations.valorSeña;
  const duracionMinutos = calculations.duracionMinutos > 0 ? calculations.duracionMinutos : 30;
  const isThresholdMet = valorTotal >= 65000;

  // 3. Client Lookup by Email (Step 1)
  const handleLookupEmail = async (e) => {
    if (e) e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Por favor, ingresá un correo electrónico válido.');
      return;
    }

    setSearchingClient(true);
    setErrorMessage('');
    setShow72hsAlert(false);

    try {
      const res = await fetch(`/api/clientes/consultar?email=${encodeURIComponent(emailInput.trim())}`);
      const data = await res.json();

      setClientChecked(true);

      if (data.exists && data.client) {
        setExistingClient(data.client);
        // Split name if possible
        const parts = (data.client.nombreCompleto || '').split(' ');
        const nom = parts[0] || '';
        const ape = parts.slice(1).join(' ') || '';
        setFormData(prev => ({
          ...prev,
          nombre: nom,
          apellido: ape,
          whatsapp: data.client.whatsapp || '',
          dni: data.client.dni || ''
        }));

        if (data.hasActiveTurno && data.activeTurno) {
          setActiveTurno(data.activeTurno);
          setActiveTurnos(data.activeTurnos || [data.activeTurno]);
        } else {
          setActiveTurno(null);
          setActiveTurnos([]);
        }
      } else {
        // Deferred client: does not exist yet
        setExistingClient(null);
        setActiveTurno(null);
        setActiveTurnos([]);
      }
    } catch (err) {
      console.error('Error querying client:', err);
      setErrorMessage('No se pudo verificar el correo. Por favor, intentá nuevamente.');
    } finally {
      setSearchingClient(false);
    }
  };

  // 4. Handle "Reagendar Turno" with 72hs policy check
  const handleInitiateReschedule = (turno) => {
    setErrorMessage('');
    const targetTurno = turno || activeTurno;
    if (!targetTurno) return;

    // Check 72 hours rule
    const nowLocal = new Date();
    const [h, m] = (targetTurno.horaInicio || '12:00').split(':').map(Number);
    const turnDate = new Date(targetTurno.fecha);
    turnDate.setHours(h, m, 0, 0);

    const diffHours = (turnDate.getTime() - nowLocal.getTime()) / (1000 * 60 * 60);

    if (diffHours < 72) {
      setShow72hsAlert(true);
      setAlert72hsMessage(
        'Faltan menos de 72 horas para tu turno. Por políticas de la empresa, no es posible conservar la seña al reagendar con menos de 72hs de anticipación. Se deberá agendar un nuevo turno.'
      );
      return;
    }

    // Direct Horario modification (Salteo de pantalla de zonas como indicó Luciano)
    setRescheduleMode(true);
    setActiveTurno(targetTurno);

    // Extract zone IDs from active turno
    try {
      const parsed = JSON.parse(targetTurno.zonas);
      if (Array.isArray(parsed)) {
        const ids = parsed.map(p => p.id).filter(Boolean);
        if (ids.length > 0) {
          setSelectedZoneIds(ids);
        }
      }
    } catch (e) {
      console.error('Error parsing active turno zones:', e);
    }

    // Jump directly to step 3 (Calendario)
    setStep(3);
  };

  // 5. Handle "Cancelar Turno"
  const handleCancelTurno = async (turno) => {
    const targetTurno = turno || activeTurno;
    if (!targetTurno) return;

    const confirmCancel = window.confirm(
      '¿Estás seguro de que deseás cancelar tu turno? Si cancelás, la seña abonada no es reembolsable según las políticas vigentes.'
    );
    if (!confirmCancel) return;

    setSearchingClient(true);
    try {
      const res = await fetch('/api/reservas/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: targetTurno.id,
          email: emailInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Tu turno ha sido cancelado con éxito.');
        setActiveTurno(null);
        setActiveTurnos([]);
        handleLookupEmail();
      } else {
        alert(data.error || 'No se pudo cancelar el turno.');
      }
    } catch (err) {
      console.error('Error cancelling turno:', err);
      alert('Error de conexión al cancelar.');
    } finally {
      setSearchingClient(false);
    }
  };

  // 6. Proceed from Step 1 to Step 2 (Deferred Client)
  const handleProceedToZones = (e) => {
    if (e) e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setErrorMessage('Por favor, ingresá tu Nombre y Apellido.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setErrorMessage('Por favor, ingresá tu número de WhatsApp.');
      return;
    }
    setErrorMessage('');
    setStep(2);
  };

  // 7. Toggle Zone Selection (Step 2)
  const toggleZone = (id) => {
    setSelectedZoneIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 8. Fetch Monthly Availability (Alta de Turno model)
  const fetchMonthAvailability = useCallback(async (year, month, dur, total) => {
    setLoadingMonth(true);
    setSelectedSlot(null);
    try {
      const q = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        duracion: dur.toString(),
        montoTotal: total.toString()
      });
      if (rescheduleMode && activeTurno) {
        q.set('excludeTurnoId', activeTurno.id);
      }
      const res = await fetch(`/api/disponibilidad?${q.toString()}`);
      const data = await res.json();
      if (data.days) {
        setMonthData(data);
      }
    } catch (err) {
      console.error('Error fetching monthly availability:', err);
    } finally {
      setLoadingMonth(false);
    }
  }, [rescheduleMode, activeTurno]);

  useEffect(() => {
    if (step === 3) {
      fetchMonthAvailability(calendarYear, calendarMonth, duracionMinutos, valorTotal);
    }
  }, [step, calendarYear, calendarMonth, duracionMinutos, valorTotal, fetchMonthAvailability]);

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarYear(prev => prev - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
    setSelectedDateStr(null);
    setSelectedSlot(null);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarYear(prev => prev - 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
    setSelectedDateStr(null);
    setSelectedSlot(null);
  };

  // Calendar Days Grid Array Builder
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1, 12, 0, 0)).getUTCDay();
    // In Argentina: Monday = 0, ..., Sunday = 6
    const leadingBlanks = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ isBlank: true, key: `blank-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayInfo = monthData?.days?.[dateStr] || {
        disponible: false,
        lleno: false,
        motivo: 'CARGANDO',
        slots: []
      };
      cells.push({
        isBlank: false,
        key: dateStr,
        dayNumber: d,
        dateStr,
        dayInfo
      });
    }
    return cells;
  }, [calendarYear, calendarMonth, monthData]);

  // 9. Confirm & "Pagar Seña" WhatsApp Bypass (Step 4)
  const handlePagarSeña = async () => {
    setSubmitting(true);
    setErrorMessage('');

    const fullNombre = `${formData.nombre.trim()} ${formData.apellido.trim()}`.trim();
    const fullPhone = buildFullPhone(formData.whatsappCountry, formData.whatsappCustomCode, formData.whatsapp);

    try {
      if (rescheduleMode && activeTurno) {
        // Reschedule endpoint
        const res = await fetch('/api/reservas/reprogramar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turnoId: activeTurno.id,
            email: emailInput.trim(),
            fechaStr: selectedDateStr,
            horaInicio: selectedSlot.horaInicio
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al reprogramar turno');
        }

        // WhatsApp message for reschedule
        const [y, m, d] = selectedDateStr.split('-');
        const fechaLegible = `${d}/${m}/${y}`;
        const msg = `Hola 👋 Reprogramé mi turno de depilación láser:

Nombre: ${fullNombre || existingClient?.nombreCompleto}
Nueva Fecha: ${fechaLegible}
Nuevo Horario: ${selectedSlot.horaInicio} hs
Duración: ${duracionMinutos} min`;

        const waUrl = `https://wa.me/5492984696364?text=${encodeURIComponent(msg)}`;
        setBookingSuccess({
          isReschedule: true,
          whatsappUrl: waUrl,
          fecha: fechaLegible,
          horario: selectedSlot.horaInicio
        });
        window.location.href = waUrl;
      } else {
        // New Reservation endpoint (Deferred client created here)
        const res = await fetch('/api/reservas/crear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombreCompleto: fullNombre,
            whatsapp: fullPhone,
            email: emailInput.trim(),
            dni: formData.dni.trim() || undefined,
            fechaStr: selectedDateStr,
            horaInicio: selectedSlot.horaInicio,
            selectedZoneIds,
            observaciones: formData.observaciones.trim() || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al agendar reserva');
        }

        setBookingSuccess({
          isReschedule: false,
          whatsappUrl: data.whatsappUrl,
          turno: data.turno
        });

        // Automatically redirect to WhatsApp with the structured message
        if (data.whatsappUrl) {
          window.location.href = data.whatsappUrl;
        }
      }
    } catch (err) {
      console.error('Error in pagar seña:', err);
      setErrorMessage(err.message || 'Error al procesar la reserva. Por favor, intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Selected Day's Slots
  const currentDaySlots = useMemo(() => {
    if (!selectedDateStr || !monthData?.days?.[selectedDateStr]) return [];
    return monthData.days[selectedDateStr].slots || [];
  }, [selectedDateStr, monthData]);

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer} onClick={() => setStep(1)} style={{ cursor: 'pointer' }}>
            <Image
              src="/logo.png"
              alt="Gonzalo Depilación para Hombres"
              width={220}
              height={68}
              priority
              className={styles.logoImg}
            />
          </div>
          {step > 1 && (
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-gold)' }}>
              Paso {step} de 4
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.main}>
        {errorMessage && (
          <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' }}>
            {errorMessage}
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL / SCREEN */}
        {bookingSuccess ? (
          <div style={{ background: '#ffffff', border: '2px solid #22c55e', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 8px 30px rgba(34, 197, 94, 0.15)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem' }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
              ¡Tu turno ha sido guardado!
            </h2>
            <p style={{ color: '#475569', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              Para confirmar tu lugar, estamos abriendo WhatsApp para que nos envíes los datos y te enviemos la información para abonar la seña.
            </p>

            <a
              href={bookingSuccess.whatsappUrl}
              className={styles.btnPagarSena}
              style={{ maxWidth: '360px', margin: '0 auto', display: 'inline-flex' }}
            >
              <WhatsAppIcon />
              Abrir WhatsApp Ahora
            </a>

            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
              >
                Volver al inicio
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* =========================================================
                PASO 1: IDENTIFICACIÓN Y REGISTRO DIFERIDO
               ========================================================= */}
            {step === 1 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Reserva tu Turno Online
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Ingresá tu correo electrónico para gestionar o agendar tu sesión de depilación láser.
                  </p>
                </div>

                {/* Email Verification Box */}
                <form onSubmit={handleLookupEmail} style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                  <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Correo Electrónico
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={emailInput}
                      onChange={e => {
                        setEmailInput(e.target.value);
                        setClientChecked(false);
                      }}
                      style={{ flex: '1', minWidth: '240px', padding: '12px 14px', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontSize: '1rem' }}
                    />
                    <button
                      type="submit"
                      disabled={searchingClient}
                      style={{ background: 'var(--color-gold)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', minWidth: '120px' }}
                    >
                      {searchingClient ? 'Verificando...' : 'Consultar'}
                    </button>
                  </div>
                </form>

                {/* 72hs Policy Alert if user triggered reschedule within 72hs */}
                {show72hsAlert && (
                  <div className={styles.alert72hs}>
                    <div className={styles.alert72hsTitle}>
                      <span>⚠️</span> Aviso de Política de Señas (72hs)
                    </div>
                    <div>{alert72hsMessage}</div>
                  </div>
                )}

                {/* Active Turno Found Card */}
                {clientChecked && existingClient && activeTurno && (
                  <div style={{ background: '#ffffff', border: '2px solid #7a1f1e', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 6px 20px rgba(122, 31, 30, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.15rem', color: '#7a1f1e' }}>
                        ¡Tenés un turno activo agendado!
                      </span>
                      <span style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800' }}>
                        {activeTurno.estado}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px', fontSize: '0.95rem' }}>
                      <div>
                        <strong>Fecha:</strong> {new Date(activeTurno.fecha).toLocaleDateString('es-AR', { dateStyle: 'long', timeZone: 'UTC' })}
                      </div>
                      <div>
                        <strong>Horario:</strong> {activeTurno.horaInicio} a {activeTurno.horaFin} hs
                      </div>
                      <div>
                        <strong>Duración:</strong> {activeTurno.duracionMinutos} min
                      </div>
                      <div>
                        <strong>Total:</strong> ${Number(activeTurno.valorTotal).toLocaleString('es-AR')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleInitiateReschedule(activeTurno)}
                        style={{ flex: 1, minWidth: '160px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '12px 18px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        🗓️ Reagendar Turno
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelTurno(activeTurno)}
                        style={{ flex: 1, minWidth: '160px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 18px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        ✕ Cancelar Turno
                      </button>
                    </div>
                  </div>
                )}

                {/* Client Exists but NO Active Turno */}
                {clientChecked && existingClient && !activeTurno && (
                  <div style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534', marginBottom: '8px' }}>
                      ¡Hola {existingClient.nombreCompleto}!
                    </h3>
                    <p style={{ color: '#475569', marginBottom: '20px' }}>
                      No tenés turnos activos registrados. Podés reservar tu próxima sesión ahora mismo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{ background: 'var(--color-gold)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '14px 28px', fontSize: '1.05rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Elegir Zonas y Horario →
                    </button>
                  </div>
                )}

                {/* Deferred Client Form (Does not exist in DB yet) */}
                {clientChecked && !existingClient && (
                  <form onSubmit={handleProceedToZones} style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1.5px solid var(--border-color)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px' }}>
                        Cliente Nuevo
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        Completá tus datos para continuar
                      </h3>
                    </div>

                    <div className={styles.inputRow} style={{ marginBottom: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                          Nombre *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nombre}
                          onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Tu nombre"
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-color)', borderRadius: '8px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                          Apellido *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.apellido}
                          onChange={e => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                          placeholder="Tu apellido"
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-color)', borderRadius: '8px' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                        WhatsApp *
                      </label>
                      <PhoneInput
                        countryCode={formData.whatsappCountry}
                        customCode={formData.whatsappCustomCode}
                        phoneNumber={formData.whatsapp}
                        onCountryChange={c => setFormData(prev => ({ ...prev, whatsappCountry: c }))}
                        onCustomCodeChange={code => setFormData(prev => ({ ...prev, whatsappCustomCode: code }))}
                        onPhoneChange={num => setFormData(prev => ({ ...prev, whatsapp: num }))}
                        placeholder="Ej: 11 2345 6789"
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                        DNI (Opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.dni}
                        onChange={e => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                        placeholder="Tu documento"
                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-color)', borderRadius: '8px' }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{ width: '100%', background: 'var(--color-gold)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Continuar a Selección de Zonas →
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* =========================================================
                PASO 2: SELECCIÓN DE ZONAS (NUEVA RESERVA)
               ========================================================= */}
            {step === 2 && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Seleccioná las Zonas a Tratar
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Podés elegir una o varias zonas. El tiempo y valor total se calcularán automáticamente.
                  </p>
                </div>

                {/* Threshold Banner: Regla de $65.000 */}
                {isThresholdMet ? (
                  <div className={styles.thresholdBanner}>
                    <span className={styles.thresholdIcon}>✨</span>
                    <div>
                      <strong>¡Turno Preferencial Habilitado!</strong> Al ser un monto de <strong>${Number(valorTotal).toLocaleString('es-AR')}</strong> (mayor o igual a $65.000), se habilitan todos los días disponibles del calendario para agendar.
                    </div>
                  </div>
                ) : (
                  <div className={styles.thresholdBannerLocked}>
                    <span className={styles.thresholdIcon}>ℹ️</span>
                    <div>
                      Monto actual: <strong>${Number(valorTotal).toLocaleString('es-AR')}</strong>. En la agenda de autogestión se mostrarán los días que ya cuentan con citas agendadas para optimizar horarios (si seleccionás zonas por $65.000 o más, se habilitan todos los días libres).
                    </div>
                  </div>
                )}

                {/* Zones Catalog Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {zones.map(z => {
                    const isSelected = selectedZoneIds.includes(z.id);
                    return (
                      <div
                        key={z.id}
                        onClick={() => toggleZone(z.id)}
                        style={{
                          background: isSelected ? '#fef2f2' : '#ffffff',
                          border: isSelected ? '2px solid #7a1f1e' : '1.5px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(122, 31, 30, 0.12)' : 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ width: '18px', height: '18px', accentColor: '#7a1f1e', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '800', fontSize: '1rem', color: isSelected ? '#7a1f1e' : 'var(--text-primary)' }}>
                            {z.nombre}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {z.duracionMinutos} min • ${Number(z.precioBase).toLocaleString('es-AR')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Box */}
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Zonas elegidas: <strong>{selectedZoneIds.length}</strong> • Duración estimada: <strong>{duracionMinutos} min</strong>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                      Total: ${Number(valorTotal).toLocaleString('es-AR')}
                      <span style={{ fontSize: '0.9rem', color: '#7a1f1e', marginLeft: '12px', fontWeight: '700' }}>
                        (Seña: ${Number(valorSeña).toLocaleString('es-AR')})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      ← Volver
                    </button>
                    <button
                      type="button"
                      disabled={selectedZoneIds.length === 0}
                      onClick={() => setStep(3)}
                      style={{ background: selectedZoneIds.length === 0 ? '#cbd5e1' : 'var(--color-gold)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '800', cursor: selectedZoneIds.length === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      Continuar a Horarios →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                PASO 3: CALENDARIO Y HORARIOS (MODELO ALTA DE TURNO)
               ========================================================= */}
            {step === 3 && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {rescheduleMode && (
                      <span style={{ background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                        MODO REPROGRAMAR
                      </span>
                    )}
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                      Elegí el Día y Horario
                    </h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                    Duración del turno: <strong>{duracionMinutos} minutos</strong>. Tocá un día en verde para ver los horarios disponibles pegados a las citas.
                  </p>
                </div>

                {/* Calendar Card */}
                <div className={styles.calendarContainer}>
                  {/* Month Navigation */}
                  <div className={styles.calendarNav}>
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className={styles.navBtn}
                    >
                      ← Anterior
                    </button>
                    <span className={styles.monthLabel}>
                      {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className={styles.navBtn}
                    >
                      Siguiente →
                    </button>
                  </div>

                  {/* Weekday Headers */}
                  <div className={styles.calendarWeekdays}>
                    {WEEKDAYS.map(w => (
                      <div key={w}>{w}</div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className={styles.calendarGrid}>
                    {calendarCells.map(cell => {
                      if (cell.isBlank) {
                        return <div key={cell.key} style={{ minHeight: '44px' }} />;
                      }

                      const { dateStr, dayNumber, dayInfo } = cell;
                      const isSelected = selectedDateStr === dateStr;

                      let cellClass = styles.dayCellDisabled;
                      let isClickable = false;

                      if (dayInfo.disponible) {
                        cellClass = isSelected ? `${styles.dayCell} ${styles.dayCellSelected}` : `${styles.dayCell} ${styles.dayCellAvailable}`;
                        isClickable = true;
                      } else if (dayInfo.lleno || dayInfo.motivo === 'DIA_LLENO') {
                        // Fondo rojo para días completos indicado por Luciano
                        cellClass = `${styles.dayCell} ${styles.dayCellFull}`;
                      } else if (dayInfo.motivo === 'DIA_CERRADO') {
                        cellClass = `${styles.dayCell} ${styles.dayCellClosed}`;
                      }

                      return (
                        <div
                          key={dateStr}
                          className={cellClass}
                          onClick={() => {
                            if (isClickable) {
                              setSelectedDateStr(dateStr);
                              setSelectedSlot(null);
                            }
                          }}
                          title={
                            dayInfo.disponible
                              ? `${dayInfo.slots?.length || 0} horarios disponibles`
                              : (dayInfo.lleno ? 'Día completo sin huecos disponibles' : (dayInfo.motivo === 'DIA_CERRADO' ? 'Día aún no abierto para este importe' : 'No disponible'))
                          }
                        >
                          <span>{dayNumber}</span>
                          {dayInfo.disponible && (
                            <span className={styles.daySlotCount}>
                              {dayInfo.slots?.length || 0}hs
                            </span>
                          )}
                          {dayInfo.lleno && (
                            <span style={{ fontSize: '0.62rem', fontWeight: '800', marginTop: '2px' }}>
                              Lleno
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className={styles.calendarLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#10b981' }}></span>
                      <span>Disponible</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#f43f5e' }}></span>
                      <span>Completo (Sin hueco)</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#cbd5e1' }}></span>
                      <span>No abierto / Pasado</span>
                    </div>
                  </div>
                </div>

                {/* Available Slots Section for Selected Day */}
                {selectedDateStr && (
                  <div className={styles.slotsContainer}>
                    <div className={styles.slotsHeader}>
                      <div className={styles.slotsTitle}>
                        Horarios para el {new Date(selectedDateStr + 'T12:00:00Z').toLocaleDateString('es-AR', { dateStyle: 'full' })}
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {currentDaySlots.length} horarios encontrados (agrupados por proximidad)
                      </span>
                    </div>

                    {currentDaySlots.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        No se encontraron huecos para la duración seleccionada en este día.
                      </div>
                    ) : (
                      <div className={styles.slotsGrid}>
                        {currentDaySlots.map((slot, idx) => {
                          const isSlotSelected = selectedSlot?.horaInicio === slot.horaInicio;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`${styles.slotBtn} ${isSlotSelected ? styles.slotBtnActive : ''}`}
                            >
                              <span>{slot.horaInicio} hs</span>
                              <span className={styles.slotEndText}>hasta {slot.horaFin} hs</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (rescheduleMode) {
                        setStep(1);
                        setRescheduleMode(false);
                      } else {
                        setStep(2);
                      }
                    }}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ← Volver
                  </button>

                  <button
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => setStep(4)}
                    style={{
                      background: !selectedSlot ? '#cbd5e1' : 'var(--color-gold)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 24px',
                      fontWeight: '800',
                      cursor: !selectedSlot ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Continuar a Confirmación →
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                PASO 4: CONFIRMACIÓN Y BOTÓN VERDE "PAGAR SEÑA"
               ========================================================= */}
            {step === 4 && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Confirmá tu Reserva
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Revisá los datos antes de proceder al pago de la seña para asegurar tu lugar.
                  </p>
                </div>

                {/* Summary Card */}
                <div style={{ background: '#ffffff', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: '700' }}>CLIENTE</span>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                        {formData.nombre} {formData.apellido} {existingClient ? `(${existingClient.nombreCompleto})` : ''}
                      </strong>
                      <div style={{ fontSize: '0.88rem', color: '#64748b' }}>{emailInput}</div>
                      <div style={{ fontSize: '0.88rem', color: '#64748b' }}>{formData.whatsapp}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: '700' }}>FECHA Y HORA</span>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                        {new Date(selectedDateStr + 'T12:00:00Z').toLocaleDateString('es-AR', { dateStyle: 'full' })}
                      </strong>
                      <div style={{ fontSize: '0.95rem', color: '#7a1f1e', fontWeight: '700', marginTop: '2px' }}>
                        {selectedSlot?.horaInicio} a {selectedSlot?.horaFin} hs ({duracionMinutos} min)
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: '700' }}>ZONAS ELEGIDAS</span>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                        {activeZoneObjs.map(z => z.nombre).join(', ') || 'Zonas agendadas'}
                      </strong>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.05rem' }}>
                      <span>Valor Total del Servicio:</span>
                      <strong>${Number(valorTotal).toLocaleString('es-AR')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.15rem', color: '#16a34a', fontWeight: '800' }}>
                      <span>Seña Requerida:</span>
                      <span>${Number(valorSeña).toLocaleString('es-AR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#64748b' }}>
                      <span>Saldo a pagar el día de la sesión:</span>
                      <span>${Number(valorTotal - valorSeña).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '24px', fontSize: '0.88rem', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Indicaciones Previas Importantes:</strong>
                  <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                    <li>Venir afeitado al ras de la noche anterior.</li>
                    <li>No tomar sol ni rayos UV 48hs antes ni después de la sesión.</li>
                    <li>La tolerancia por llegada tarde es de 5 minutos al ser turnos exactos.</li>
                  </ul>
                </div>

                {/* GREEN "PAGAR SEÑA" BUTTON - WHATSAPP BYPASS AS REQUESTED BY LUCIANO */}
                <div style={{ marginBottom: '20px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePagarSeña}
                    className={styles.btnPagarSena}
                  >
                    <WhatsAppIcon />
                    {submitting ? 'Procesando reserva...' : 'Pagar Seña'}
                  </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
                  >
                    ← Modificar horario o fecha
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FOOTER: Exclusivamente visible en el PASO 1 como especificó Luciano */}
      {step === 1 && (
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerLinks}>
              <a
                href="https://www.instagram.com/gonzalo_depilacion/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                <span>📷</span> Instagram
              </a>
              <a
                href="https://depilacionparahombres.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                <span>🌐</span> Sitio Web
              </a>
              <a
                href="https://maps.google.com/?q=Parana+597+Buenos+Aires"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                <span>📍</span> Google Maps
              </a>
            </div>
            <div>
              © {new Date().getFullYear()} Gonzalo Depilación Masculina • Todos los derechos reservados.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
