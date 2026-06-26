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
      val = val.replace(/\\"/g, '"');
      process.env[key] = val;
    }
  });
}

async function testQuery(weekType) {
  loadEnv();
  const dbModule = await import('../src/lib/db.js');
  const prisma = dbModule.default;

  console.log(`\n--- TESTING QUERY FOR weekType: ${weekType} ---`);
  let startRange, endRange;

  if (weekType === '2days') {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    
    startRange = new Date(targetDate);
    startRange.setHours(0, 0, 0, 0);

    endRange = new Date(targetDate);
    endRange.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    
    // Calculate Monday of current week
    const currentDay = now.getDay();
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    if (weekType === 'next') {
      startOfWeek.setDate(startOfWeek.getDate() + 7);
    }

    startRange = new Date(startOfWeek);

    endRange = new Date(startOfWeek);
    endRange.setDate(startOfWeek.getDate() + 6); // Up to Sunday
    endRange.setHours(23, 59, 59, 999);
  }

  console.log("Calculated startRange:", startRange.toISOString(), "(Local string:", startRange.toString(), ")");
  console.log("Calculated endRange:", endRange.toISOString(), "(Local string:", endRange.toString(), ")");

  // Fetch turnos in the range
  const turnos = await prisma.turno.findMany({
    where: {
      fecha: {
        gte: startRange,
        lte: endRange
      },
      estado: {
        in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO']
      }
    },
    include: {
      cliente: true
    }
  });

  console.log("Found turnos count:", turnos.length);
  turnos.forEach(t => {
    console.log(`- ID: ${t.id}, Cliente: ${t.cliente.nombreCompleto}, Fecha: ${t.fecha.toISOString()}, Hora: ${t.horaInicio}, Estado: ${t.estado}`);
  });
}

async function run() {
  await testQuery('current');
  await testQuery('2days');
  await testQuery('next');
}

run().catch(console.error);
