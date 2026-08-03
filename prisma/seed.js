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
    { key: "wtsp_reminder_template", value: "NO RESPONDER ESTE MENSAJE\nHola [Nombre], te recuerdo tu turno de depilación láser para el [DiaCompleto] a las [Horario] hs.\n\nRecordá que tenés que VENIR AFEITADO AL RAS.\n\nIMPORTANTE: al ser turnos muy cortos, la tolerancia de demora por llegar tarde es de 5 minutos.\n\nDIRECCIÓN:\n[Direccion]" },
    { key: "wtsp_confirmation_template", value: "¡Hola [Nombre]! Tu reserva para el día [FechaTurno] a las [Horario] para [Zonas] fue aprobada con éxito. Recordá venir afeitado al ras. ¡Te esperamos!" },
    { key: "wtsp_confirmation_manual_template", value: "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] para [Zonas] fue agendado con éxito. Recordá venir afeitado al ras. ¡Te esperamos!" },
    { key: "wtsp_noshow_template", value: "¡Hola [Nombre]! Lamentamos que no hayas asistido a tu turno del día [FechaTurno] a las [Horario]. Según nuestras políticas, la seña de [Seña] no es reembolsable para cubrir los costos del horario reservado. Si querés agendar un nuevo turno, podés hacerlo desde nuestra web." },
    { key: "wtsp_cancellation_template", value: "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] fue cancelado. Si querés agendar un nuevo turno, podés hacerlo desde nuestra web. ¡Saludos!" },
    { key: "wtsp_reschedule_template", value: "¡Hola [Nombre]! Tu turno fue reprogramado con éxito para el día [FechaTurno] a las [Horario] para [Zonas]. Recordá venir afeitado al ras. ¡Te esperamos!" },
    { key: "address", value: "Paraná 597, piso 8, depto 48" },
    { key: "email_confirmation_subject", value: "Confirmación de turno - Gonzalo Depilación" },
    { key: "email_confirmation_body", value: "¡Tu reserva ha sido confirmada con éxito!\n\nA continuación te detallamos los datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras de la noche anterior. En caso de no poder asistir, te pedimos que avises con un mínimo de 72 hs de anticipación para reprogramar tu seña.\n\n¡Te esperamos!" },
    { key: "email_cancellation_subject", value: "Cancelación de turno - Gonzalo Depilación" },
    { key: "email_cancellation_body", value: "Te informamos que tu turno para depilación láser ha sido cancelado:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n\nLamentamos que no puedas asistir. Si deseas agendar una nueva cita, podés hacerlo ingresando a nuestro sitio web." },
    { key: "email_noshow_subject", value: "Aviso de turno no asistido - Gonzalo Depilación" },
    { key: "email_noshow_body", value: "Lamentamos informarte que, según nuestras políticas de cancelación y de reserva vigentes, la seña abonada se retiene para cubrir los costos logísticos y operativos de la sesión reservada que no pudimos utilizar.\n\nSi deseas programar una nueva sesión de depilación láser, puedes hacerlo en cualquier momento a través de nuestro portal web ingresando con tu usuario habitual o reservando un nuevo turno." },
    { key: "email_reprogram_subject", value: "Reprogramación de turno - Gonzalo Depilación" },
    { key: "email_reprogram_body", value: "Te informamos que tu turno para depilación láser ha sido reprogramado con éxito.\n\nA continuación te detallamos los nuevos datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si tenés alguna duda, comunicate con nosotros.\n\n¡Te esperamos!" }
  ];

  for (const config of defaultConfigs) {
    await prisma.configuracion.upsert({
      where: { key: config.key },
      update: {
        value: config.value
      },
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
