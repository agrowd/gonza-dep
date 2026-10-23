/**
 * Helper to identify zones that add 0 additional minutes when combined with a base zone.
 * Exceptions: Axilas, Hombros, Genitales.
 */
function isZeroAdditionalZone(zone) {
  const norm = (zone?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return norm.includes('axila') || norm.includes('hombro') || norm.includes('genital');
}

/**
 * Calculates the total price, required deposit (seña), and duration of an appointment
 * based on selected zones and whether the client is new.
 * 
 * Rules (Actualizado según Gonzalo y Luciano Siri):
 * 1. Base duration is the duration of the longest zone.
 * 2. Additional zones add 10 minutes each, EXCEPT Axilas, Hombros and Genitales which add 0 extra minutes.
 * 3. If it's a new client, add 10 extra minutes.
 * 4. Round up to the nearest multiple of 10 minutes.
 * 
 * @param {Array} selectedZones - Array of zones selected: [{ nombre, precioBase, duracionMinutos, señaBase }]
 * @param {boolean} isNewClient - True if it's the client's first session
 * @param {string} formulaType - 'ZONA_MAX_MAS_TERCIO', 'ZONA_MAX_MAS_10MIN', 'ZONA_MAX_MAS_MITAD'
 * @returns {Object} { valorTotal, valorSeña, duracionMinutos }
 */
export function calculateTurnDetails(selectedZones, isNewClient = false, formulaType = 'ZONA_MAX_MAS_TERCIO') {
  if (!selectedZones || selectedZones.length === 0) {
    return {
      valorTotal: 0,
      valorSeña: 0,
      duracionMinutos: 0
    };
  }

  // 1. Calculate values
  const valorTotal = selectedZones.reduce((sum, zone) => sum + (zone.precioBase || zone.precio || 0), 0);
  const valorSeña = selectedZones.reduce((sum, zone) => sum + (zone.señaBase || 0), 0);

  // 2. Select base zone (the longest zone).
  let baseZoneIndex = -1;
  let maxDuration = -1;

  for (let i = 0; i < selectedZones.length; i++) {
    const dur = selectedZones[i].duracionMinutos || selectedZones[i].duracion || 0;
    const isZeroAdd = isZeroAdditionalZone(selectedZones[i]);

    if (dur > maxDuration) {
      maxDuration = dur;
      baseZoneIndex = i;
    } else if (dur === maxDuration && baseZoneIndex !== -1) {
      if (isZeroAdditionalZone(selectedZones[baseZoneIndex]) && !isZeroAdd) {
        baseZoneIndex = i;
      }
    }
  }

  const baseDuration = maxDuration > 0 ? maxDuration : 0;
  let additionalDurationSum = 0;

  if (formulaType === 'ZONA_MAX_MAS_10MIN') {
    // Regla D-105: +10 min por zona adicional salvo axilas, hombros y genitales (0 min)
    for (let i = 0; i < selectedZones.length; i++) {
      if (i === baseZoneIndex) continue;
      if (isZeroAdditionalZone(selectedZones[i])) {
        additionalDurationSum += 0;
      } else {
        additionalDurationSum += 10;
      }
    }
  } else if (formulaType === 'ZONA_MAX_MAS_MITAD') {
    // Regla Clásica: +50% de las demás zonas
    for (let i = 0; i < selectedZones.length; i++) {
      if (i === baseZoneIndex) continue;
      const dur = selectedZones[i].duracionMinutos || selectedZones[i].duracion || 0;
      additionalDurationSum += dur * 0.5;
    }
  } else {
    // Default 'ZONA_MAX_MAS_TERCIO' (Mejoras AppWeb líneas 193-202):
    // Tiempo de zona más larga + 1/3 de las demás zonas
    for (let i = 0; i < selectedZones.length; i++) {
      if (i === baseZoneIndex) continue;
      const dur = selectedZones[i].duracionMinutos || selectedZones[i].duracion || 0;
      additionalDurationSum += (dur / 3);
    }
    // Si hay 4 zonas o más en total, restar 10 minutos
    if (selectedZones.length >= 4) {
      additionalDurationSum -= 10;
    }
  }

  let totalDuration = baseDuration + additionalDurationSum;

  // Add new client bonus (+10 min)
  if (isNewClient) {
    totalDuration += 10;
  }

  // Round up to nearest multiple of 10 minutes
  const duracionMinutos = Math.max(10, Math.ceil(totalDuration / 10) * 10);

  return {
    valorTotal,
    valorSeña,
    duracionMinutos
  };
}

/**
 * Calculates business hours remaining until appointment in Argentina timezone (UTC-3).
 * Excludes Saturdays (day 6) and Sundays (day 0).
 * 
 * @param {Date|string} turnFecha - Appointment date
 * @param {string} horaInicio - e.g. "14:30"
 * @param {Date} [now] - Current date/time (default new Date())
 * @returns {number} business hours remaining
 */
export function getBusinessHoursUntilTurno(turnFecha, horaInicio = '12:00', now = new Date()) {
  if (!turnFecha) return 999;
  
  const dObj = new Date(turnFecha);
  const y = dObj.getUTCFullYear();
  const mon = dObj.getUTCMonth();
  const d = dObj.getUTCDate();
  const [h, m] = (horaInicio || '12:00').split(':').map(Number);

  // UTC timestamp for appointment (Argentina is UTC-3, so UTC hour is h + 3)
  const turnUtcMs = Date.UTC(y, mon, d, h + 3, m || 0, 0, 0);
  const nowUtcMs = now.getTime();

  if (turnUtcMs <= nowUtcMs) return 0;

  const stepMs = 3600000; // 1 hour steps
  let curUtcMs = nowUtcMs;
  let businessHours = 0;

  while (curUtcMs < turnUtcMs) {
    const nextUtcMs = Math.min(curUtcMs + stepMs, turnUtcMs);
    // Interval check in Argentina time (UTC - 3 hours)
    const argDate = new Date(curUtcMs - (3 * 3600000));
    const dayOfWeek = argDate.getUTCDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessHours += (nextUtcMs - curUtcMs) / 3600000;
    }
    curUtcMs = nextUtcMs;
  }

  return businessHours;
}
