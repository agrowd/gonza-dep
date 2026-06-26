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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      val = val.replace(/\\"/g, '"');
      process.env[key] = val;
    }
  });
}

async function checkZones() {
  loadEnv();
  const dbModule = await import('../src/lib/db.js');
  const prisma = dbModule.default;

  const turnos = await prisma.turno.findMany({
    orderBy: { fecha: 'asc' }
  });

  turnos.forEach(t => {
    console.log(`Turno ID: ${t.id}`);
    console.log(`  Zonas Raw: ${JSON.stringify(t.zonas)}`);
    try {
      const parsed = JSON.parse(t.zonas);
      console.log(`  Parsed successfully:`, parsed);
    } catch (e) {
      console.error(`  Parsing failed:`, e.message);
    }
  });
}

checkZones().catch(console.error);
