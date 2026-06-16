import prisma from '../src/lib/db.js';
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const zonasDefault = [
  { nombre: "Espalda", precioBase: 28000, duracionMinutos: 30, señaBase: 7000 },
  { nombre: "Hombros", precioBase: 15000, duracionMinutos: 10, señaBase: 3500 },
  { nombre: "Pecho + Abdomen", precioBase: 28000, duracionMinutos: 30, señaBase: 7000 },
  { nombre: "Axilas", precioBase: 15000, duracionMinutos: 10, señaBase: 3500 },
  { nombre: "Brazos", precioBase: 28000, duracionMinutos: 30, señaBase: 7000 },
  { nombre: "Piernas", precioBase: 35000, duracionMinutos: 40, señaBase: 8500 },
  { nombre: "Glúteos", precioBase: 22000, duracionMinutos: 20, señaBase: 5000 },
  { nombre: "Genitales", precioBase: 22000, duracionMinutos: 20, señaBase: 5000 },
  { nombre: "Rostro", precioBase: 30000, duracionMinutos: 30, señaBase: 7500 },
  { nombre: "Cuerpo Completo", precioBase: 140000, duracionMinutos: 90, señaBase: 35000 }
];

async function main() {
  console.log("Seeding database...");

  // 1. Create Default Admin User
  const adminPassword = hashPassword("admin123");
  const admin = await prisma.usuario.upsert({
    where: { usuario: "admin" },
    update: {},
    create: {
      usuario: "admin",
      password: adminPassword,
      nombre: "Administrador",
      rol: "ADMIN"
    }
  });
  console.log(`Admin user upserted: ${admin.usuario}`);

  // 2. Create Default Zones
  for (const z of zonasDefault) {
    const zona = await prisma.zona.upsert({
      where: { nombre: z.nombre },
      update: {
        precioBase: z.precioBase,
        duracionMinutos: z.duracionMinutos,
        señaBase: z.señaBase
      },
      create: {
        nombre: z.nombre,
        precioBase: z.precioBase,
        duracionMinutos: z.duracionMinutos,
        señaBase: z.señaBase
      }
    });
    console.log(`Zona upserted: ${zona.nombre} ($${zona.precioBase} - ${zona.duracionMinutos} min)`);
  }

  // 3. Create Default configuration variables
  const defaultConfigs = [
    { key: "wtsp_reminder_template", value: "NO RESPONDER ESTE MENSAJE\nTe recuerdo el turno de ESTA SEMANA para depilación láser, en el horario acordado.\n\nRecordá que tenés que VENIR AFEITADO AL RAS.\n\nIMPORTANTE: al ser turnos muy cortos, la tolerancia de demora por llegar tarde es de 5 minutos.\n\nDIRECCIÓN:\nParaná 597, piso 8, depto 48." },
    { key: "wtsp_confirmation_template", value: "¡Hola [Nombre]! Tu reserva para el día [FechaTurno] a las [Horario] para [Zonas] fue aprobada con éxito. Recordá venir afeitado al ras. ¡Te esperamos!" },
    { key: "address", value: "Paraná 597, piso 8, depto 48" }
  ];

  for (const config of defaultConfigs) {
    await prisma.configuracion.upsert({
      where: { key: config.key },
      update: {},
      create: {
        key: config.key,
        value: config.value
      }
    });
    console.log(`Config upserted: ${config.key}`);
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
