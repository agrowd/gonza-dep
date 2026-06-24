import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

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
