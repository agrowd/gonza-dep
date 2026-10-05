/**
 * Notification Rule Engine & Permissions Helper
 * Checks both the master switch and granular preferences per client
 */

export function canSendNotification(cliente, channel, eventType) {
  if (!cliente) return false;

  // Master switch overrides all individual channels and events
  if (cliente.enviarNotificaciones === false) {
    return false;
  }

  // Channel check
  if (channel) {
    const chUpper = String(channel).toUpperCase();
    if (chUpper === 'WHATSAPP' && cliente.notifWhatsapp === false) {
      return false;
    }
    if (chUpper === 'EMAIL' && cliente.notifEmail === false) {
      return false;
    }
  }

  // Event type check
  if (eventType) {
    const typeUpper = String(eventType).toUpperCase();

    // Alta / Confirmación
    if ((typeUpper.includes('ALTA') || typeUpper.includes('CONFIRMACION')) && cliente.notifAltaTurno === false) {
      return false;
    }

    // Cancelación
    if (typeUpper.includes('CANCEL') && cliente.notifCancelacion === false) {
      return false;
    }

    // Reprogramación
    if (typeUpper.includes('REPROGRAM') && cliente.notifReprogramacion === false) {
      return false;
    }

    // Mantenimiento o Recordatorio
    if ((typeUpper.includes('MANTENIMIENTO') || typeUpper.includes('RECORDATORIO')) && cliente.notifMantenimiento === false) {
      return false;
    }
  }

  return true;
}
