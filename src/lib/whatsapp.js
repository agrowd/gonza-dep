import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import prisma from './db.js';
import { sendMaintenanceEmail } from './email.js';

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

    // Check if within the 10:00 - 12:00 PM Argentina window
    if (hour < 10 || hour > 12) {
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

    for (const t of turnos) {
      // Check specifically if a WHATSAPP REMINDER notification has already been sent for this appointment
      const existingNotification = await prisma.notificacion.findFirst({
        where: {
          turnoId: t.id,
          canal: 'WHATSAPP',
          OR: [
            { mensaje: { contains: '[RECORDATORIO_48H]' } },
            { mensaje: { contains: 'NO RESPONDER ESTE MENSAJE' } },
            { mensaje: { contains: 'Te recuerdo el turno' } }
          ]
        }
      });

      if (t.cliente && t.cliente.enviarNotificaciones === false) {
        console.log(`[Reminder Cron] Notifications disabled for client ${t.cliente.nombreCompleto}. Skipping WhatsApp reminder.`);
        continue;
      }

      if (existingNotification) {
        console.log(`[Reminder Cron] 48h Reminder already sent for appointment ${t.id} to ${t.cliente.nombreCompleto}. Skipping.`);
        continue;
      }

      const rawMessage = parseTemplate(reminderTemplate, t.cliente, t, address);
      const logMessage = `[RECORDATORIO_48H] ${rawMessage}`;

      try {
        if (globalThis.whatsappStatus === 'CONNECTED') {
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
            mensaje: logMessage,
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
    const default7Body = "¡Hola {cliente}!\n\nTe recordamos que tenés un turno programado para dentro de 7 días:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n- Saldo pendiente de cobro: {saldo}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si necesitás reprogramar o cancelar, recordá hacerlo con un mínimo de 72 hs de anticipación para conservar tu seña.\n\n¡Te esperamos!";
    const email7BodyTemplate = email7BodyConfig?.value || default7Body;

    if (email7BodyTemplate && turnos7.length > 0) {
      const { sendReminder7DaysEmail } = await import('./email.js');
      
      for (const t of turnos7) {
        if (t.cliente && t.cliente.enviarNotificaciones === false) {
          console.log(`[Reminder Cron] Notifications disabled for client ${t.cliente.nombreCompleto}. Skipping Email reminder.`);
          continue;
        }

        if (t.estado === 'BLOQUEADO' || (t.cliente && t.cliente.email && t.cliente.email.includes('bloqueo'))) {
          continue;
        }

        const existing7Notification = await prisma.notificacion.findFirst({
          where: {
            turnoId: t.id,
            canal: 'EMAIL',
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
    // AUTOMATED MAINTENANCE REMINDERS (75 DAYS)
    // ==========================================
    console.log('[Reminder Cron] Checking finished appointments for 75-day maintenance reminders...');

    const maintTargetDate = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), argToday.getUTCDate()));
    maintTargetDate.setUTCDate(maintTargetDate.getUTCDate() - 75);

    const maintStartRange = new Date(maintTargetDate);
    maintStartRange.setUTCHours(0, 0, 0, 0);

    const maintEndRange = new Date(maintTargetDate);
    maintEndRange.setUTCHours(23, 59, 59, 999);

    const finishedTurnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: maintStartRange,
          lte: maintEndRange
        },
        estado: 'REALIZADO'
      },
      include: {
        cliente: true
      }
    });

    console.log(`[Reminder Cron] Found ${finishedTurnos.length} finished turnos on target maintenance date.`);

    for (const t of finishedTurnos) {
      if (!t.cliente || !t.cliente.email || t.cliente.estado !== 'FINALIZADO') continue;

      // Check if client has any newer turnos
      const newerTurno = await prisma.turno.findFirst({
        where: {
          clienteId: t.clienteId,
          fecha: {
            gt: t.fecha
          }
        }
      });

      if (newerTurno) {
        console.log(`[Reminder Cron] Client ${t.cliente.nombreCompleto} has newer turnos. Skipping maintenance.`);
        continue;
      }

      // Check if a maintenance email was already sent
      const alreadySent = await prisma.notificacion.findFirst({
        where: {
          clienteId: t.clienteId,
          mensaje: {
            contains: 'mantenimiento'
          },
          canal: 'EMAIL'
        }
      });

      if (alreadySent) {
        console.log(`[Reminder Cron] Maintenance email already sent before to ${t.cliente.nombreCompleto}. Skipping.`);
        continue;
      }

      // Load config templates
      const subjectConf = await prisma.configuracion.findUnique({ where: { key: 'email_maintenance_subject' } });
      const bodyConf = await prisma.configuracion.findUnique({ where: { key: 'email_maintenance_body' } });

      const subjectTemplate = subjectConf?.value || '¡Te extrañamos! Es hora de tu mantenimiento de depilación láser';
      const bodyTemplate = bodyConf?.value || 'Hola {cliente}, te recomendamos realizar una sesión de mantenimiento para tus zonas: {zonas}.';

      let zonesText = '';
      try {
        const parsed = JSON.parse(t.zonas);
        zonesText = parsed.map(z => z.nombre).join(', ');
      } catch (e) {
        zonesText = t.zonas;
      }

      const parseEmailTemplate = (template, clientName, zonesText) => {
        return template
          .replaceAll('{cliente}', clientName)
          .replaceAll('{zonas}', zonesText);
      };

      const parsedSubject = parseEmailTemplate(subjectTemplate, t.cliente.nombreCompleto, zonesText);
      const parsedBody = parseEmailTemplate(bodyTemplate, t.cliente.nombreCompleto, zonesText);

      try {
        console.log(`[Reminder Cron] Sending maintenance email to ${t.cliente.nombreCompleto}...`);
        await sendMaintenanceEmail(t.cliente.email, parsedSubject, parsedBody);

        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'EMAIL',
            mensaje: `Correo de mantenimiento automático enviado. Asunto: "${parsedSubject}"`,
            estado: 'ENVIADO'
          }
        });
      } catch (err) {
        console.error(`[Reminder Cron] Failed to send maintenance email to ${t.cliente.nombreCompleto}:`, err);
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'EMAIL',
            mensaje: `Error al enviar correo de mantenimiento automático: ${err.message}`,
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
