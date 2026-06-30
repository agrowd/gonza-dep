import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

// GET: Fetch all configs
export async function GET() {
  try {
    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbConfigs = await prisma.configuracion.findMany();
    
    // Map array to key-value object
    const configs = {};
    dbConfigs.forEach(item => {
      configs[item.key] = item.value;
    });

    // Provide default fallbacks for uninitialized configurations
    const fullConfigs = {
      wtsp_reminder_template: configs.wtsp_reminder_template || "NO RESPONDER ESTE MENSAJE\nTe recuerdo el turno de ESTA SEMANA para depilación láser, en el horario acordado.\n\nRecordá que tenés que VENIR AFEITADO AL RAS.\n\nIMPORTANTE: al ser turnos muy cortos, la tolerancia de demora por llegar tarde es de 5 minutos.\n\nDIRECCIÓN:\nParaná 597, piso 8, depto 48.",
      wtsp_confirmation_template: configs.wtsp_confirmation_template || "¡Hola [Nombre]! Tu reserva para el día [FechaTurno] a las [Horario] para [Zonas] fue aprobada con éxito. Recordá venir afeitado al ras. ¡Te esperamos!",
      address: configs.address || "Paraná 597, piso 8, depto 48",
      work_start: configs.work_start || "10:00",
      work_end: configs.work_end || "20:00",
      email_confirmation_subject: configs.email_confirmation_subject || "Confirmación de turno - Gonzalo Depilación",
      email_confirmation_body: configs.email_confirmation_body || "¡Tu reserva ha sido confirmada con éxito!\n\nA continuación te detallamos los datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n- Saldo pendiente de cobro: {saldo}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras de la noche anterior. En caso de no poder asistir, te pedimos que avises con un mínimo de 24 hs de anticipación para reprogramar tu seña.\n\n¡Te esperamos!",
      email_cancellation_subject: configs.email_cancellation_subject || "Cancelación de turno - Gonzalo Depilación",
      email_cancellation_body: configs.email_cancellation_body || "Te informamos que tu turno para depilación láser ha sido cancelado:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n\nLamentamos que no puedas asistir. Si deseas agendar una nueva cita, podés hacerlo ingresando a nuestro sitio web.",
      email_noshow_subject: configs.email_noshow_subject || "Aviso de turno no asistido - Gonzalo Depilación",
      email_noshow_body: configs.email_noshow_body || "Te escribimos para informarte que hemos registrado tu inasistencia al turno programado:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n\nLamentamos informarte que, según nuestras políticas de cancelación y de reserva vigentes, la seña abonada ({seña}) se retiene para cubrir los costos logísticos y operativos de la sesión reservada que no pudimos utilizar.\n\nSi deseas volver a reservar, deberás realizar un nuevo turno con su respectiva seña.",
      email_maintenance_subject: configs.email_maintenance_subject || "¡Es hora de tu mantenimiento! - Gonzalo Depilación",
      email_maintenance_body: configs.email_maintenance_body || "¡Hola {cliente}!\n\nHace dos meses y medio finalizaste tu tratamiento de depilación láser.\n\nTe escribimos para invitarte a realizar una sesión de mantenimiento. Mantener los resultados te ayudará a lucir siempre impecable y conservar el efecto del tratamiento a largo plazo.\n\nPodés reservar tu turno ingresando directamente a nuestro sitio web.\n\n¡Te esperamos!"
    };

    return NextResponse.json(fullConfigs);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Save configs in bulk
export async function POST(request) {
  try {
    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json(); // expected e.g. { address: '...', work_start: '...' }

    const operations = Object.entries(body).map(([key, value]) => {
      return prisma.configuracion.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    });

    await Promise.all(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving configurations:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
