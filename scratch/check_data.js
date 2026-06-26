import fs from 'fs';
import path from 'path';

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

async function main() {
  console.log("=== CHECKING DB DATA ===");
  loadEnv();
  
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const dbModule = await import('../src/lib/db.js');
  const prisma = dbModule.default;

  const turnos = await prisma.turno.findMany({
    include: { cliente: true },
    orderBy: { fecha: 'asc' }
  });
  console.log("Total turnos in DB:", turnos.length);
  
  const now = new Date();
  console.log("Server current date/time:", now.toISOString());
  console.log("Server local date/time string:", now.toString());

  turnos.forEach(t => {
    console.log(`- Turno ID: ${t.id}`);
    console.log(`  Cliente: ${t.cliente.nombreCompleto} (${t.cliente.whatsapp})`);
    console.log(`  Fecha en DB (ISO): ${t.fecha.toISOString()}`);
    console.log(`  Fecha Str (Local): ${t.fecha.toString()}`);
    console.log(`  Hora: ${t.horaInicio} - ${t.horaFin}`);
    console.log(`  Estado: ${t.estado}`);
  });
}

main().catch(console.error);
