/**
 * Formatea un valor numérico o string numérico con separadores de miles con punto (ej: 35000 -> "35.000")
 * para mostrar en tiempo real dentro de inputs de texto con inputMode="numeric".
 */
export function formatMilesInput(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '';
    const intStr = String(Math.round(Math.abs(val)));
    return (val < 0 ? '-' : '') + intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Limpia el string ingresado en un input con separadores de miles,
 * devolviendo solo dígitos limpios (ej: "35.000" -> "35000", "" -> "").
 */
export function cleanMilesInput(val) {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+(?=\d)/, '');
}
