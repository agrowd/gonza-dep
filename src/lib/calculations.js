/**
 * Calculates the total price, required deposit (seña), and duration of an appointment
 * based on selected zones and whether the client is new.
 * 
 * Rules:
 * 1. Base duration is the duration of the longest zone.
 * 2. Additional zones add 50% of their base duration.
 * 3. If it's a new client, add 10 extra minutes.
 * 4. Round up to the nearest multiple of 10 minutes.
 * 
 * @param {Array} selectedZones - Array of zones selected: [{ nombre, precioBase, duracionMinutos, señaBase }]
 * @param {boolean} isNewClient - True if it's the client's first session
 * @returns {Object} { valorTotal, valorSeña, duracionMinutos }
 */
export function calculateTurnDetails(selectedZones, isNewClient = false) {
  if (!selectedZones || selectedZones.length === 0) {
    return {
      valorTotal: 0,
      valorSeña: 0,
      duracionMinutos: 0
    };
  }

  // 1. Calculate values
  const valorTotal = selectedZones.reduce((sum, zone) => sum + zone.precioBase, 0);
  const valorSeña = selectedZones.reduce((sum, zone) => sum + zone.señaBase, 0);

  // 2. Find longest duration
  const durations = selectedZones.map(zone => zone.duracionMinutos);
  const maxDuration = Math.max(...durations);

  // 3. Add 50% of other durations
  let additionalDurationSum = 0;
  let maxDurationFound = false;

  for (const zone of selectedZones) {
    if (zone.duracionMinutos === maxDuration && !maxDurationFound) {
      maxDurationFound = true; // skip the primary zone once
      continue;
    }
    additionalDurationSum += zone.duracionMinutos * 0.5;
  }

  let totalDuration = maxDuration + additionalDurationSum;

  // 4. Add new client bonus
  if (isNewClient) {
    totalDuration += 10;
  }

  // 5. Round up to nearest multiple of 10
  const duracionMinutos = Math.ceil(totalDuration / 10) * 10;

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
