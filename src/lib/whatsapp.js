import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import prisma from './db.js';
import { sendMaintenanceEmail, sendWhatsAppDisconnectAlertEmail, sendWhatsAppReconnectedAlertEmail, sendReminder7DaysEmail, sendBirthdayEmail } from './email.js';
import { canSendNotification } from './notifications.js';
import fs from 'fs';

// Use globalThis to cache the client across hot-reloads in development
if (!globalThis.whatsappStatus) {
  globalThis.whatsappStatus = 'DISCONNECTED'; // 'DISCONNECTED', 'INITIALIZING', 'QR_RECEIVED', 'CONNECTED'
}
if (!globalThis.whatsappQr) {
  globalThis.whatsappQr = '';
}
if (!globalThis.whatsappRelayStatus) {
  globalThis.whatsappRelayStatus = 'DISCONNECTED';
}

let lastRelayCheckTime = 0;

export async function checkRelayStatus() {
  const now = Date.now();
  if (now - lastRelayCheckTime < 4000 && globalThis.whatsappRelayStatus) {
    return globalThis.whatsappRelayStatus;
  }
  try {
    lastRelayCheckTime = now;
    const res = await fetch('http://localhost:3007/api/whatsapp/status', {
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      globalThis.whatsappRelayStatus = data.status || 'DISCONNECTED';
    } else {
      globalThis.whatsappRelayStatus = 'DISCONNECTED';
    }
  } catch (err) {
    globalThis.whatsappRelayStatus = 'DISCONNECTED';
  }
  return globalThis.whatsappRelayStatus;
}

export function getWhatsAppStatus() {
  if (globalThis.whatsappStatus === 'CONNECTED') {
    return {
      status: 'CONNECTED',
      qr: '',
      error: null
    };
  }

  if (globalThis.whatsappRelayStatus === 'CONNECTED') {
    return {
      status: 'CONNECTED',
      qr: '',
      error: null,
      viaRelay: true
    };
  }

  return {
    status: globalThis.whatsappStatus,
    qr: globalThis.whatsappQr,
    error: globalThis.whatsappError || null
  };
}

let watchdogInterval = null;
let lastAutoReconnectAttempt = 0;

export function startWhatsAppWatchdog() {
  if (watchdogInterval) return;

  console.log('[WhatsApp Watchdog] Initializing automated health-check and auto-reconnect watchdog (checks every 2 minutes)...');

  watchdogInterval = setInterval(async () => {
    try {
      const status = globalThis.whatsappStatus;
      const hasAuthDir = fs.existsSync('./.wwebjs_auth');
      const now = Date.now();

      // 0. Proactively check if client is nominally CONNECTED but Chromium process died/detached
      if (status === 'CONNECTED' && globalThis.whatsappClient) {
        try {
          if (globalThis.whatsappClient.pupBrowser && !globalThis.whatsappClient.pupBrowser.isConnected()) {
            console.warn('[WhatsApp Watchdog] Chromium browser disconnected unexpectedly. Resetting client...');
            try { await globalThis.whatsappClient.destroy(); } catch (e) {}
            globalThis.whatsappClient = null;
            globalThis.whatsappStatus = 'DISCONNECTED';
          }
        } catch (err) {
          console.error('[WhatsApp Watchdog] Error checking browser liveness:', err);
        }
      }

      // 1. If DISCONNECTED and session directory exists, attempt auto-reconnect with 3-minute backoff (unless relay is already handling it)
      if (status === 'DISCONNECTED' && hasAuthDir && globalThis.whatsappRelayStatus !== 'CONNECTED') {
        if (now - lastAutoReconnectAttempt > 3 * 60 * 1000) {
          lastAutoReconnectAttempt = now;
          console.log('[WhatsApp Watchdog] WhatsApp is DISCONNECTED with active session. Triggering automatic reconnection...');
          try {
            initWhatsAppClient();
          } catch (err) {
            console.error('[WhatsApp Watchdog] Error during auto-reconnect initWhatsAppClient:', err);
          }
        }
      }

      // 2. Disconnect Alert Email Trigger (sent once per disconnection event, only if relay is also disconnected)
      if (status === 'DISCONNECTED' && globalThis.whatsappRelayStatus !== 'CONNECTED') {
        if (!globalThis.wasDisconnectedAlertSent) {
          globalThis.wasDisconnectedAlertSent = true;
          const reason = globalThis.whatsappError || 'Conexión interrumpida con el dispositivo o sesión desvinculada.';
          console.warn('[WhatsApp Watchdog] WhatsApp disconnected. Sending alert email to administrator...');
          await sendWhatsAppDisconnectAlertEmail(reason, 'El guardián automático del sistema intentará reconectar usando la sesión guardada.');
        }
      }

      // 3. Recovery Alert Email Trigger (sent when re-connected after an alert)
      if (status === 'CONNECTED' && globalThis.wasDisconnectedAlertSent) {
        globalThis.wasDisconnectedAlertSent = false;
        console.log('[WhatsApp Watchdog] WhatsApp reconnected successfully. Sending recovery email to administrator...');
        await sendWhatsAppReconnectedAlertEmail();
      }

      // 4. Stale INITIALIZING State Cleanup (reset if stuck > 4 minutes)
      if (status === 'INITIALIZING') {
        if (!globalThis.initializingStartedAt) {
          globalThis.initializingStartedAt = now;
        } else if (now - globalThis.initializingStartedAt > 4 * 60 * 1000) {
          console.warn('[WhatsApp Watchdog] Client stuck in INITIALIZING state >4 minutes. Forcefully resetting instance...');
          globalThis.initializingStartedAt = null;
          if (globalThis.whatsappClient) {
            try { await globalThis.whatsappClient.destroy(); } catch (e) {}
            globalThis.whatsappClient = null;
          }
          globalThis.whatsappStatus = 'DISCONNECTED';
        }
      } else {
        globalThis.initializingStartedAt = null;
      }
    } catch (err) {
      console.error('[WhatsApp Watchdog] Error in watchdog interval tick:', err);
    }
  }, 2 * 60 * 1000); // 2 minutes
}

export function initWhatsAppClient() {
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    (process.argv && process.argv.some(arg => String(arg).includes('build')));
  if (isBuildPhase) {
    return null;
  }

  if (globalThis.whatsappClient) {
    if (globalThis.whatsappStatus === 'CONNECTED') {
      startReminderCron();
    }
    return globalThis.whatsappClient;
  }

  globalThis.whatsappStatus = 'INITIALIZING';
  globalThis.whatsappError = null;
  globalThis.whatsappQr = '';
  globalThis.initializingStartedAt = Date.now();

  console.log('Initializing WhatsApp Client...');

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth' // Persist session in this directory
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // helps run inside small VMs/VPS
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log('WhatsApp QR received.');
    globalThis.whatsappStatus = 'QR_RECEIVED';
    globalThis.whatsappQr = qr;
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    globalThis.whatsappStatus = 'CONNECTED';
    globalThis.whatsappQr = '';
    globalThis.initializingStartedAt = null;
    startReminderCron();
    startWhatsAppWatchdog();

    // Trigger recovery email if an alert was previously sent
    if (globalThis.wasDisconnectedAlertSent) {
      globalThis.wasDisconnectedAlertSent = false;
      sendWhatsAppReconnectedAlertEmail().catch(e => console.error('Error sending recovery email:', e));
    }
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated.');
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication failure:', msg);
    globalThis.whatsappStatus = 'DISCONNECTED';
    globalThis.whatsappError = `Autenticación fallida: ${msg}`;
    globalThis.whatsappQr = '';
    globalThis.whatsappClient = null;

    if (!globalThis.wasDisconnectedAlertSent) {
      globalThis.wasDisconnectedAlertSent = true;
      sendWhatsAppDisconnectAlertEmail(`Autenticación fallida: ${msg}`, 'Se requiere volver a escanear el código QR en el panel administrativo.').catch(e => console.error('Error sending auth failure alert:', e));
    }
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected:', reason);
    globalThis.whatsappStatus = 'DISCONNECTED';
    globalThis.whatsappQr = '';
    globalThis.whatsappClient = null;

    // Trigger immediate Watchdog check to attempt auto-reconnect if session exists
    if (fs.existsSync('./.wwebjs_auth')) {
      console.log('[WhatsApp Event] Client disconnected. Triggering Watchdog auto-reconnect...');
      startWhatsAppWatchdog();
    }
  });

  client.initialize().catch((err) => {
    console.error('Failed to initialize WhatsApp client:', err);
    globalThis.whatsappStatus = 'DISCONNECTED';
    globalThis.whatsappError = err.message;
    globalThis.whatsappClient = null;
  });

  globalThis.whatsappClient = client;
  return client;
}

