import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage, getWhatsAppStatus } from '@/lib/whatsapp.js';

// Helper to parse templates
function parseTemplate(template, client, turno, address) {
  // Turn date formatting (e.g. 16/06/2026)
  const d = new Date(turno.fecha);
  const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  const timeStr = `${turno.horaInicio} a ${turno.horaFin}`;
  
  let zonesStr = '';
  try {
    const zonesObj = JSON.parse(turno.zonas);
    zonesStr = zonesObj.map(z => z.nombre).join(', ');
  } catch (e) {
    zonesStr = turno.zonas || '';
  }

  const names = client.nombreCompleto.trim().split(/\s+/);
  const nombre = names[0] || '';
  const apellido = names.slice(1).join(' ') || '';

  return template
    .replace(/\[Nombre\]/g, nombre)
    .replace(/\[Apellido\]/g, apellido)
    .replace(/\[FechaTurno\]/g, dateStr)
    .replace(/\[Horario\]/g, timeStr)
    .replace(/\[Zonas\]/g, zonesStr)
    .replace(/\[ValorTotal\]/g, turno.valorTotal.toString())
    .replace(/\[Seña\]/g, turno.valorSeña.toString())
    .replace(/\[Direccion\]/g, address);
}

// GET: Retrieve turnos for a specific week and notification config
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekType = searchParams.get('week') || 'current'; // 'current', 'next' or '2days'

    // Helper to get Argentina (GMT-3) calendar date components
    const getArgentinaDate = () => {
      const now = new Date();
      const argOffset = -3;
      return new Date(now.getTime() + argOffset * 60 * 60 * 1000);
    };

    let startRange, endRange;

    if (weekType === '2days') {
      const argToday = getArgentinaDate();
      const targetDate = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), argToday.getUTCDate()));
      targetDate.setUTCDate(targetDate.getUTCDate() + 2);
      
      startRange = new Date(targetDate);
      startRange.setUTCHours(0, 0, 0, 0);

      endRange = new Date(targetDate);
      endRange.setUTCHours(23, 59, 59, 999);
    } else {
      const argToday = getArgentinaDate();
      
      // Calculate Monday of current week
      const currentDay = argToday.getUTCDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = argToday.getUTCDate() - currentDay + (currentDay === 0 ? -6 : 1);
      
      const startOfWeek = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), diffToMonday));
      startOfWeek.setUTCHours(0, 0, 0, 0);

      if (weekType === 'next') {
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);
      }

      startRange = new Date(startOfWeek);

      endRange = new Date(startOfWeek);
      endRange.setUTCDate(startOfWeek.getUTCDate() + 6); // Up to Sunday
      endRange.setUTCHours(23, 59, 59, 999);
    }

    // Fetch template configs
    const reminderConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_reminder_template' } });
    const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });

    const reminderTemplate = reminderConfig?.value || '';
    const address = addressConfig?.value || '';

    // Fetch turnos in the range
    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: startRange,
          lte: endRange
        },
        estado: {
          in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO'] // Only remind upcoming active ones
        }
      },
      include: {
        cliente: {
          include: {
            notificaciones: {
              orderBy: { fechaEnvio: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: [
        { fecha: 'asc' },
        { horaInicio: 'asc' }
      ]
    });

    // Format list with parsed preview text
    const formattedTurnos = turnos.map(t => {
      const previewText = parseTemplate(reminderTemplate, t.cliente, t, address);
      return {
        id: t.id,
        fecha: t.fecha,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
        valorTotal: t.valorTotal,
        valorSeña: t.valorSeña,
        estado: t.estado,
        zonas: t.zonas,
        cliente: {
          id: t.cliente.id,
          nombreCompleto: t.cliente.nombreCompleto,
          whatsapp: t.cliente.whatsapp,
          email: t.cliente.email,
          lastNotification: t.cliente.notificaciones[0] || null
        },
        previewText
      };
    });

    return NextResponse.json({
      weekStart: startRange.toISOString().split('T')[0],
      weekEnd: endRange.toISOString().split('T')[0],
      turnos: formattedTurnos,
      template: reminderTemplate
    });

  } catch (error) {
    console.error('Error fetching notifications list:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Send reminder(s)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check if WhatsApp is connected first
    const wtspStatus = getWhatsAppStatus();
    if (wtspStatus.status !== 'CONNECTED') {
      return NextResponse.json({ error: 'El servicio de WhatsApp no está conectado. Por favor inícialo desde el panel.' }, { status: 400 });
    }

    const body = await request.json();
    const { turnoIds } = body; // Array of turno IDs to remind

    if (!turnoIds || !Array.isArray(turnoIds) || turnoIds.length === 0) {
      return NextResponse.json({ error: 'Lista de turnos vacía' }, { status: 400 });
    }

    // Fetch configs
    const reminderConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_reminder_template' } });
    const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });
    const reminderTemplate = reminderConfig?.value || '';
    const address = addressConfig?.value || '';

    // Fetch turnos
    const turnos = await prisma.turno.findMany({
      where: { id: { in: turnoIds } },
      include: { cliente: true }
    });

    const results = [];

    for (const t of turnos) {
      const message = parseTemplate(reminderTemplate, t.cliente, t, address);
      try {
        await sendWhatsAppMessage(t.cliente.whatsapp, message);

        // Log to DB
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            canal: 'WHATSAPP',
            mensaje: message,
            estado: 'ENVIADO'
          }
        });

        results.push({ turnoId: t.id, cliente: t.cliente.nombreCompleto, status: 'SUCCESS' });
      } catch (err) {
        console.error(`Failed to send WhatsApp to ${t.cliente.nombreCompleto}:`, err);
        
        // Log failure to DB
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            canal: 'WHATSAPP',
            mensaje: message,
            estado: 'FALLIDO'
          }
        });

        results.push({ turnoId: t.id, cliente: t.cliente.nombreCompleto, status: 'FAILED', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
