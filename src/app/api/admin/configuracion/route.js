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
      work_end: configs.work_end || "20:00"
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