export function normalizeWhatsApp(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');

  if (phone.includes('@')) {
    cleaned = phone.split('@')[0].replace(/\D/g, '');
  }

  // Si empieza con 54:
  if (cleaned.startsWith('54')) {
    // Si tiene 13 dígitos y empieza con 549 (ej: 5491176735678), está correcto
    if (cleaned.startsWith('549') && cleaned.length === 13) {
      return cleaned;
    }
    // Si tiene 12 dígitos y empieza con 54 (ej: 541176735678), agregar el 9
    if (cleaned.length === 12) {
      return `549${cleaned.slice(2)}`;
    }
    // Quitar 54 para normalizar
    cleaned = cleaned.slice(2);
  }

  // Quitar 0 inicial si existiera
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Manejar el prefijo 15 de celulares locales
  if (cleaned.startsWith('15') && cleaned.length === 10) {
    cleaned = `11${cleaned.slice(2)}`;
  } else if (cleaned.length === 12 && (cleaned.startsWith('34115') || cleaned.startsWith('26115') || cleaned.startsWith('35115'))) {
    cleaned = cleaned.slice(0, 3) + cleaned.slice(5);
  } else if (cleaned.length === 12 && cleaned.slice(2, 4) === '15') {
    cleaned = cleaned.slice(0, 2) + cleaned.slice(4);
  }

  // Si nos queda un número local estándar de 10 dígitos, añadir 549
  if (cleaned.length === 10) {
    return `549${cleaned}`;
  }

  // Si ya tiene 11 dígitos y empieza con 9, asumir que le falta el 54
  if (cleaned.length === 11 && cleaned.startsWith('9')) {
    return `54${cleaned}`;
  }

  // Fallback para número local sin prefijo de 8 dígitos (asumir BsAs 11 y móvil 9)
  if (cleaned.length === 8) {
    return `54911${cleaned}`;
  }

  return cleaned;
}

export function formatArgentinaPhone(phone) {
  if (!phone) return '';
  if (phone.includes('@c.us')) {
    return phone;
  }
  const normalized = normalizeWhatsApp(phone);
  return normalized ? `${normalized}@c.us` : '';
}

