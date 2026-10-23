import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { sendWhatsAppMessage, getWhatsAppStatus, parseTemplate, checkRelayStatus } from '@/lib/whatsapp.js';
import { canSendNotification } from '@/lib/notifications.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Retrieve notifications list (Turnos semanales, 48hs, Va a avisar, Mantenimiento)
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || searchParams.get('week') || 'current';
    const startDateParam = searchParams.get('start') || searchParams.get('startDate');
    const endDateParam = searchParams.get('end') || searchParams.get('endDate');
    const filterBy = searchParams.get('filterBy') || 'aviso'; // 'aviso' o 'sesion'
    const showAll = searchParams.get('showAll') === 'true';

    // Helper to get Argentina (GMT-3) calendar date components
    const getArgentinaDate = () => {
      const now = new Date();
      const argOffset = -3;
      return new Date(now.getTime() + argOffset * 60 * 60 * 1000);
    };

    // ==========================================
    // 1. VENTANA: "VA A AVISAR"
    // ==========================================
    if (category === 'va_a_avisar') {
      const vaAAvisarConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_va_a_avisar_template' } });
      const rawTpl = vaAAvisarConfig?.value?.trim();
      const vaAAvisarTemplate = (rawTpl && rawTpl !== '.')
        ? rawTpl
        : "¡Hola [Nombre]! Te escribimos de Gonzalo Depilación Masculina ✨ Nos quedó pendiente coordinar tu próxima sesión tras tu última visita. ¿Cómo venís de tiempos esta semana o la próxima para coordinar un turno? ¡Avisanos cuando puedas!";

      const clients = await prisma.cliente.findMany({
        where: {
          bloqueado: false,
          enviarNotificaciones: true,
          estado: 'ACTIVO'
        },
        include: {
          turnos: {
            orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }]
          },
          notificaciones: {
            where: {
              canal: 'WHATSAPP',
              mensaje: { contains: '[VA_A_AVISAR]' }
            },
            orderBy: { fechaEnvio: 'desc' }
          }
        }
      });

      const items = [];

      for (const cl of clients) {
        if (!cl.whatsapp || !canSendNotification(cl, 'WHATSAPP', 'RECORDATORIO')) continue;

        const completedTurnos = cl.turnos.filter(t => t.estado === 'REALIZADO');
        if (completedTurnos.length === 0) continue;
        const lastTurno = completedTurnos[0];

        // Verificar si la última sesión realizada tiene subEstado VA_A_AVISAR
        if (lastTurno.subEstado !== 'VA_A_AVISAR') continue;

        // Verificar si el cliente ya agendó un turno activo posterior
        const lastTurnoTime = new Date(lastTurno.fecha).getTime();
        const hasFutureActive = cl.turnos.some(t => {
          if (['CANCELADO', 'NO_ASISTIO', 'BLOQUEADO'].includes(t.estado)) return false;
          return new Date(t.fecha).getTime() > lastTurnoTime;
        });
        if (hasFutureActive) continue;

        // Frecuencia en semanas y fechas calculadas
        const freqWeeks = Number(cl.frecuencia || 4);
        const fechaSiguienteTurno = new Date(lastTurnoTime + (freqWeeks * 7 * 24 * 60 * 60 * 1000));
        // Mensaje automático se manda 1 semana antes de su siguiente turno teórico
        const advanceWeeks = Math.max(0, freqWeeks - 1);
        const fechaSugeridaAviso = new Date(lastTurnoTime + (advanceWeeks * 7 * 24 * 60 * 60 * 1000));

        // Verificar si ya se le envió notificación [VA_A_AVISAR] desde su última sesión
        const existingNotif = cl.notificaciones.find(n => n.estado === 'ENVIADO' && new Date(n.fechaEnvio) >= new Date(lastTurno.fecha));
        const alreadyNotified = !!existingNotif;

        // Si no se solicitó ver todos, filtrar los que ya recibieron el mensaje
        if (!showAll && alreadyNotified) continue;

        // Filtro de rango de fechas
        if (startDateParam && endDateParam) {
          const compareDate = filterBy === 'sesion' ? new Date(lastTurno.fecha) : fechaSugeridaAviso;
          const compStr = compareDate.toISOString().split('T')[0];
          if (compStr < startDateParam || compStr > endDateParam) continue;
        }

        // Formateo de zonas
        let zonesText = '';
        try {
          const parsed = JSON.parse(lastTurno.zonas || '[]');
          zonesText = Array.isArray(parsed) && parsed.length > 0
            ? parsed.map(z => z.nombre || z.name || '').filter(Boolean).join(', ')
            : (lastTurno.zonas || 'Sin zonas');
        } catch {
          zonesText = lastTurno.zonas || 'Sin zonas';
        }

        // Texto de vista previa interpolado
        const firstName = cl.nombreCompleto?.split(' ')[0] || cl.nombreCompleto || 'estimado';
        const previewText = vaAAvisarTemplate
          .replaceAll('[Nombre]', firstName)
          .replaceAll('{cliente}', cl.nombreCompleto || '')
          .replaceAll('[FechaTurno]', new Date(lastTurno.fecha).toLocaleDateString('es-AR'))
          .replaceAll('[Fecha]', new Date(lastTurno.fecha).toLocaleDateString('es-AR'))
          .replaceAll('[Zonas]', zonesText)
          .replaceAll('{zonas}', zonesText)
          .replaceAll('[ValorTotal]', (lastTurno.valorTotal || 0).toLocaleString('es-AR'))
          .replaceAll('{valor}', (lastTurno.valorTotal || 0).toLocaleString('es-AR'));

        items.push({
          id: lastTurno.id,
          turnoId: lastTurno.id,
          clienteId: cl.id,
          category: 'va_a_avisar',
          fechaUltimaSesion: lastTurno.fecha,
          zonas: zonesText,
          valorTotal: lastTurno.valorTotal,
          frecuenciaSemanas: freqWeeks,
          fechaSiguienteTurno: fechaSiguienteTurno.toISOString(),
          fechaSugeridaAviso: fechaSugeridaAviso.toISOString(),
          alreadyNotified,
          lastNotification: existingNotif || null,
          cliente: {
            id: cl.id,
            nombreCompleto: cl.nombreCompleto,
            whatsapp: cl.whatsapp,
            email: cl.email,
            frecuencia: cl.frecuencia,
            enviarNotificaciones: cl.enviarNotificaciones
          },
          previewText
        });
      }

      // Ordenar por fecha sugerida de aviso (más próximos a contactar primero)
      items.sort((a, b) => new Date(a.fechaSugeridaAviso) - new Date(b.fechaSugeridaAviso));

      return NextResponse.json({
        category: 'va_a_avisar',
        items,
        template: vaAAvisarTemplate
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
      });
    }

    // ==========================================
    // 2. VENTANA: "MANTENIMIENTO"
    // ==========================================
    if (category === 'mantenimiento') {
      const maintConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_mantenimiento_template' } });
      const rawTpl = maintConfig?.value?.trim();
      const wtspMaintTemplate = (rawTpl && rawTpl !== '.')
        ? rawTpl
        : "¡Hola [Nombre]! Te escribimos de Gonzalo Depilación ✨ Ya pasaron dos meses y medio desde tu última sesión de tratamiento. Te recomendamos realizar tu sesión de mantenimiento para conservar los mejores resultados a largo plazo. ¿Te gustaría que coordinemos un turno para estos días?";

      const clients = await prisma.cliente.findMany({
        where: {
          bloqueado: false,
          enviarNotificaciones: true,
          notifMantenimiento: true
        },
        include: {
          turnos: {
            orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }]
          },
          notificaciones: {
            where: {
              canal: 'WHATSAPP',
              mensaje: { contains: '[MANTENIMIENTO]' }
            },
            orderBy: { fechaEnvio: 'desc' }
          }
        }
      });

      const items = [];

      for (const cl of clients) {
        if (!cl.whatsapp || !canSendNotification(cl, 'WHATSAPP', 'MANTENIMIENTO')) continue;

        const completedTurnos = cl.turnos.filter(t => t.estado === 'REALIZADO');
        if (completedTurnos.length === 0) continue;
        const lastTurno = completedTurnos[0];

        // Elegible si el cliente está marcado en FINALIZADO o MANTENIMIENTO, o su último turno tiene subEstado FINALIZADO o MANTENIMIENTO
        const isEligible = cl.estado === 'FINALIZADO' || cl.estado === 'MANTENIMIENTO' || lastTurno.subEstado === 'FINALIZADO' || lastTurno.subEstado === 'MANTENIMIENTO';
        if (!isEligible) continue;

        // Verificar si el cliente ya agendó un turno activo posterior
        const lastTurnoTime = new Date(lastTurno.fecha).getTime();
        const hasFutureActive = cl.turnos.some(t => {
          if (['CANCELADO', 'NO_ASISTIO', 'BLOQUEADO'].includes(t.estado)) return false;
          return new Date(t.fecha).getTime() > lastTurnoTime;
        });
        if (hasFutureActive) continue;

        // Fecha sugerida de aviso: 75 días (2 meses y medio) después de su última sesión
        const fechaSugeridaAviso = new Date(lastTurnoTime + (75 * 24 * 60 * 60 * 1000));

        // Verificar si ya se le envió notificación [MANTENIMIENTO] desde su última sesión
        const existingNotif = cl.notificaciones.find(n => n.estado === 'ENVIADO' && new Date(n.fechaEnvio) >= new Date(lastTurno.fecha));
        const alreadyNotified = !!existingNotif;

        // Si no se solicitó ver todos, filtrar los que ya recibieron el mensaje
        if (!showAll && alreadyNotified) continue;

        // Filtro de rango de fechas
        if (startDateParam && endDateParam) {
          const compareDate = filterBy === 'sesion' ? new Date(lastTurno.fecha) : fechaSugeridaAviso;
          const compStr = compareDate.toISOString().split('T')[0];
          if (compStr < startDateParam || compStr > endDateParam) continue;
        }

        // Formateo de zonas
        let zonesText = '';
        try {
          const parsed = JSON.parse(lastTurno.zonas || '[]');
          zonesText = Array.isArray(parsed) && parsed.length > 0
            ? parsed.map(z => z.nombre || z.name || '').filter(Boolean).join(', ')
            : (lastTurno.zonas || 'Sin zonas');
        } catch {
          zonesText = lastTurno.zonas || 'Sin zonas';
        }

        // Texto de vista previa interpolado
        const firstName = cl.nombreCompleto?.split(' ')[0] || cl.nombreCompleto || 'estimado';
        const previewText = wtspMaintTemplate
          .replaceAll('[Nombre]', firstName)
          .replaceAll('{cliente}', cl.nombreCompleto || '')
          .replaceAll('[FechaTurno]', new Date(lastTurno.fecha).toLocaleDateString('es-AR'))
          .replaceAll('[Fecha]', new Date(lastTurno.fecha).toLocaleDateString('es-AR'))
          .replaceAll('[Zonas]', zonesText)
          .replaceAll('{zonas}', zonesText)
          .replaceAll('[ValorTotal]', (lastTurno.valorTotal || 0).toLocaleString('es-AR'))
          .replaceAll('{valor}', (lastTurno.valorTotal || 0).toLocaleString('es-AR'));

        items.push({
          id: lastTurno.id,
          turnoId: lastTurno.id,
          clienteId: cl.id,
          category: 'mantenimiento',
          fechaUltimaSesion: lastTurno.fecha,
          zonas: zonesText,
          valorTotal: lastTurno.valorTotal,
          frecuenciaSemanas: 10, // ~10 semanas / 2,5 meses
          fechaSiguienteTurno: fechaSugeridaAviso.toISOString(),
          fechaSugeridaAviso: fechaSugeridaAviso.toISOString(),
          alreadyNotified,
          lastNotification: existingNotif || null,
          cliente: {
            id: cl.id,
            nombreCompleto: cl.nombreCompleto,
            whatsapp: cl.whatsapp,
            email: cl.email,
            frecuencia: cl.frecuencia,
            enviarNotificaciones: cl.enviarNotificaciones
          },
          previewText
        });
      }

      // Ordenar por fecha sugerida de aviso (más antiguos o próximos a contactar primero)
      items.sort((a, b) => new Date(a.fechaSugeridaAviso) - new Date(b.fechaSugeridaAviso));

      return NextResponse.json({
        category: 'mantenimiento',
        items,
        template: wtspMaintTemplate
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
      });
    }

    // ==========================================
    // 3. VENTANAS CLÁSICAS DE TURNOS: CURRENT, NEXT, 2DAYS
    // ==========================================
    let startRange, endRange;

    if (category === '2days') {
      const argToday = getArgentinaDate();
      const targetDate = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), argToday.getUTCDate()));
      targetDate.setUTCDate(targetDate.getUTCDate() + 2);
      
      startRange = new Date(targetDate);
      startRange.setUTCHours(0, 0, 0, 0);

      endRange = new Date(targetDate);
      endRange.setUTCHours(23, 59, 59, 999);
    } else {
      const argToday = getArgentinaDate();
      
      // Calcular lunes de la semana actual
      const currentDay = argToday.getUTCDay();
      const diffToMonday = argToday.getUTCDate() - currentDay + (currentDay === 0 ? -6 : 1);
      
      const startOfWeek = new Date(Date.UTC(argToday.getUTCFullYear(), argToday.getUTCMonth(), diffToMonday));
      startOfWeek.setUTCHours(0, 0, 0, 0);

      if (category === 'next') {
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);
      }

      startRange = new Date(startOfWeek);

      endRange = new Date(startOfWeek);
      endRange.setUTCDate(startOfWeek.getUTCDate() + 6);
      endRange.setUTCHours(23, 59, 59, 999);
    }

    // Cargar plantilla de recordatorio y dirección
    const reminderConfig = await prisma.configuracion.findUnique({ where: { key: 'wtsp_reminder_template' } });
    const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });

    const reminderTemplate = reminderConfig?.value || '';
    const address = addressConfig?.value || '';

    // Consultar turnos futuros
    const argNow = getArgentinaDate();
    const todayStart = new Date(Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate()));
    todayStart.setUTCHours(0, 0, 0, 0);

    const effectiveStart = startRange < todayStart ? todayStart : startRange;

    const turnos = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: effectiveStart,
          lte: endRange
        },
        estado: {
          in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO']
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
          enviarNotificaciones: t.cliente.enviarNotificaciones,
          canReceiveWppReminder: canSendNotification(t.cliente, 'WHATSAPP', 'RECORDATORIO'),
          lastNotification: t.cliente.notificaciones[0] || null
        },
        previewText
      };
    });

    return NextResponse.json({
      category,
      weekStart: startRange.toISOString().split('T')[0],
      weekEnd: endRange.toISOString().split('T')[0],
      turnos: formattedTurnos,
      template: reminderTemplate
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });

  } catch (error) {
    console.error('Error fetching notifications list:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Send reminder(s) - Soporta turnos regulares, Va a avisar y Mantenimiento
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si WhatsApp está conectado
    await checkRelayStatus();
    const wtspStatus = getWhatsAppStatus();
    if (wtspStatus.status !== 'CONNECTED') {
      return NextResponse.json({ error: 'El servicio de WhatsApp no está conectado. Por favor inícialo desde el panel.' }, { status: 400 });
    }

    const body = await request.json();
    const { turnoIds, category = 'turnos' } = body;

    if (!turnoIds || !Array.isArray(turnoIds) || turnoIds.length === 0) {
      return NextResponse.json({ error: 'Lista de turnos vacía' }, { status: 400 });
    }

    // Cargar configuraciones según categoría
    const addressConfig = await prisma.configuracion.findUnique({ where: { key: 'address' } });
    const address = addressConfig?.value || '';

    let templateKey = 'wtsp_reminder_template';
    let defaultTemplate = '';
    let logTag = '[RECORDATORIO_48H]';
    let notifType = 'RECORDATORIO';

    if (category === 'va_a_avisar') {
      templateKey = 'wtsp_va_a_avisar_template';
      defaultTemplate = "¡Hola [Nombre]! Te escribimos de Gonzalo Depilación Masculina ✨ Nos quedó pendiente coordinar tu próxima sesión tras tu última visita. ¿Cómo venís de tiempos esta semana o la próxima para coordinar un turno? ¡Avisanos cuando puedas!";
      logTag = '[VA_A_AVISAR]';
      notifType = 'RECORDATORIO';
    } else if (category === 'mantenimiento') {
      templateKey = 'wtsp_mantenimiento_template';
      defaultTemplate = "¡Hola [Nombre]! Te escribimos de Gonzalo Depilación ✨ Ya pasaron dos meses y medio desde tu última sesión de tratamiento. Te recomendamos realizar tu sesión de mantenimiento para conservar los mejores resultados a largo plazo. ¿Te gustaría que coordinemos un turno para estos días?";
      logTag = '[MANTENIMIENTO]';
      notifType = 'MANTENIMIENTO';
    } else {
      defaultTemplate = '';
    }

    const tplConfig = await prisma.configuracion.findUnique({ where: { key: templateKey } });
    const rawTpl = tplConfig?.value?.trim();
    const template = (rawTpl && rawTpl !== '.') ? rawTpl : defaultTemplate;

    // Obtener turnos con clientes asociados
    const turnos = await prisma.turno.findMany({
      where: { id: { in: turnoIds } },
      include: { cliente: true }
    });

    const results = [];

    for (const t of turnos) {
      if (!t.cliente) {
        results.push({ turnoId: t.id, cliente: 'Desconocido', status: 'SKIPPED', error: 'Sin cliente asignado' });
        continue;
      }

      if (!canSendNotification(t.cliente, 'WHATSAPP', notifType)) {
        results.push({ turnoId: t.id, cliente: t.cliente?.nombreCompleto || 'Cliente', status: 'SKIPPED', error: 'Notificaciones desactivadas para este cliente' });
        continue;
      }

      // Parsear mensaje
      let message = '';
      if (category === 'va_a_avisar' || category === 'mantenimiento') {
        const firstName = t.cliente.nombreCompleto?.split(' ')[0] || t.cliente.nombreCompleto || 'estimado';
        let zonesText = '';
        try {
          const parsed = JSON.parse(t.zonas || '[]');
          zonesText = Array.isArray(parsed) && parsed.length > 0
            ? parsed.map(z => z.nombre || z.name || '').filter(Boolean).join(', ')
            : (t.zonas || 'Sin zonas');
        } catch {
          zonesText = t.zonas || 'Sin zonas';
        }

        message = template
          .replaceAll('[Nombre]', firstName)
          .replaceAll('{cliente}', t.cliente.nombreCompleto || '')
          .replaceAll('[FechaTurno]', new Date(t.fecha).toLocaleDateString('es-AR'))
          .replaceAll('[Fecha]', new Date(t.fecha).toLocaleDateString('es-AR'))
          .replaceAll('[Zonas]', zonesText)
          .replaceAll('{zonas}', zonesText)
          .replaceAll('[ValorTotal]', (t.valorTotal || 0).toLocaleString('es-AR'))
          .replaceAll('{valor}', (t.valorTotal || 0).toLocaleString('es-AR'))
          .replaceAll('[Direccion]', address)
          .replaceAll('{direccion}', address);
      } else {
        message = parseTemplate(template, t.cliente, t, address);
      }

      try {
        await sendWhatsAppMessage(t.cliente.whatsapp, message);

        // Registrar en base de datos
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'WHATSAPP',
            mensaje: `${logTag} ${message}`,
            estado: 'ENVIADO'
          }
        });

        results.push({ turnoId: t.id, cliente: t.cliente.nombreCompleto, status: 'SUCCESS' });
        
        // Pausa de cortesía entre envíos masivos
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`Failed to send WhatsApp to ${t.cliente.nombreCompleto}:`, err);
        
        await prisma.notificacion.create({
          data: {
            clienteId: t.cliente.id,
            turnoId: t.id,
            canal: 'WHATSAPP',
            mensaje: `${logTag}_FALLIDO ${message} (Error: ${err.message})`,
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
