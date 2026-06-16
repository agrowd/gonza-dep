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

export async function sendWhatsAppMessage(phone, text) {
  const client = globalThis.whatsappClient;
  if (!client || globalThis.whatsappStatus !== 'CONNECTED') {
    throw new Error('El servicio de WhatsApp no está conectado.');
  }

  // Format phone number to WhatsApp ID: e.g. "5491122334455@c.us"
  // Clean special characters: spaces, dashes, +, etc.
  let cleaned = phone.replace(/\D/g, '');
  
  // Argentina numbers format: whatsapp-web.js often requires country code + 9 + area code + number
  // We'll trust the input phone number is clean or formatted, but we can do a simple prefix check
  if (!cleaned.endsWith('@c.us')) {
    cleaned = `${cleaned}@c.us`;
  }

  console.log(`Sending WhatsApp message to ${cleaned}...`);
  const response = await client.sendMessage(cleaned, text);
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