export async function sendWhatsAppMessage(phone, text) {
  const client = globalThis.whatsappClient;

  // 1. Try local client first if connected
  if (client && globalThis.whatsappStatus === 'CONNECTED') {
    try {
      const formattedPhone = formatArgentinaPhone(phone);
      let targetChatId = formattedPhone;

      try {
        const cleanDigits = (phone || '').replace(/\D/g, '');
        const getNumberIdWithTimeout = (target) => Promise.race([
          client.getNumberId(target),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);

        let numberId = await getNumberIdWithTimeout(formattedPhone).catch(() => null);

        if (!numberId && cleanDigits.startsWith('549')) {
          const altNumber = '54' + cleanDigits.slice(3);
          numberId = await getNumberIdWithTimeout(altNumber).catch(() => null);
        } else if (!numberId && cleanDigits.startsWith('54') && !cleanDigits.startsWith('549')) {
          const altNumber = '549' + cleanDigits.slice(2);
          numberId = await getNumberIdWithTimeout(altNumber).catch(() => null);
        }

        if (numberId && numberId._serialized) {
          targetChatId = numberId._serialized;
          console.log(`[WhatsApp] Resolved ${phone} to WhatsApp ID ${targetChatId}`);
        } else {
          console.warn(`[WhatsApp] Warning: getNumberId returned null/timeout for ${phone}. Fallback to ${formattedPhone}`);
        }
      } catch (resErr) {
        console.warn(`[WhatsApp] Warning resolving numberId for ${phone}:`, resErr.message);
      }

      console.log(`Sending WhatsApp message locally to ${targetChatId}...`);
      const response = await client.sendMessage(targetChatId, text);
      return response;
    } catch (localErr) {
      console.warn(`[WhatsApp] Local send failed (${localErr.message}). Fallback to relay (port 3007)...`);
    }
  }

  // 2. Relay via ia-gonzadep (port 3007)
  try {
    const normalizedTarget = normalizeWhatsApp(phone) || (phone || '').replace(/\D/g, '');
    console.log(`[WhatsApp Relay] Relaying message for ${phone} (target: ${normalizedTarget}) to http://localhost:3007/api/whatsapp/send...`);
    const res = await fetch('http://localhost:3007/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: normalizedTarget, message: text }),
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status} desde servicio de WhatsApp relay`);
    }

    const data = await res.json();
    globalThis.whatsappRelayStatus = 'CONNECTED';
    console.log(`[WhatsApp Relay] Message sent successfully via ia-gonzadep:`, data);
    return data;
  } catch (relayErr) {
    console.error(`[WhatsApp Relay] Relay failed:`, relayErr.message);
    if (globalThis.whatsappStatus === 'CONNECTED' || globalThis.whatsappRelayStatus === 'CONNECTED') {
      throw new Error(`No se pudo entregar el mensaje al número ${phone} (${relayErr.message}). Verificá el formato del número en la ficha del cliente.`);
    }
    throw new Error(`El servicio de WhatsApp no está conectado (Local: ${globalThis.whatsappStatus}, Relay: ${relayErr.message})`);
  }
}

export async function logoutWhatsApp() {
  const client = globalThis.whatsappClient;
  if (client) {
    try {
      await client.logout();
    } catch (e) {
      console.error('Error during WhatsApp client.logout():', e);
    }
    try {
      await client.destroy();
    } catch (e) {
      console.error('Error during WhatsApp client.destroy():', e);
    }
    globalThis.whatsappClient = null;
  }

  try {
    const fs = await import('fs');
    if (fs.existsSync('./.wwebjs_auth')) {
      fs.rmSync('./.wwebjs_auth', { recursive: true, force: true });
      console.log('Forcefully removed WhatsApp session directory .wwebjs_auth');
    }
  } catch (e) {
    console.error('Error deleting .wwebjs_auth directory:', e);
  }

  globalThis.whatsappStatus = 'DISCONNECTED';
  globalThis.whatsappQr = '';
}

export function parseTemplate(template, client = {}, turno = {}, address = '') {
  if (!template) return '';
  const d = new Date(turno.fecha);
  const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  const timeStr = `${turno.horaInicio || ''} a ${turno.horaFin || ''}`.trim();

  // Day of week name (e.g., "Sábado", "Viernes", "Lunes")
  const dayOfWeekName = d.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'UTC' });
  const justDayName = dayOfWeekName ? (dayOfWeekName.charAt(0).toUpperCase() + dayOfWeekName.slice(1)) : '';

  // Full day string (e.g., "Viernes 4 de septiembre de 2026")
  const fullDayName = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const formattedFullDia = fullDayName ? (fullDayName.charAt(0).toUpperCase() + fullDayName.slice(1)) : '';

  // Date string with day name (e.g., "Viernes 04/09/2026")
  const dateStrWithDay = justDayName ? `${justDayName} ${dateStr}` : dateStr;

  let zonesStr = '';
  try {
    const zonesObj = typeof turno.zonas === 'string' ? JSON.parse(turno.zonas) : turno.zonas;
    if (Array.isArray(zonesObj)) {
      zonesStr = zonesObj.map(z => z.nombre || z).join(', ');
    } else {
      zonesStr = turno.zonas || '';
    }
  } catch (e) {
    zonesStr = turno.zonas || '';
  }

  const names = (client.nombreCompleto || client.nombre || '').trim().split(/\s+/);
  const nombre = names[0] || '';
  const apellido = names.slice(1).join(' ') || '';

  // Check if template explicitly contains [Día] or [Dia] or [DiaCompleto]
  const hasExplicitDay = /(\[|\{)(Día|Dia|DiaSemana|DíaSemana|Día\s*Completo|Dia\s*Completo|DiaCompleto|DíaCompleto)(\]|\})/i.test(template);

  // If template does not have explicit [Día], use dateStrWithDay (e.g., "Viernes 04/09/2026") for [FechaTurno] / [Fecha]
  const finalDateForPlaceholder = hasExplicitDay ? dateStr : dateStrWithDay;

  return template
    .replace(/(\[|\{)Nombre(\]|\})/gi, nombre)
    .replace(/(\[|\{)Apellido(\]|\})/gi, apellido)
    .replace(/(\[|\{)(Día\s*Completo|Dia\s*Completo|DiaCompleto|DíaCompleto)(\]|\})/gi, formattedFullDia)
    .replace(/(\[|\{)(Día|Dia|DiaSemana|DíaSemana)(\]|\})/gi, justDayName)
    .replace(/(\[|\{)FechaTurno(\]|\})/gi, finalDateForPlaceholder)
    .replace(/(\[|\{)Fecha(\]|\})/gi, finalDateForPlaceholder)
    .replace(/(\[|\{)Horario(\]|\})/gi, timeStr)
    .replace(/(\[|\{)Hora(\]|\})/gi, timeStr)
    .replace(/(\[|\{)HoraInicio(\]|\})/gi, turno.horaInicio || '')
    .replace(/(\[|\{)HoraFin(\]|\})/gi, turno.horaFin || '')
    .replace(/(\[|\{)Zonas(\]|\})/gi, zonesStr)
    .replace(/(\[|\{)ValorTotal(\]|\})/gi, () => (turno.valorTotal || 0).toString())
    .replace(/(\[|\{)Seña(\]|\})/gi, () => (turno.valorSeña || 0).toString())
    .replace(/(\[|\{)Direccion(\]|\})/gi, address || '')
    .replace(/(\[|\{)Dirección(\]|\})/gi, address || '');
}

export const parseWppTemplate = parseTemplate;

export async function checkAndSendReminders(force = false) {
  try {
    // Get time in Argentina (GMT-3)
    const now = new Date();
    const argOffset = -3;
    const argToday = new Date(now.getTime() + argOffset * 60 * 60 * 1000);
    const hour = argToday.getUTCHours();
    const todayStr = argToday.toISOString().split('T')[0];

    console.log(`[Reminder Cron] Checking: hour=${hour} today=${todayStr} lastRun=${globalThis.lastReminderRunDate} force=${force}`);

    // Check if within the 10:00 - 12:00 PM Argentina window (unless force=true)
    if (!force && (hour < 10 || hour > 12)) {
      return;
    }

    if (!force && globalThis.lastReminderRunDate === todayStr) {
      return;
    }

    await checkRelayStatus();
    const wtspStatus = getWhatsAppStatus();
    if (wtspStatus.status !== 'CONNECTED') {
      console.log(`[Reminder Cron] WhatsApp not connected yet (Local: ${globalThis.whatsappStatus}, Relay: ${globalThis.whatsappRelayStatus}). Postponing reminder check.`);
      return;
    }

    console.log('[Reminder Cron] Automated reminder window active. Fetching appointments for today + 2 days...');

    // Calculate start and end of target day (today + 2 days)
    const targetDate = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), argToday.getUTCDate()));
    targetDate.setUTCDate(targetDate.getUTCDate() + 2);

    const startRange = new Date(targetDate);
    startRange.setUTCHours(0, 0, 0, 0);

    const endRange = new Date(targetDate);
    endRange.setUTCHours(23, 59, 59, 999);

    console.log(`[Reminder Cron] Target range: ${startRange.toISOString()} to ${endRange.toISOString()}`);

    // Load configs
    const reminderConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_reminder_template' } });
    const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });
    const configGlobal = await prisma.configuracion.findUnique({ where: { key: 'global_notifications_enabled' } });
    
    const reminderTemplate = reminderConfig?.value || '';
    const address = addressConfig?.value || '';

    if (!reminderTemplate) {
      console.warn('[Reminder Cron] Reminder template is empty. Aborting reminders.');
      return;
    }

    // Load appointments scheduled for today + 2 days
    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startRange,
          lte: endRange
        },
        estado: {
          in: ['SEÑADO', 'REPROGRAMADO']
        }
      },
      include: {
        cliente: true
      }
    });

    console.log(`[Reminder Cron] Found ${turnos.length} appointments for 48h reminder check.`);

    let hasWppErrors = false;

    for (const t of turnos) {
      // Check specifically if a WHATSAPP REMINDER notification has already been sent in the last 3 days (avoids blocking rescheduled turnos)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const existingNotification = await prisma.notificacion.findFirst({
        where: {
          turnoId: t.id,
          canal: 'WHATSAPP',
          fechaEnvio: { gte: threeDaysAgo },
          OR: [
            { estado: 'ENVIADO', mensaje: { contains: '[RECORDATORIO_48H]' } },
            { estado: 'ENVIADO', mensaje: { contains: 'NO RESPONDER ESTE MENSAJE' } },
            { estado: 'ENVIADO', mensaje: { contains: 'Te recuerdo el turno' } },
            { estado: 'FALLIDO', mensaje: { contains: '[RECORDATORIO_48H_FALLIDO_NUMERO_INVALIDO]' } }
          ]
        }
      });

      if (!canSendNotification(t.cliente, 'WHATSAPP', 'RECORDATORIO')) {
        console.log(`[Reminder Cron] WhatsApp reminder disabled for client ${t.cliente?.nombreCompleto}. Skipping.`);
        continue;
      }

      if (existingNotification) {
        console.log(`[Reminder Cron] 48h Reminder already sent for appointment ${t.id} to ${t.cliente.nombreCompleto}. Skipping.`);
        continue;
      }

      const rawMessage = parseTemplate(reminderTemplate, t.cliente, t, address);
      const logMessage = `[RECORDATORIO_48H] ${rawMessage}`;

      try {
        console.log(`[Reminder Cron] Sending automated 48h WhatsApp reminder for appointment ${t.id} to ${t.cliente.nombreCompleto}...`);
        await sendWhatsAppMessage(t.cliente.whatsapp, rawMessage);

        // Save success notification log
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'WHATSAPP',
            mensaje: logMessage,
            estado: 'ENVIADO'
          }
        });

        // Polite pause between automated WhatsApp dispatches to prevent rate-limiting
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`[Reminder Cron] Failed to send automated WhatsApp reminder to ${t.cliente.nombreCompleto} (appointment ${t.id}):`, err);
        
        const isClientPhoneError = err.message && (
          err.message.includes('No LID for user') || 
          err.message.includes('not registered') ||
          err.message.includes('no está registrado')
        );

        if (!isClientPhoneError) {
          hasWppErrors = true;
        }

        if (err.message && (err.message.includes('detached Frame') || err.message.includes('Session closed') || err.message.includes('Target closed'))) {
          globalThis.whatsappStatus = 'DISCONNECTED';
        }

        // Save failure notification log
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'WHATSAPP',
            mensaje: isClientPhoneError ? `[RECORDATORIO_48H_FALLIDO_NUMERO_INVALIDO] ${rawMessage}` : logMessage,
            estado: 'FALLIDO'
          }
        });
      }
    }

    // ==========================================
    // EMAIL REMINDERS (7 Days Before)
    // ==========================================
    console.log('[Reminder Cron] Fetching appointments for today + 7 days for email reminders...');
    const target7Days = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), argToday.getUTCDate()));
    target7Days.setUTCDate(target7Days.getUTCDate() + 7);

    const start7Range = new Date(target7Days);
    start7Range.setUTCHours(0, 0, 0, 0);

    const end7Range = new Date(target7Days);
    end7Range.setUTCHours(23, 59, 59, 999);

    const turnos7 = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: start7Range,
          lte: end7Range
        },
        estado: {
          in: ['SEÑADO', 'REPROGRAMADO']
        }
      },
      include: {
        cliente: true
      }
    });

    console.log(`[Reminder Cron] Found ${turnos7.length} appointments for 7-day email reminders check.`);

    const email7SubjectConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reminder_7days_subject' } });
    const email7BodyConfig = await prisma.configuracion.findUnique({ where: { key: 'email_reminder_7days_body' } });
    const email7SubjectTemplate = email7SubjectConfig?.value || "Recordatorio de tu turno en 7 días - Gonzalo Depilación";
    const default7Body = "¡Hola {cliente}!\n\nTe recordamos que tenés un turno programado para dentro de 7 días:\n\n- Fecha: {fecha}\n- Horario: {horario}\n- Zonas: {zonas}\n- Seña abonada: {seña}\n- Saldo pendiente de cobro: {saldo}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si necesitás reprogramar o cancelar, recordá hacerlo con un mínimo de 72 hs de anticipación para conservar tu seña.\n\n¡Te esperamos!";
    const email7BodyTemplate = email7BodyConfig?.value || default7Body;

    if (email7BodyTemplate && turnos7.length > 0) {
      const { sendReminder7DaysEmail } = await import('./email.js');
      
      for (const t of turnos7) {
        if (!canSendNotification(t.cliente, 'EMAIL', 'RECORDATORIO')) {
          console.log(`[Reminder Cron] Email reminder disabled for client ${t.cliente?.nombreCompleto}. Skipping.`);
          continue;
        }

        if (t.estado === 'BLOQUEADO' || (t.cliente && t.cliente.email && t.cliente.email.includes('bloqueo'))) {
          continue;
        }

        const existing7Notification = await prisma.notificacion.findFirst({
          where: {
            turnoId: t.id,
            canal: 'EMAIL',
            estado: 'ENVIADO',
            mensaje: {
              startsWith: 'Recordatorio automático (7 días antes)'
            }
          }
        });

        if (existing7Notification) {
          console.log(`[Reminder Cron] 7-day email reminder already sent for appointment ${t.id} to ${t.cliente.nombreCompleto}. Skipping.`);
          continue;
        }

        try {
          console.log(`[Reminder Cron] Sending automatic 7-day email reminder to ${t.cliente.nombreCompleto}...`);
          await sendReminder7DaysEmail(
            t.cliente.email,
            t.cliente.nombreCompleto,
            t,
            address,
            email7SubjectTemplate,
            email7BodyTemplate
          );

          await prisma.notificacion.create({
            data: {
              clienteId: t.cliente.id,
              turnoId: t.id,
              canal: 'EMAIL',
              mensaje: `Recordatorio automático (7 días antes) enviado por correo electrónico.`,
              estado: 'ENVIADO'
            }
          });
        } catch (err) {
          console.error(`[Reminder Cron] Failed to send automatic 7-day email reminder to ${t.cliente.nombreCompleto}:`, err);
          await prisma.notificacion.create({
            data: {
              clienteId: t.cliente.id,
              turnoId: t.id,
              canal: 'EMAIL',
              mensaje: `Recordatorio automático (7 días antes) fallido: ${err.message}`,
              estado: 'FALLIDO'
            }
          });
        }
      }
    }

    // ==========================================
    // 2B. AUTOMATED WHATSAPP "VA A AVISAR" (By Client Frequency)
    // ==========================================
    try {
      console.log('[Reminder Cron] Checking clients for automated "Va a avisar" WhatsApp reminders...');
      const vaAAvisarConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_va_a_avisar_template' } });
      const rawVaAAvisarTpl = vaAAvisarConfig?.value?.trim();
      const vaAAvisarTemplate = (rawVaAAvisarTpl && rawVaAAvisarTpl !== '.')
        ? rawVaAAvisarTpl
        : "¡Hola [Nombre]! Te escribimos de Gonzalo Depilación Masculina ✨ Nos quedó pendiente coordinar tu próxima sesión tras tu última visita. ¿Cómo venís de tiempos esta semana o la próxima para coordinar un turno? ¡Avisanos cuando puedas!";

      const eligibleVaAAvisarClients = await prisma.cliente.findMany({
        where: {
          enviarNotificaciones: true,
          bloqueado: false,
          estado: 'ACTIVO'
        },
        include: {
          turnos: {
            where: { estado: { in: ['REALIZADO', 'SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION'] } },
            orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }]
          }
        }
      });

      for (const cl of eligibleVaAAvisarClients) {
        if (!cl.whatsapp || !canSendNotification(cl, 'WHATSAPP', 'RECORDATORIO')) continue;

        const completedTurnos = cl.turnos.filter(t => t.estado === 'REALIZADO');
        if (completedTurnos.length === 0) continue;
        const lastTurno = completedTurnos[0];

        // Check if last completed turno was marked as VA_A_AVISAR
        if (lastTurno.subEstado !== 'VA_A_AVISAR') continue;

        // Check if client already booked an active appointment after that lastTurno
        const lastTurnoTime = new Date(lastTurno.fecha).getTime();
        const hasFutureTurno = cl.turnos.some(t => {
          if (['CANCELADO', 'NO_ASISTIO', 'BLOQUEADO'].includes(t.estado)) return false;
          return new Date(t.fecha).getTime() > lastTurnoTime;
        });
        if (hasFutureTurno) continue;

        // Target date: automated "Va a avisar" is sent 1 week before the next session date (frequency in weeks)
        const freqWeeks = Number(cl.frecuencia || 4);
        const advanceWeeks = Math.max(0, freqWeeks - 1);
        const targetDate = new Date(lastTurnoTime + (advanceWeeks * 7 * 24 * 60 * 60 * 1000));
        
        // Only trigger if today has arrived at or passed targetDate
        if (argToday < targetDate) continue;

        // Prevent sending on archaic turnos older than 90 days
        const maxThreshold = new Date(argToday.getTime() - (90 * 24 * 60 * 60 * 1000));
        if (new Date(lastTurno.fecha) < maxThreshold) continue;

        // Check if already sent since lastTurno.fecha
        const alreadySent = await prisma.notificacion.findFirst({
          where: {
            clienteId: cl.id,
            canal: 'WHATSAPP',
            fechaEnvio: { gte: lastTurno.fecha },
            mensaje: { contains: '[VA_A_AVISAR]' }
          }
        });
        if (alreadySent) continue;

        const firstName = cl.nombreCompleto?.split(' ')[0] || cl.nombreCompleto || 'estimado';
        const rawMsg = vaAAvisarTemplate
          .replaceAll('[Nombre]', firstName)
          .replaceAll('{cliente}', cl.nombreCompleto || '')
          .replaceAll('[FechaTurno]', lastTurno.fecha ? new Date(lastTurno.fecha).toLocaleDateString('es-AR') : '');

        try {
          console.log(`[Reminder Cron] Sending automated "Va a avisar" WhatsApp to ${cl.nombreCompleto} (${cl.whatsapp})...`);
          await sendWhatsAppMessage(cl.whatsapp, rawMsg);

          await prisma.notificacion.create({
            data: {
              clienteId: cl.id,
              turnoId: lastTurno.id,
              canal: 'WHATSAPP',
              mensaje: `[VA_A_AVISAR] ${rawMsg}`,
              estado: 'ENVIADO'
            }
          });

          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[Reminder Cron] Failed to send automated "Va a avisar" WhatsApp to ${cl.nombreCompleto}:`, err);
          await prisma.notificacion.create({
            data: {
              clienteId: cl.id,
              turnoId: lastTurno.id,
              canal: 'WHATSAPP',
              mensaje: `[VA_A_AVISAR_FALLIDO] ${rawMsg} (Error: ${err.message})`,
              estado: 'FALLIDO'
            }
          });
        }
      }
    } catch (vaErr) {
      console.error('[Reminder Cron] Error in "Va a avisar" automated routine:', vaErr);
    }

    // ==========================================
    // 2C. AUTOMATED MAINTENANCE / FINALIZADO REMINDERS (75 DAYS / 2.5 MONTHS)
    // ==========================================
    try {
      console.log('[Reminder Cron] Checking clients for 75-day maintenance WhatsApp & email reminders...');
      const maintConf = await prisma.configuracion.findUnique({ where: { key: 'wtsp_mantenimiento_template' } });
      const rawMaintTpl = maintConf?.value?.trim();
      const wtspMaintTemplate = (rawMaintTpl && rawMaintTpl !== '.')
        ? rawMaintTpl
        : "¡Hola [Nombre]! Te escribimos de Gonzalo Depilación ✨ Ya pasaron dos meses y medio desde tu última sesión de tratamiento. Te recomendamos realizar tu sesión de mantenimiento para conservar los mejores resultados a largo plazo. ¿Te gustaría que coordinemos un turno para estos días?";

      const eligibleMaintClients = await prisma.cliente.findMany({
        where: {
          enviarNotificaciones: true,
          bloqueado: false,
          OR: [
            { estado: 'FINALIZADO' },
            { notifMantenimiento: true }
          ]
        },
        include: {
          turnos: {
            where: { estado: { in: ['REALIZADO', 'SEÑADO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION'] } },
            orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }]
          }
        }
      });

      for (const cl of eligibleMaintClients) {
        if (cl.notifMantenimiento === false) continue;

        const completedTurnos = cl.turnos.filter(t => t.estado === 'REALIZADO');
        if (completedTurnos.length === 0) continue;
        const lastTurno = completedTurnos[0];

        // Eligible if client is marked FINALIZADO or last turno has subEstado FINALIZADO / MANTENIMIENTO
        const isEligibleState = cl.estado === 'FINALIZADO' || lastTurno.subEstado === 'FINALIZADO' || lastTurno.subEstado === 'MANTENIMIENTO';
        if (!isEligibleState) continue;

        // Check if client already booked an active appointment after that lastTurno
        const lastTurnoTime = new Date(lastTurno.fecha).getTime();
        const hasFutureTurno = cl.turnos.some(t => {
          if (['CANCELADO', 'NO_ASISTIO', 'BLOQUEADO'].includes(t.estado)) return false;
          return new Date(t.fecha).getTime() > lastTurnoTime;
        });
        if (hasFutureTurno) continue;

        // Target date: 75 days after last session (2.5 months)
        const targetMaintDate = new Date(lastTurnoTime + (75 * 24 * 60 * 60 * 1000));
        if (argToday < targetMaintDate) continue;

        // Prevent spam on ancient appointments older than 180 days
        const maxThreshold = new Date(argToday.getTime() - (180 * 24 * 60 * 60 * 1000));
        if (new Date(lastTurno.fecha) < maxThreshold) continue;

        // Check if WhatsApp was already sent since lastTurno.fecha
        const alreadySentWtsp = await prisma.notificacion.findFirst({
          where: {
            clienteId: cl.id,
            canal: 'WHATSAPP',
            fechaEnvio: { gte: lastTurno.fecha },
            mensaje: { contains: '[MANTENIMIENTO]' }
          }
        });

        const firstName = cl.nombreCompleto?.split(' ')[0] || cl.nombreCompleto || 'estimado';
        let zonesText = '';
        try {
          const parsed = JSON.parse(lastTurno.zonas);
          zonesText = Array.isArray(parsed) ? parsed.map(z => z.nombre || z.name || '').filter(Boolean).join(', ') : (lastTurno.zonas || '');
        } catch (e) {
          zonesText = lastTurno.zonas || '';
        }

        // Dispatch WhatsApp if not sent and client has WhatsApp
        if (!alreadySentWtsp && cl.whatsapp && canSendNotification(cl, 'WHATSAPP', 'MANTENIMIENTO')) {
          const rawWtspMsg = wtspMaintTemplate
            .replaceAll('[Nombre]', firstName)
            .replaceAll('{cliente}', cl.nombreCompleto || '')
            .replaceAll('{zonas}', zonesText);

          try {
            console.log(`[Reminder Cron] Sending automated maintenance WhatsApp to ${cl.nombreCompleto} (${cl.whatsapp})...`);
            await sendWhatsAppMessage(cl.whatsapp, rawWtspMsg);

            await prisma.notificacion.create({
              data: {
                clienteId: cl.id,
                turnoId: lastTurno.id,
                canal: 'WHATSAPP',
                mensaje: `[MANTENIMIENTO] ${rawWtspMsg}`,
                estado: 'ENVIADO'
              }
            });

            await new Promise(r => setTimeout(r, 2000));
          } catch (err) {
            console.error(`[Reminder Cron] Failed to send automated maintenance WhatsApp to ${cl.nombreCompleto}:`, err);
            await prisma.notificacion.create({
              data: {
                clienteId: cl.id,
                turnoId: lastTurno.id,
                canal: 'WHATSAPP',
                mensaje: `[MANTENIMIENTO_FALLIDO] ${rawWtspMsg} (Error: ${err.message})`,
                estado: 'FALLIDO'
              }
            });
          }
        }

        // Dispatch Email if not sent and client has Email
        if (cl.email && canSendNotification(cl, 'EMAIL', 'MANTENIMIENTO')) {
          const alreadySentEmail = await prisma.notificacion.findFirst({
            where: {
              clienteId: cl.id,
              canal: 'EMAIL',
              fechaEnvio: { gte: lastTurno.fecha },
              mensaje: { contains: 'mantenimiento' }
            }
          });

          if (!alreadySentEmail) {
            const subjectConf = await prisma.configuracion.findUnique({ where: { key: 'email_maintenance_subject' } });
            const bodyConf = await prisma.configuracion.findUnique({ where: { key: 'email_maintenance_body' } });
            const subjectTemplate = subjectConf?.value || '¡Es hora de tu mantenimiento! - Gonzalo Depilación';
            const bodyTemplate = bodyConf?.value || '¡Hola {cliente}!\n\nHace dos meses y medio finalizaste tu tratamiento de depilación láser.\n\nTe escribimos para invitarte a realizar una sesión de mantenimiento. Mantener los resultados te ayudará a lucir siempre impecable y conservar el efecto del tratamiento a largo plazo.\n\nPodés reservar tu turno ingresando directamente a nuestro sitio web.\n\n¡Te esperamos!';

            const parsedSubject = subjectTemplate.replaceAll('{cliente}', cl.nombreCompleto || '').replaceAll('{zonas}', zonesText);
            const parsedBody = bodyTemplate.replaceAll('{cliente}', cl.nombreCompleto || '').replaceAll('{zonas}', zonesText);

            try {
              console.log(`[Reminder Cron] Sending maintenance email to ${cl.nombreCompleto}...`);
              await sendMaintenanceEmail(cl.email, parsedSubject, parsedBody);

              await prisma.notificacion.create({
                data: {
                  clienteId: cl.id,
                  turnoId: lastTurno.id,
                  canal: 'EMAIL',
                  mensaje: `Correo de mantenimiento automático enviado. Asunto: "${parsedSubject}"`,
                  estado: 'ENVIADO'
                }
              });
            } catch (err) {
              console.error(`[Reminder Cron] Failed to send maintenance email to ${cl.nombreCompleto}:`, err);
            }
          }
        }
      }
    } catch (maintErr) {
      console.error('[Reminder Cron] Error in maintenance automated routine:', maintErr);
    }

    // ==========================================
    // 3. AUTOMATED BIRTHDAY GREETINGS (10:00 AM) - ÚNICAMENTE POR MAIL (NO WPP)
    // ==========================================
    try {
      const allClientsWithBirthday = await prisma.cliente.findMany({
        where: {
          fechaNacimiento: { not: null },
          estado: 'ACTIVO'
        }
      });

      const currentMonth = argToday.getUTCMonth() + 1;
      const currentDay = argToday.getUTCDate();
      const currentYear = argToday.getUTCFullYear();
      const startOfCurrentYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);

      const birthdayClients = allClientsWithBirthday.filter(c => {
        if (!c.fechaNacimiento) return false;
        const bDate = new Date(c.fechaNacimiento);
        return (bDate.getUTCMonth() + 1) === currentMonth && bDate.getUTCDate() === currentDay;
      });

      if (birthdayClients.length > 0) {
        console.log(`[Reminder Cron] Found ${birthdayClients.length} clients with birthday today (${currentDay}/${currentMonth})! Sending greetings strictly via EMAIL...`);

        for (const c of birthdayClients) {
          if (!c.email || !c.email.trim()) {
            console.log(`[Reminder Cron] Client ${c.nombreCompleto} has birthday today but no email address configured. Skipping.`);
            continue;
          }

          if (!canSendNotification(c, 'EMAIL', 'ALTA')) {
            console.log(`[Reminder Cron] Notifications via EMAIL disabled for client ${c.nombreCompleto}. Skipping.`);
            continue;
          }

          // Check if already greeted via email this year
          const alreadyGreeted = await prisma.notificacion.findFirst({
            where: {
              clienteId: c.id,
              canal: 'EMAIL',
              mensaje: { contains: 'cumpleaños' },
              fechaEnvio: { gte: startOfCurrentYear },
              estado: 'ENVIADO'
            }
          });

          if (alreadyGreeted) {
            console.log(`[Reminder Cron] Client ${c.nombreCompleto} was already greeted via EMAIL for their birthday this year. Skipping.`);
            continue;
          }

          try {
            console.log(`[Reminder Cron] Sending birthday greeting email to ${c.nombreCompleto} (${c.email})...`);
            await sendBirthdayEmail(c.email, c.nombreCompleto);

            await prisma.notificacion.create({
              data: {
                clienteId: c.id,
                canal: 'EMAIL',
                mensaje: `Correo de cumpleaños automático enviado con éxito a ${c.email}`,
                estado: 'ENVIADO'
              }
            });
          } catch (err) {
            console.error(`[Reminder Cron] Failed to send birthday greeting email to ${c.nombreCompleto}:`, err);
            await prisma.notificacion.create({
              data: {
                clienteId: c.id,
                canal: 'EMAIL',
                mensaje: `Error al enviar correo de cumpleaños a ${c.email}: ${err.message}`,
                estado: 'FALLIDO'
              }
            });
          }
        }
      }
    } catch (bdayErr) {
      console.error('[Reminder Cron] Error processing birthday greetings via email:', bdayErr);
    }

    if (!hasWppErrors) {
      globalThis.lastReminderRunDate = todayStr;
      console.log(`[Reminder Cron] All reminders for ${todayStr} processed successfully. Locked until tomorrow.`);
    } else {
      console.warn(`[Reminder Cron] Some reminders encountered errors for ${todayStr}. Will retry on next cron tick within window.`);
    }
  } catch (error) {
    console.error('[Reminder Cron] Error in automated reminder cron:', error);
  }
}

