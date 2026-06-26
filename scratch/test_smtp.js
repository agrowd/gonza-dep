import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Helper to load and parse .env file
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log(`.env not found at ${envPath}, trying .env.production`);
    const envProdPath = path.resolve(process.cwd(), 'scratch/.env.production');
    if (!fs.existsSync(envProdPath)) {
      console.log(`scratch/.env.production not found either. using process.env directly.`);
      return;
    }
    parseEnvFile(envProdPath);
  } else {
    parseEnvFile(envPath);
  }
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remove surrounding quotes if any
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      // Unescape double quotes if escaped
      val = val.replace(/\\"/g, '"');
      process.env[key] = val;
    }
  });
}

async function testSMTP() {
  loadEnv();

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Gonzalo Depilación" <noreply@depilacionparahombres.com>`;

  console.log('--- SMTP Configuration ---');
  console.log('Host:', host);
  console.log('Port:', port);
  console.log('Secure:', secure);
  console.log('User:', user);
  console.log('Pass:', pass ? '*** (Length: ' + pass.length + ')' : 'None');
  console.log('From:', from);
  console.log('--------------------------');

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment variables.');
  }

  console.log('Creating transporter...');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  console.log('Verifying connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
  } catch (error) {
    console.error('❌ SMTP connection verification failed:');
    throw error;
  }

  console.log('Sending test email to', user);
  const info = await transporter.sendMail({
    from,
    to: user,
    subject: 'Test de Conexión SMTP - Gonzalo Depilación',
    text: 'Este es un correo de prueba para verificar la configuración SMTP en el servidor de producción.',
    html: '<p>Este es un correo de prueba para verificar la configuración SMTP en el servidor de producción.</p>'
  });

  console.log('✅ Email sent successfully!');
  console.log('Message ID:', info.messageId);
}

testSMTP().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
