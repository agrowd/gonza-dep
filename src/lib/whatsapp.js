import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import prisma from './db.js';

// Use globalThis to cache the client across hot-reloads in development
if (!globalThis.whatsappStatus) {
  globalThis.whatsappStatus = 'DISCONNECTED'; // 'DISCONNECTED', 'INITIALIZING', 'QR_RECEIVED', 'CONNECTED'
}
if (!globalThis.whatsappQr) {
  globalThis.whatsappQr = '';
}

export function getWhatsAppStatus() {
  return {
    status: globalThis.whatsappStatus,
    qr: globalThis.whatsappQr,
    error: globalThis.whatsappError || null
  };
}

export function initWhatsAppClient() {
  if (globalThis.whatsappClient) {
    if (globalThis.whatsappStatus === 'CONNECTED') {
      startReminderCron();
    }
    return globalThis.whatsappClient;
  }

  globalThis.whatsappStatus = 'INITIALIZING';
  globalThis.whatsappError = null;
  globalThis.whatsappQr = '';

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
        '--disable-gpu'
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
    startReminderCron();
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated.');
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication failure:', msg);
    globalThis.whatsappStatus = 'DISCONNECTED';
    globalThis.whatsappError = `Autenticación fallida: ${msg}`;
    globalThis.whatsappQr = '';
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected:', reason);
    globalThis.whatsappStatus = 'DISCONNECTED';
    globalThis.whatsappQr = '';
    // Clean up instance to allow re-initialization
    globalThis.whatsappClient = null;
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

export function formatArgentinaPhone(phone) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');

  // If it's already an email-like ID (e.g. ends with @c.us), return it
  if (phone.includes('@c.us')) {
    return phone;
  }

  // If it starts with 54:
  if (cleaned.startsWith('54')) {
    // If it is 549 followed by 10 digits (e.g. 5491171244149), it is already correct.
    if (cleaned.startsWith('549') && cleaned.length === 13) {
      return `${cleaned}@c.us`;
    }
    // If it's 54 followed by 10 digits (e.g. 541171244149), insert the 9.
    if (cleaned.length === 12) {
      return `549${cleaned.slice(2)}@c.us`;
    }
    // Remove the 54 prefix to normalize as local number
    cleaned = cleaned.slice(2);
  }

  // Now we have a local number (or it was local from the start)
  // Handle leading '15' for Buenos Aires (e.g., 1571244149 -> 1171244149)
  if (cleaned.startsWith('15') && cleaned.length === 10) {
    cleaned = `11${cleaned.slice(2)}`;
  }

  // Handle '15' in the middle for area codes (e.g., 341156123456 -> 3416123456)
  // Standard local mobile numbers have 10 digits. If it has 12 digits and '15' is in the middle:
  if (cleaned.length === 12 && (cleaned.startsWith('34115') || cleaned.startsWith('26115') || cleaned.startsWith('35115'))) {
    cleaned = cleaned.slice(0, 3) + cleaned.slice(5);
  } else if (cleaned.length === 12 && cleaned.slice(2, 4) === '15') {
    cleaned = cleaned.slice(0, 2) + cleaned.slice(4);
  }

  // If we ended up with a standard 10 digit number, prepend 549
  if (cleaned.length === 10) {
    return `549${cleaned}@c.us`;
  }

  // Fallback: if it's already longer (e.g. has country code + 9), just return it
  if (cleaned.length > 10) {
    return `${cleaned}@c.us`;
  }

  // If it's shorter (e.g. 8 digits), assume area code 11 and mobile 9
  if (cleaned.length === 8) {
    return `54911${cleaned}@c.us`;
  }

  return `${cleaned}@c.us`;
}

export async function sendWhatsAppMessage(phone, text) {
  const client = globalThis.whatsappClient;
  if (!client || globalThis.whatsappStatus !== 'CONNECTED') {
    throw new Error('El servicio de WhatsApp no está conectado.');
  }

  const formattedPhone = formatArgentinaPhone(phone);

  console.log(`Sending WhatsApp message to ${formattedPhone}...`);
  const response = await client.sendMessage(formattedPhone, text);
  return response;
}

export async function logoutWhatsApp() {
  const client = globalThis.whatsappClient;
  if (client) {
    try {
      await client.logout();
      await client.destroy();
    } catch (e) {
      console.error('Error during WhatsApp logout:', e);
    }
    globalThis.whatsappClient = null;
    globalThis.whatsappStatus = 'DISCONNECTED';
    globalThis.whatsappQr = '';
  }
}

