'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './alta-turno.module.css';
import { calculateTurnDetails } from '@/lib/calculations.js';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lunes', short: 'Lun' },
  { id: 2, label: 'Martes', short: 'Mar' },
  { id: 3, label: 'Miércoles', short: 'Mié' },
  { id: 4, label: 'Jueves', short: 'Jue' },
  { id: 5, label: 'Viernes', short: 'Vie' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
  { id: 0, label: 'Domingo', short: 'Dom' },
];

function AltaTurnoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode and contextual parameters
  const modo = searchParams.get('modo') || 'nuevo'; // 'nuevo' | 'reprogramar' | 'siguienteTurno'
  const turnoIdParam = searchParams.get('turnoId');
  const clienteIdParam = searchParams.get('clienteId');
  const clienteNombreParam = searchParams.get('clienteNombre') || '';
  const clienteWhatsappParam = searchParams.get('clienteWhatsapp') || '';
  const clienteEmailParam = searchParams.get('clienteEmail') || '';
  const clienteDniParam = searchParams.get('clienteDni') || '';
  const fechaOriginalParam = searchParams.get('fechaOriginal') || '';
  const horaOriginalParam = searchParams.get('horaOriginal') || '';
  const fechaAnteriorParam = searchParams.get('fechaAnterior') || '';
  const frecuenciaParam = searchParams.get('frecuencia') || '4';

  // 1. Zones Catalog & Selection
  const [zones, setZones] = useState([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState([]);
  const [isNuevoCliente, setIsNuevoCliente] = useState(false);
  const [hasOtros, setHasOtros] = useState(false);
  const [otrosTexto, setOtrosTexto] = useState('');
  const [otrosPrecio, setOtrosPrecio] = useState(0);

  // Duration State: automatically calculated, but operator can edit it
  const [customDuration, setCustomDuration] = useState(null);

  // 2. Search Filters
  const [horaDesde, setHoraDesde] = useState('');
  const [horaHasta, setHoraHasta] = useState('');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Default: Lun-Vie

  // 3. Calendar Navigation
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-12

  // 4. Availability Data
  const [availability, setAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // 5. User Selection
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);

  // Compute recommended week for siguienteTurno
  const recommendedWeekRange = useMemo(() => {
    if (modo !== 'siguienteTurno' || !fechaAnteriorParam) return null;
    try {
      const [y, m, d] = fechaAnteriorParam.split('-').map(Number);
      const prevDate = new Date(y, m - 1, d, 12, 0, 0);
      const weeks = parseInt(frecuenciaParam || '4', 10) || 4;
      const targetDate = new Date(prevDate);
      targetDate.setDate(targetDate.getDate() + weeks * 7);

      const targetDay = targetDate.getDay(); // 0 is Sun, 1 is Mon...
      const diffToMonday = targetDate.getDate() - targetDay + (targetDay === 0 ? -6 : 1);
      const monday = new Date(targetDate);
      monday.setDate(diffToMonday);
      monday.setHours(12, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(12, 0, 0, 0);

      const toStr = (dt) => {
        const yr = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      };

      return {
        startDate: monday,
        endDate: sunday,
        startStr: toStr(monday),
        endStr: toStr(sunday),
        targetMonth: monday.getMonth() + 1,
        targetYear: monday.getFullYear()
      };
    } catch (e) {
      return null;
    }
  }, [modo, fechaAnteriorParam, frecuenciaParam]);

  // Initial preloading from query parameters
  useEffect(() => {
    const zonesParam = searchParams.get('zones');
    if (zonesParam) {
      const ids = zonesParam.split(',').filter(Boolean);
      setSelectedZoneIds(ids);
    }
    const hasOtrosParam = searchParams.get('hasOtros') === 'true';
    if (hasOtrosParam) {
      setHasOtros(true);
      setOtrosTexto(searchParams.get('otrosTexto') || '');
      setOtrosPrecio(parseInt(searchParams.get('otrosPrecio') || '0', 10) || 0);
    }
    const durParam = parseInt(searchParams.get('duracion') || '0', 10);
    if (durParam > 0) {
      setCustomDuration(durParam);
    }

    if (recommendedWeekRange) {
      setCurrentYear(recommendedWeekRange.targetYear);
      setCurrentMonth(recommendedWeekRange.targetMonth);
    }
  }, [searchParams, recommendedWeekRange]);

  // Fetch zones catalog
  useEffect(() => {
    fetch('/api/zonas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setZones(data);
        }
      })
      .catch(err => console.error('Error fetching zones:', err));

    fetch('/api/admin/configuracion')
      .then(res => res.json())
      .then(cfg => {
        if (cfg && !cfg.error) {
          if (cfg.work_start) setHoraDesde(cfg.work_start);
          if (cfg.work_end) setHoraHasta(cfg.work_end);
        }
      })
      .catch(err => console.error('Error fetching config:', err));
  }, []);

  // Compute calculated duration and values
  const activeZoneObjs = useMemo(() => {
    return zones.filter(z => selectedZoneIds.includes(z.id));
  }, [zones, selectedZoneIds]);

  const calculations = useMemo(() => {
    let baseCalcs = calculateTurnDetails(activeZoneObjs, isNuevoCliente);
    if (hasOtros) {
      const extraP = Number(otrosPrecio) || 0;
      baseCalcs = {
        ...baseCalcs,
        valorTotal: baseCalcs.valorTotal + extraP,
        valorSeña: baseCalcs.valorSeña + Math.round(extraP * 0.5),
        duracionMinutos: baseCalcs.duracionMinutos > 0 ? baseCalcs.duracionMinutos : 30
      };
    }
    return baseCalcs;
  }, [activeZoneObjs, isNuevoCliente, hasOtros, otrosPrecio]);

  // Active duration for scheduling: either user override or calculated
  const activeDuration = useMemo(() => {
    if (customDuration !== null && customDuration > 0) {
      return customDuration;
    }
    return calculations.duracionMinutos > 0 ? calculations.duracionMinutos : 30;
  }, [customDuration, calculations.duracionMinutos]);

  // Handle Zone Toggle
  const toggleZone = (id) => {
    setSelectedZoneIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setCustomDuration(null);
      return next;
    });
  };

  // Handle Day of Week Toggle
  const toggleDayOfWeek = (dayId) => {
    setSelectedDays(prev => {
      if (prev.includes(dayId)) {
        return prev.filter(d => d !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  // Fetch availability whenever month, duration, hours, or days change
  useEffect(() => {
    let isMounted = true;
    setLoadingAvailability(true);

    const query = new URLSearchParams({
      year: currentYear.toString(),
      month: currentMonth.toString(),
      duracion: activeDuration.toString(),
      horaDesde: horaDesde || '',
      horaHasta: horaHasta || '',
      diasSemana: selectedDays.join(',')
    });

    fetch(`/api/admin/alta-turno/disponibilidad?${query.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.days) {
          setAvailability(data.days);
          if (selectedDateStr && data.days[selectedDateStr]?.disponible) {
            // Keep selected date
          } else {
            let chosenDay = null;
            if (recommendedWeekRange) {
              const recDays = Object.keys(data.days).filter(d => 
                d >= recommendedWeekRange.startStr && 
                d <= recommendedWeekRange.endStr && 
                data.days[d].disponible
              );
              if (recDays.length > 0) chosenDay = recDays[0];
            }
            if (!chosenDay) {
              chosenDay = Object.keys(data.days).find(d => data.days[d].disponible);
            }
            setSelectedDateStr(chosenDay || null);
            setSelectedSlot(null);
          }
        }
        setLoadingAvailability(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error fetching availability:', err);
        setLoadingAvailability(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentYear, currentMonth, activeDuration, horaDesde, horaHasta, selectedDays, recommendedWeekRange]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDateStr(null);
    setSelectedSlot(null);
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDateStr(null);
    setSelectedSlot(null);
  };

  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    const m = d.toLocaleDateString('es-ES', { month: 'long' });
    const y = d.getFullYear();
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${y}`;
  }, [currentYear, currentMonth]);

  // Calendar cells generation (Monday to Sunday)
  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
    const totalDays = lastDayOfMonth.getDate();

    let startingDayOfWeek = firstDayOfMonth.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ type: 'empty', key: `empty-${i}` });
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = availability[dateStr];
      cells.push({
        type: 'day',
        day,
        dateStr,
        dayData,
        key: dateStr
      });
    }
    return cells;
  }, [currentYear, currentMonth, availability]);

  // Available slots for the currently selected day
  const currentSlots = useMemo(() => {
    if (!selectedDateStr || !availability[selectedDateStr]) return [];
    return availability[selectedDateStr].slots || [];
  }, [selectedDateStr, availability]);

  // Formatted date label for header
  const formattedSelectedDateLabel = useMemo(() => {
    if (!selectedDateStr) return '';
    try {
      const dt = new Date(selectedDateStr + 'T12:00:00');
      const weekday = dt.toLocaleDateString('es-ES', { weekday: 'short' });
      const day = dt.getDate();
      const month = dt.toLocaleDateString('es-ES', { month: 'short' });
      return `${weekday}, ${day} ${month}`;
    } catch (e) {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  // Proceed depending on active mode
  const handleProceed = () => {
    if (!selectedDateStr || !selectedSlot) return;

    if (modo === 'reprogramar') {
      const params = new URLSearchParams({
        modo: 'reprogramar',
        reprogramarTurnoId: turnoIdParam || '',
        clienteId: clienteIdParam || '',
        newDate: selectedDateStr,
        newTime: selectedSlot.horaInicio,
        newHoraFin: selectedSlot.horaFin,
        duracion: activeDuration.toString(),
        zones: selectedZoneIds.join(','),
        hasOtros: hasOtros ? 'true' : 'false',
        otrosTexto: otrosTexto || '',
        otrosPrecio: otrosPrecio.toString()
      });
      router.push(`/admin/agenda?${params.toString()}`);
      return;
    }

    if (modo === 'siguienteTurno') {
      const params = new URLSearchParams({
        newTurno: 'true',
        modo: 'siguienteTurno',
        clienteId: clienteIdParam || '',
        nombre: clienteNombreParam || '',
        whatsapp: clienteWhatsappParam || '',
        email: clienteEmailParam || '',
        dni: clienteDniParam || '',
        date: selectedDateStr,
        time: selectedSlot.horaInicio,
        horaFin: selectedSlot.horaFin,
        duracion: activeDuration.toString(),
        zones: selectedZoneIds.join(','),
        hasOtros: hasOtros ? 'true' : 'false',
        otrosTexto: otrosTexto || '',
        otrosPrecio: otrosPrecio.toString()
      });
      router.push(`/admin/agenda?${params.toString()}`);
      return;
    }

    // Default: nuevo turno
    const params = new URLSearchParams({
      newTurno: 'true',
      date: selectedDateStr,
      time: selectedSlot.horaInicio,
      horaFin: selectedSlot.horaFin,
      duracion: activeDuration.toString(),
      zones: selectedZoneIds.join(','),
      hasOtros: hasOtros ? 'true' : 'false',
      otrosTexto: otrosTexto || '',
      otrosPrecio: otrosPrecio.toString()
    });
    router.push(`/admin/agenda?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      {/* Contextual Mode Banners */}
      {modo === 'reprogramar' && (
        <div className={`${styles.modoBanner} ${styles.modoBannerReprogramar}`}>
          <div>
            <strong>🔄 Reprogramando Turno:</strong> {clienteNombreParam || 'Cliente'}
            <div style={{ fontSize: '0.82rem', marginTop: '3px', opacity: 0.9 }}>
              Turno original: <strong>{fechaOriginalParam} a las {horaOriginalParam} hs</strong>. Seleccioná el nuevo día y horario libre.
            </div>
          </div>
          <button type="button" onClick={() => router.push('/admin/agenda')} className={styles.modoBannerLink}>
            ✕ Cancelar y Volver
          </button>
        </div>
      )}

      {modo === 'siguienteTurno' && (
        <div className={`${styles.modoBanner} ${styles.modoBannerSiguiente}`}>
          <div>
            <strong>📅 Programando Siguiente Sesión:</strong> {clienteNombreParam || 'Cliente'} ({frecuenciaParam} semanas entre sesiones).
            {recommendedWeekRange && (
              <div style={{ fontSize: '0.82rem', marginTop: '3px', opacity: 0.95 }}>
                ✨ Semana sugerida en el calendario: del <strong>{recommendedWeekRange.startStr}</strong> al <strong>{recommendedWeekRange.endStr}</strong> (resaltada en amarillo).
              </div>
            )}
          </div>
          <button type="button" onClick={() => router.push('/admin/agenda')} className={styles.modoBannerLink}>
            ✕ Cancelar y Volver
          </button>
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>
          <span>⚡</span> {modo === 'reprogramar' ? 'Reprogramar Turno' : (modo === 'siguienteTurno' ? 'Programar Siguiente Turno' : 'Alta Rápida de Turno')}
        </h1>
        <p className={styles.subtitle}>
          Encontrá horarios libres al instante filtrando por zonas requeridas, franjas horarias y días específicos.
        </p>
      </div>

      {/* Top Filter Cards */}
      <div className={styles.filtersGrid}>
        {/* Card 1: Zones & Duration */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span>1. Zonas & Duración</span>
            <div 
              className={`${styles.clientTogglePill} ${isNuevoCliente ? styles.clientTogglePillActive : ''}`}
              onClick={() => setIsNuevoCliente(prev => !prev)}
            >
              <span>{isNuevoCliente ? '✓' : '+'}</span>
              <span>¿Cliente nuevo? (+10 min)</span>
            </div>
          </div>

          <div className={styles.zonesList}>
            {zones.map(z => {
              const active = selectedZoneIds.includes(z.id);
              return (
                <div
                  key={z.id}
                  className={`${styles.zoneItem} ${active ? styles.zoneItemActive : ''}`}
                  onClick={() => toggleZone(z.id)}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    readOnly
                    className={styles.zoneCheckbox}
                  />
                  <div className={styles.zoneInfo}>
                    <span className={styles.zoneName}>{z.nombre}</span>
                    <span className={styles.zoneDuration}>{z.duracionMinutos} min</span>
                  </div>
                </div>
              );
            })}

            {/* OTROS Checkbox */}
            <div
              className={`${styles.zoneItem} ${styles.zoneItemCustom} ${hasOtros ? styles.zoneItemActive : ''}`}
              onClick={() => setHasOtros(prev => !prev)}
            >
              <input
                type="checkbox"
                checked={hasOtros}
                readOnly
                className={styles.zoneCheckbox}
              />
              <div className={styles.zoneInfo}>
                <span className={styles.zoneName}>Otros (Extras)</span>
                <span className={styles.zoneDuration}>Zonas combinadas</span>
              </div>
            </div>
          </div>

          {/* Fields for OTROS */}
          {hasOtros && (
            <div className={styles.otrosBox}>
              <div className={styles.formRow} style={{ marginBottom: 0, gap: '12px' }}>
                <div className={styles.formGroup} style={{ flex: 2 }}>
                  <label className={styles.label}>Escribir Zona Extra (Otros) *:</label>
                  <input
                    type="text"
                    placeholder="Ej: Patillas, Nuca, Cintura..."
                    value={otrosTexto}
                    onChange={(e) => setOtrosTexto(e.target.value)}
                    className={styles.textInput}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Valor Extras ($):</label>
                  <input
                    type="number"
                    placeholder="Ej. 15000"
                    value={otrosPrecio || ''}
                    onChange={(e) => setOtrosPrecio(parseInt(e.target.value, 10) || 0)}
                    className={styles.textInput}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={styles.durationSummary}>
            <div className={styles.durationInputWrap}>
              <span>⏱️ Duración:</span>
              <div className={styles.durationStepper}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => {
                    const cur = customDuration !== null ? customDuration : activeDuration;
                    if (cur > 10) setCustomDuration(cur - 10);
                  }}
                  title="Restar 10 min"
                >
                  −
                </button>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={customDuration !== null ? customDuration : activeDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value, 10) || 10)}
                  className={styles.durationInput}
                />
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => {
                    const cur = customDuration !== null ? customDuration : activeDuration;
                    setCustomDuration(cur + 10);
                  }}
                  title="Sumar 10 min"
                >
                  +
                </button>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>min</span>
            </div>

            <div className={styles.summaryBadgesWrap}>
              {calculations.valorTotal > 0 && (
                <span className={styles.badgeSummary}>
                  💰 Total: ${calculations.valorTotal.toLocaleString()}
                </span>
              )}
              {calculations.valorSeña > 0 && (
                <span className={`${styles.badgeSummary} ${styles.badgeSummarySeña}`}>
                  💳 Seña: ${calculations.valorSeña.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Hours & Weekday Filters */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span>2. Franja Horaria & Días Permitidos</span>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Desde las:</label>
              <input
                type="time"
                value={horaDesde}
                onChange={(e) => setHoraDesde(e.target.value)}
                className={styles.timeInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Hasta las:</label>
              <input
                type="time"
                value={horaHasta}
                onChange={(e) => setHoraHasta(e.target.value)}
                className={styles.timeInput}
              />
            </div>
          </div>

          <label className={styles.label}>Días en los que puede asistir:</label>
          <div className={styles.daysToggleGroup}>
            {DAYS_OF_WEEK.map(d => {
              const active = selectedDays.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDayOfWeek(d.id)}
                  className={`${styles.dayChip} ${active ? styles.dayChipActive : ''}`}
                >
                  {d.short}
                </button>
              );
            })}
          </div>

          {/* Quick presets */}
          <div className={styles.presetBtns}>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
            >
              📅 Lunes a Viernes
            </button>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => setSelectedDays([1, 2, 3, 4, 5, 6, 0])}
            >
              🗓️ Toda la semana
            </button>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => {
                setHoraDesde('18:00');
                setHoraHasta('22:00');
              }}
            >
              🌙 Noche (18:00+)
            </button>
          </div>
        </div>
      </div>

      {/* Calendario Mensual + Desplegable Integrado de Horarios Abajo */}
      <div className={styles.card}>
        <div className={styles.calendarHeader}>
          <button type="button" onClick={prevMonth} className={styles.navMonthBtn} title="Mes anterior">‹</button>
          <div className={styles.monthTitle}>
            {monthName} {loadingAvailability && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>⏳ Buscando...</span>}
          </div>
          <button type="button" onClick={nextMonth} className={styles.navMonthBtn} title="Mes siguiente">›</button>
        </div>

        <div className={styles.calendarGrid}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(col => (
            <div key={col} className={styles.weekdayHeader}>
              {col}
            </div>
          ))}

          {calendarCells.map(cell => {
            if (cell.type === 'empty') {
              return <div key={cell.key} style={{ visibility: 'hidden' }} />;
            }

            const { day, dateStr, dayData } = cell;
            const isAvailable = dayData?.disponible;
            const isLleno = dayData?.lleno;
            const isSelected = selectedDateStr === dateStr;
            const isRecommended = recommendedWeekRange && (dateStr >= recommendedWeekRange.startStr && dateStr <= recommendedWeekRange.endStr);

            let cellClass = styles.dayDisabled;
            if (isAvailable) cellClass = styles.dayAvailable;
            else if (isLleno) cellClass = styles.dayFull;

            return (
              <div
                key={cell.key}
                className={`${styles.dayCell} ${cellClass} ${isSelected ? styles.daySelected : ''} ${isRecommended ? styles.dayCellRecommended : ''}`}
                onClick={() => {
                  if (isAvailable) {
                    if (selectedDateStr === dateStr) {
                      // Toggle off if clicking the already selected day
                      setSelectedDateStr(null);
                      setSelectedSlot(null);
                    } else {
                      setSelectedDateStr(dateStr);
                      setSelectedSlot(null);
                      setTimeout(() => {
                        const el = document.getElementById('desplegable-horarios');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 60);
                    }
                  }
                }}
                title={
                  isAvailable
                    ? `${dayData.slots.length} horarios disponibles`
                    : isLleno
                    ? 'Día completo sin espacio'
                    : 'No disponible'
                }
              >
                {isRecommended && (
                  <span className={styles.recommendedStar} title="Semana sugerida según frecuencia">⭐</span>
                )}
                <span className={styles.dayNumber}>{day}</span>
                {isAvailable && (
                  <span className={`${styles.daySlotBadge} ${isRecommended ? styles.daySlotBadgeRecommended : ''}`}>
                    {dayData.slots.length} <span className={styles.badgeWord}>libre{dayData.slots.length > 1 ? 's' : ''}</span>
                  </span>
                )}
                {isLleno && (
                  <span className={styles.daySlotBadge} style={{ color: '#dc2626' }}>
                    Lleno
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.calendarLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: '#22c55e' }}></div>
            <span>Disponible (Cumple filtros)</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}></div>
            <span>Día Lleno</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: '#e5e7eb' }}></div>
            <span>No disponible / Desactivado</span>
          </div>
          {recommendedWeekRange && (
            <div className={styles.legendItem}>
              <span style={{ fontSize: '0.85rem' }}>⭐</span>
              <span>Semana Sugerida ({frecuenciaParam || 4} sem)</span>
            </div>
          )}
        </div>

        {/* Desplegable de Horarios Vertical (Aparece abajo de la selección de día como pidió Gonzalo en Captura 3) */}
        {selectedDateStr && (
          <div id="desplegable-horarios" className={styles.desplegableCard}>
            <div className={styles.desplegableHeader}>
              <div className={styles.desplegableTitleWrap}>
                <div className={styles.desplegableTitle}>
                  <span>🕒</span> HORARIOS DISPONIBLES
                </div>
                <div className={styles.dateBadge}>
                  {formattedSelectedDateLabel}
                </div>
              </div>
              <button
                type="button"
                className={styles.desplegableCloseBtn}
                onClick={() => {
                  setSelectedDateStr(null);
                  setSelectedSlot(null);
                }}
                title="Cerrar horarios"
              >
                ✕
              </button>
            </div>

            <div className={styles.desplegableBody}>
              {currentSlots.length > 0 ? (
                <>
                  <div className={styles.desplegableSubtitle}>
                    🟢 {currentSlots.length} turnos disponibles para el {formattedSelectedDateLabel}:
                  </div>

                  <div className={styles.slotsListVertical}>
                    {currentSlots.map(slot => {
                      const isSelected = selectedSlot?.horaInicio === slot.horaInicio;
                      return (
                        <div
                          key={slot.horaInicio}
                          className={`${styles.slotCardVertical} ${isSelected ? styles.slotCardVerticalActive : ''}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <div className={styles.slotCardTime}>
                            <span className={styles.slotTimeText}>{slot.horaInicio} hs</span>
                            <span className={styles.slotTimeSeparator}>➔</span>
                            <span className={styles.slotEndTimeText}>{slot.horaFin} hs</span>
                          </div>
                          <div className={styles.slotDurationBadge}>
                            ⏱️ {activeDuration} min
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSlot && (
                    <div className={styles.actionCard}>
                      <div className={styles.actionInfo}>
                        <span>✅</span>
                        <span>Turno seleccionado: <strong>{selectedSlot.horaInicio} hs a {selectedSlot.horaFin} hs</strong> ({activeDuration} min)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleProceed}
                        className={styles.primaryCtaBtn}
                      >
                        {modo === 'reprogramar' 
                          ? 'Continuar a Confirmar Reprogramación ➔' 
                          : (modo === 'siguienteTurno' ? 'Continuar a Siguiente Turno ➔' : 'Continuar a Agendar Turno ➔')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyState}>
                  No se encontraron horarios libres que cumplan con la duración de {activeDuration} min en esta fecha.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AltaTurnoPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Cargando Alta de Turno...</div>}>
      <AltaTurnoContent />
    </Suspense>
  );
}

