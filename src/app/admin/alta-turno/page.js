'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

export default function AltaTurnoPage() {
  const router = useRouter();

  // 1. Zones Catalog & Selection
  const [zones, setZones] = useState([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState([]);
  const [isNuevoCliente, setIsNuevoCliente] = useState(false);
  const [hasOtros, setHasOtros] = useState(false);
  const [otrosTexto, setOtrosTexto] = useState('');
  const [otrosPrecio, setOtrosPrecio] = useState(0);
  const [otrosMinutos, setOtrosMinutos] = useState(20);

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
      baseCalcs = {
        ...baseCalcs,
        valorTotal: baseCalcs.valorTotal + (Number(otrosPrecio) || 0),
        duracionMinutos: baseCalcs.duracionMinutos + (Number(otrosMinutos) || 20)
      };
    }
    return baseCalcs;
  }, [activeZoneObjs, isNuevoCliente, hasOtros, otrosPrecio, otrosMinutos]);

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
      // Reset custom duration override when changing zones to recalculate
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
          // If previously selected date is still available, keep it, else clear
          if (selectedDateStr && data.days[selectedDateStr]?.disponible) {
            // Keep selected date
          } else {
            // Find first available day
            const firstAvail = Object.keys(data.days).find(d => data.days[d].disponible);
            setSelectedDateStr(firstAvail || null);
            setSelectedSlot(null);
          }
        }
        setLoadingAvailability(false);
      })
      .catch(err => {
        console.error('Error fetching availability:', err);
        if (isMounted) setLoadingAvailability(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentYear, currentMonth, activeDuration, horaDesde, horaHasta, selectedDays]);

  // Month Navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  // Generate calendar cells (with leading blanks for starting weekday)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday
    // Adjust to start on Monday (0 = Lun, 6 = Dom)
    const mondayOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];
    // Leading empty cells
    for (let i = 0; i < mondayOffset; i++) {
      cells.push({ type: 'empty', key: `empty-${i}` });
    }
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
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

  // Continue to Agenda with preloaded parameters
  const handleProceedToAgenda = () => {
    if (!selectedDateStr || !selectedSlot) return;

    const params = new URLSearchParams({
      newTurno: 'true',
      date: selectedDateStr,
      time: selectedSlot.horaInicio,
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
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span>⚡</span> Alta Rápida de Turno
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
            <label style={{ fontSize: '0.85rem', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isNuevoCliente} 
                onChange={(e) => setIsNuevoCliente(e.target.checked)} 
              />
              ¿Cliente nuevo? (+10 min)
            </label>
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
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div>{z.nombre}</div>
                    <small style={{ color: '#6b7280' }}>{z.duracionMinutos} min</small>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.durationSummary}>
            <div className={styles.durationInputWrap}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Duración del Turno:</span>
              <input
                type="number"
                min="10"
                step="10"
                value={customDuration !== null ? customDuration : activeDuration}
                onChange={(e) => setCustomDuration(parseInt(e.target.value, 10) || 10)}
                className={styles.durationInput}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>minutos</span>
            </div>

            {calculations.valorTotal > 0 && (
              <span className={styles.badgeSummary}>
                💰 Valor est.: ${calculations.valorTotal.toLocaleString()}
              </span>
            )}
            {calculations.valorSeña > 0 && (
              <span className={styles.badgeSummary}>
                📝 Seña est.: ${calculations.valorSeña.toLocaleString()}
              </span>
            )}
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

          <div className={styles.presetBtns}>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
            >
              Lunes a Viernes
            </button>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => setSelectedDays([1, 2, 3, 4, 5, 6, 0])}
            >
              Toda la semana
            </button>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => {
                setHoraDesde('18:00');
                setHoraHasta('22:00');
              }}
            >
              Noche (18:00+)
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Wizard: Calendar + Slots */}
      <div className={styles.wizardLayout}>
        {/* Left Side: Monthly Calendar (image9.png style) */}
        <div className={styles.card}>
          <div className={styles.calendarHeader}>
            <button type="button" onClick={prevMonth} className={styles.navMonthBtn}>
              &lt;
            </button>
            <div className={styles.monthTitle}>
              {monthName} {loadingAvailability && <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>⏳ Buscando...</span>}
            </div>
            <button type="button" onClick={nextMonth} className={styles.navMonthBtn}>
              &gt;
            </button>
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

              let cellClass = styles.dayDisabled;
              if (isAvailable) cellClass = styles.dayAvailable;
              else if (isLleno) cellClass = styles.dayFull;

              return (
                <div
                  key={cell.key}
                  className={`${styles.dayCell} ${cellClass} ${isSelected ? styles.daySelected : ''}`}
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedDateStr(dateStr);
                      setSelectedSlot(null);
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
                  <span>{day}</span>
                  {isAvailable && (
                    <span className={styles.daySlotBadge}>
                      {dayData.slots.length} libre{dayData.slots.length > 1 ? 's' : ''}
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
          </div>
        </div>

        {/* Right Side: Available Slots List (image9.png style) */}
        <div className={styles.card}>
          <div className={styles.slotsHeader}>
            <div className={styles.slotsTitle}>
              <span>🕒</span> HORARIOS DISPONIBLES
            </div>
            {selectedDateStr && (
              <div className={styles.dateBadge}>
                {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
            )}
          </div>

          {selectedDateStr ? (
            currentSlots.length > 0 ? (
              <>
                <div className={styles.slotsList}>
                  {currentSlots.map(slot => {
                    const isSelected = selectedSlot?.horaInicio === slot.horaInicio;
                    return (
                      <button
                        key={slot.horaInicio}
                        type="button"
                        className={`${styles.slotBtn} ${isSelected ? styles.slotBtnSelected : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.horaInicio} hs
                      </button>
                    );
                  })}
                </div>

                {selectedSlot && (
                  <div className={styles.actionCard}>
                    <div className={styles.actionInfo}>
                      ✅ Turno seleccionado: {selectedSlot.horaInicio} hs a {selectedSlot.horaFin} hs ({activeDuration} min)
                    </div>
                    <button
                      type="button"
                      onClick={handleProceedToAgenda}
                      className={styles.primaryCtaBtn}
                    >
                      Continuar a Agendar Turno ➔
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                No se encontraron horarios que cumplan con la duración de {activeDuration} min en esta fecha.
              </div>
            )
          ) : (
            <div className={styles.emptyState}>
              👈 Seleccioná un día en <strong>verde</strong> del calendario para ver los horarios disponibles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