function parseTemplate(template, client, turno, address) {
  const d = new Date(turno.fecha);
  const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  const timeStr = `${turno.horaInicio} a ${turno.horaFin}`;
  
  let zonesStr = '';
  try {
    const zonesObj = JSON.parse(turno.zonas);
    zonesStr = zonesObj.map(z => z.nombre).join(', ');
  } catch (e) {
    zonesStr = turno.zonas || '';
  }

  const names = client.nombreCompleto.trim().split(/\s+/);
  const nombre = names[0] || '';
  const apellido = names.slice(1).join(' ') || '';

  return template
    .replace(/\[Nombre\]/g, nombre)
    .replace(/\[Apellido\]/g, apellido)
    .replace(/\[FechaTurno\]/g, dateStr)
    .replace(/\[Horario\]/g, timeStr)
    .replace(/\[Zonas\]/g, zonesStr)
    .replace(/\[ValorTotal\]/g, turno.valorTotal.toString())
    .replace(/\[Seña\]/g, turno.valorSeña.toString())
    .replace(/\[Direccion\]/g, address);
}

export async function checkAndSendReminders() {
  try {
    // Get time in Argentina (GMT-3)
    const now = new Date();
    const argOffset = -3;
    const argToday = new Date(now.getTime() + argOffset * 60 * 60 * 1000);
    const hour = argToday.getUTCHours();
    const todayStr = argToday.toISOString().split('T')[0];

    console.log(`[Reminder Cron] Checking: hour=${hour} today=${todayStr} lastRun=${globalThis.lastReminderRunDate}`);

    // Check if within the 10:00 - 11:00 AM Argentina window
    if (hour !== 10) {
      return;
    }

    if (globalThis.lastReminderRunDate === todayStr) {
      return;
    }

    console.log('[Reminder Cron] Automated reminder window active. Fetching appointments for today + 2 days...');
    
    // Set run date to prevent duplicate executions
    globalThis.lastReminderRunDate = todayStr;

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

    console.log(`[Reminder Cron] Found ${turnos.length} appointments for reminder check.`);

    for (const t of turnos) {
      // Check if a WHATSAPP notification has already been sent for this specific appointment
      const existingNotification = await prisma.notificacion.findFirst({
        where: {
          turnoId: t.id,
          canal: 'WHATSAPP'
        }
      });

      if (existingNotification) {
        console.log(`[Reminder Cron] Reminder already sent for appointment ${t.id} to ${t.cliente.nombreCompleto}. Skipping.`);
        continue;
      }

      const message = parseTemplate(reminderTemplate, t.cliente, t, address);

      try {
        if (globalThis.whatsappStatus === 'CONNECTED') {
          console.log(`[Reminder Cron] Sending automated reminder for appointment ${t.id} to ${t.cliente.nombreCompleto}...`);
          await sendWhatsAppMessage(t.cliente.whatsapp, message);

          // Save success notification log
          await prisma.notificacion.create({
            data: {
              clienteId: t.cliente.id,
              turnoId: t.id,
              canal: 'WHATSAPP',
              mensaje: message,
              estado: 'ENVIADO'
            }
          });
        } else {
          console.warn('[Reminder Cron] Cannot send automated WhatsApp reminder: Client is disconnected.');
        }
      } catch (err) {
        console.error(`[Reminder Cron] Failed to send automated WhatsApp reminder to ${t.cliente.nombreCompleto} (appointment ${t.id}):`, err);
        // Save failure notification log
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'WHATSAPP',
            mensaje: message,
            estado: 'FALLIDO'
          }
        });
      }
    }
  } catch (error) {
    console.error('[Reminder Cron] Error in automated reminder cron:', error);
  }
}

let reminderInterval = null;

export function startReminderCron() {
  if (reminderInterval) return;

  console.log('[Reminder Cron] Initializing automated WhatsApp reminder cron (checks every 15 minutes)...');
  
  // Run immediate check
  checkAndSendReminders().catch(err => {
    console.error('[Reminder Cron] Error running initial reminder check:', err);
  });

  reminderInterval = setInterval(() => {
    checkAndSendReminders().catch(err => {
      console.error('[Reminder Cron] Error running automated reminder check:', err);
    });
  }, 15 * 60 * 1000); // 15 minutes
}