let reminderInterval = null;

export function startReminderCron() {
  if (reminderInterval) return;

  console.log('[Reminder Cron] Initializing automated WhatsApp reminder cron (checks every 1 minute for exact 10:00 AM dispatch)...');
  
  // Run immediate check
  checkAndSendReminders().catch(err => {
    console.error('[Reminder Cron] Error running initial reminder check:', err);
  });

  reminderInterval = setInterval(() => {
    checkAndSendReminders().catch(err => {
      console.error('[Reminder Cron] Error running automated reminder check:', err);
    });
  }, 60 * 1000); // Check every 1 minute
}

// Auto-start watchdog, reminder cron and client re-connection on server runtime (NOT during Next.js build phase)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  (process.argv && process.argv.some(arg => String(arg).includes('build')));

if (typeof window === 'undefined' && !isBuildPhase) {
  if (process.env.WHATSAPP_ENABLED !== 'false') {
    startWhatsAppWatchdog();
    startReminderCron();
    if (fs.existsSync('./.wwebjs_auth') && globalThis.whatsappStatus === 'DISCONNECTED' && !globalThis.whatsappClient) {
      console.log('[WhatsApp Auto-Boot] Discovered existing session .wwebjs_auth. Auto-initializing client on boot...');
      try {
        initWhatsAppClient();
      } catch (e) {
        console.error('[WhatsApp Auto-Boot] Error auto-initializing client:', e);
      }
    }
  } else {
    console.log('[WhatsApp] WHATSAPP_ENABLED=false: Watchdog, reminder cron and auto-boot disabled.');
  }
}

