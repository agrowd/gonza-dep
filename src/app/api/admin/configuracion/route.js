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
      wtsp_reminder_template: configs.wtsp_reminder_template || "NO RESPONDER ESTE MENSAJE\nHola [Nombre], te recuerdo tu turno de depilación láser para el [DiaCompleto] a las [Horario] hs.\n\nRecordá que tenés que VENIR AFEITADO AL RAS.\n\nIMPORTANTE: al ser turnos muy cortos, la tolerancia de demora por llegar tarde es de 5 minutos.\n\nDIRECCIÓN:\n[Direccion]",
      wtsp_confirmation_template: configs.wtsp_confirmation_template || "¡Hola [Nombre]! Tu reserva para el día [FechaTurno] a las [Horario] para [Zonas] fue aprobada con éxito. Recordá venir afeitado al ras. ¡Te esperamos!",
      address: configs.address || "Paraná 597, piso 8, depto 48",
      work_start: configs.work_start || "12:30",
      work_end: configs.work_end || "22:00",
      booking_work_start: configs.booking_work_start || "14:00",
      booking_work_end: configs.booking_work_end || "22:00",
      email_confirmation_subject: configs.email_confirmation_subject || "Confirmación de turno - Gonzalo Depilación",
      email_confirmation_body: configs.email_confirmation_body || "¡Tu reserva ha sido confirmada con éxito!\n\nA continuación te detallamos los datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras de la noche anterior. En caso de no poder asistir, te pedimos que avises con un mínimo de 72 hs de anticipación para reprogramar tu seña.\n\n¡Te esperamos!",
      email_cancellation_subject: configs.email_cancellation_subject || "Cancelación de turno - Gonzalo Depilación",
      email_cancellation_body: configs.email_cancellation_body || "Te informamos que tu turno para depilación láser ha sido cancelado:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n\nLamentamos que no puedas asistir. Si deseas agendar una nueva cita, podés hacerlo ingresando a nuestro sitio web.",
      email_noshow_subject: configs.email_noshow_subject || "Aviso de turno no asistido - Gonzalo Depilación",
      email_noshow_body: configs.email_noshow_body || "Lamentamos informarte que, según nuestras políticas de cancelación y de reserva vigentes, la seña abonada se retiene para cubrir los costos logísticos y operativos de la sesión reservada que no pudimos utilizar.\n\nSi deseas programar una nueva sesión de depilación láser, puedes hacerlo en cualquier momento a través de nuestro portal web ingresando con tu usuario habitual o reservando un nuevo turno.",
      email_maintenance_subject: configs.email_maintenance_subject || "¡Es hora de tu mantenimiento! - Gonzalo Depilación",
      email_maintenance_body: configs.email_maintenance_body || "¡Hola {cliente}!\n\nHace dos meses y medio finalizaste tu tratamiento de depilación láser.\n\nTe escribimos para invitarte a realizar una sesión de mantenimiento. Mantener los resultados te ayudará a lucir siempre impecable y conservar el efecto del tratamiento a largo plazo.\n\nPodés reservar tu turno ingresando directamente a nuestro sitio web.\n\n¡Te esperamos!",
      wtsp_confirmation_manual_template: configs.wtsp_confirmation_manual_template || "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] para [Zonas] fue agendado con éxito. Recordá venir afeitado al ras. ¡Te esperamos!",
      wtsp_noshow_template: configs.wtsp_noshow_template || "¡Hola [Nombre]! Lamentamos que no hayas asistido a tu turno del día [FechaTurno] a las [Horario]. Según nuestras políticas, la seña de [Seña] no es reembolsable para cubrir los costos del horario reservado. Si querés agendar un nuevo turno, podés hacerlo desde nuestra web.",
      wtsp_cancellation_template: configs.wtsp_cancellation_template || "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] fue cancelado. Si querés agendar un nuevo turno, podés hacerlo desde nuestra web. ¡Saludos!",
      wtsp_reschedule_template: configs.wtsp_reschedule_template || "¡Hola [Nombre]! Tu turno fue reprogramado con éxito para el día [FechaTurno] a las [Horario] para [Zonas]. Recordá venir afeitado al ras. ¡Te esperamos!",
      email_reprogram_subject: configs.email_reprogram_subject || "Reprogramación de turno - Gonzalo Depilación",
      email_reprogram_body: configs.email_reprogram_body || "Te informamos que tu turno para depilación láser ha sido reprogramado con éxito.\n\nA continuación te detallamos los nuevos datos de tu turno:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si tenés alguna duda, comunicate con nosotros.\n\n¡Te esperamos!",
      email_reminder_7days_subject: configs.email_reminder_7days_subject || "Recordatorio de tu turno en 7 días - Gonzalo Depilación",
      email_reminder_7days_body: configs.email_reminder_7days_body || "¡Hola {cliente}!\n\nTe recordamos que tenés un turno programado para dentro de 7 días:\n\n- Fecha: {fecha}\n- Horario: {horario} hs\n- Zonas: {zonas}\n- Seña abonada: {seña}\n\nDirección: {direccion}\n\nRecordá que tenés que venir afeitado al ras. Si necesitás reprogramar o cancelar, recordá hacerlo con un mínimo de 72 hs de anticipación para conservar tu seña.\n\n¡Te esperamos!",
      global_notifications_enabled: configs.global_notifications_enabled || "true"
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

    if (body.global_notifications_enabled !== undefined) {
      const enabled = body.global_notifications_enabled === 'true';
      await prisma.cliente.updateMany({
        data: { enviarNotificaciones: enabled }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving configurations:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
