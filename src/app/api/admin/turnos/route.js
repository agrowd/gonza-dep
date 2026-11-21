import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';
import { sendConfirmationEmail } from '@/lib/email.js';
import { normalizeWhatsApp, sendWhatsAppMessage, sendNewClientWelcomeImages, parseTemplate } from '@/lib/whatsapp.js';
import { syncActiveFutureTurnosPrices } from '@/lib/turnoPriceSync.js';

let lastTurnosSyncTimestamp = 0;

// Convert HH:MM to minutes from midnight
import { ensureDefaultBox } from '../boxes/route';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long' });
}

function isPastDateTime(fechaStr, horaInicio) {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
  
  if (fechaStr < todayStr) return true;
  if (fechaStr === todayStr) {
    const [hours, minutes] = horaInicio.split(':').map(Number);
    const [nowHours, nowMinutes] = timeStr.split(':').map(Number);
    if (hours < nowHours || (hours === nowHours && minutes < nowMinutes)) {
      return true;
    }
  }
  return false;
}

async function hasOverlappingTurno(fechaStr, horaInicio, horaFin, excludeTurnoId = null, boxId = null, operadorId = null) {
  const targetDate = new Date(fechaStr + 'T00:00:00');
  const dayTurnos = await prisma.turno.findMany({
    where: {
      fecha: targetDate,
      estado: { not: 'CANCELADO' },
      id: excludeTurnoId ? { not: excludeTurnoId } : undefined
    },
    include: {
      cliente: true,
      box: true,
      operador: true
    }
  });

  const newStartMin = timeToMinutes(horaInicio);
  const newEndMin = timeToMinutes(horaFin);

  // Resolver Box y Operador por defecto canónicos para comparaciones robustas (D-170)
  let defaultBoxId = null;
  let defaultOpId = null;
  try {
    const defaultBox = await ensureDefaultBox();
    if (defaultBox) defaultBoxId = String(defaultBox.id);
  } catch (e) {}

  try {
    const allUsers = await prisma.usuario.findMany();
    const defaultOp = allUsers.find(u => u.nombre?.toLowerCase().includes('gonzalo') || u.usuario?.toLowerCase() === 'gonzalo')
      || allUsers.find(u => u.rol === 'ADMIN')
      || allUsers[0];
    if (defaultOp) defaultOpId = String(defaultOp.id);
  } catch (e) {}

  const effectiveCurBoxId = boxId ? String(boxId) : defaultBoxId;
  const effectiveCurOpId = operadorId ? String(operadorId) : defaultOpId;

  for (const t of dayTurnos) {
    const startMin = timeToMinutes(t.horaInicio);
    const endMin = timeToMinutes(t.horaFin);
    if (startMin < newEndMin && endMin > newStartMin) {
      if (t.estado === 'BLOQUEADO') {
        const tBox = t.boxId ? String(t.boxId) : defaultBoxId;
        if (!t.boxId || !effectiveCurBoxId || tBox === effectiveCurBoxId) {
          return t;
        }
        continue;
      }

      // Regla Multi-agenda: Se permite superposición horaria SI Y SOLO SI
      // se realizan en Boxes distintos Y con Operadores distintos.
      const tEffectiveBoxId = t.boxId ? String(t.boxId) : defaultBoxId;
      const tEffectiveOpId = t.operadorId ? String(t.operadorId) : defaultOpId;

      const sameBox = (tEffectiveBoxId && effectiveCurBoxId && tEffectiveBoxId === effectiveCurBoxId) || (!tEffectiveBoxId && !effectiveCurBoxId);
      const sameOp = (tEffectiveOpId && effectiveCurOpId && tEffectiveOpId === effectiveCurOpId) || (!tEffectiveOpId && !effectiveCurOpId);

      if (sameBox || sameOp) {
        return t;
      }
    }
  }
  return null;
}

// GET: List turnos in range
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('start'); // e.g. "2026-06-15"
    const endStr = searchParams.get('end');     // e.g. "2026-06-21"

    if (!startStr || !endStr) {
      return NextResponse.json({ error: 'Rango de fechas requerido' }, { status: 400 });
    }

    const startDate = new Date(startStr + 'T00:00:00');
    const endDate = new Date(endStr + 'T23:59:59');

    const whereClause = {
      fecha: {
        gte: startDate,
        lte: endDate
      }
    };

    if (session.rol === 'OPERADOR') {
      whereClause.operadorId = session.id;
    } else {
      const operadorIdParam = searchParams.get('operadorId');
      if (operadorIdParam && operadorIdParam !== 'ALL') {
        whereClause.operadorId = operadorIdParam;
      }
    }

    const boxIdParam = searchParams.get('boxId');
    if (boxIdParam && boxIdParam !== 'ALL') {
      whereClause.boxId = boxIdParam;
    }

    // Auto-sincronizar precios de turnos futuros si cambiaron en el catálogo (D-164 / D-170)
    if (Date.now() - lastTurnosSyncTimestamp > 30000) {
      lastTurnosSyncTimestamp = Date.now();
      await syncActiveFutureTurnosPrices(prisma).catch(err => console.error('Error auto-syncing prices before findMany:', err));
    }

    const turnos = await prisma.turno.findMany({
      where: whereClause,
      include: {
        box: {
          select: {
            id: true,
            nombre: true,
            color: true,
            esPrincipal: true,
            horaInicio: true,
            horaFin: true
          }
        },
        operador: {
          select: {
            id: true,
            nombre: true,
            usuario: true,
            rol: true,
            comisionTipo: true,
            comisionValor: true
          }
        },
        comisionUsuario: {
          select: {
            id: true,
            nombre: true,
            usuario: true,
            comisionTurnoPct: true
          }
        },
        cliente: {
          include: {
            turnos: {
              select: {
                id: true,
                fecha: true,
                horaInicio: true,
                horaFin: true,
                estado: true,
                subEstado: true,
                zonas: true,
                valorTotal: true,
                valorSeña: true,
                saldoPendiente: true,
                senasCobradasIds: true
              },
              orderBy: { fecha: 'desc' }
            }
          }
        }
      },
      orderBy: {
        horaInicio: 'asc'
      }
    });

    const sanitizedTurnos = turnos.map(t => {
      const s = timeToMinutes(t.horaInicio);
      const e = timeToMinutes(t.horaFin);
      const realDuration = (e > s) ? (e - s) : (t.duracionMinutos || 30);
      return {
        ...t,
        duracionMinutos: realDuration
      };
    });

    return NextResponse.json(sanitizedTurnos);
  } catch (error) {
    console.error('Error listing appointments:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Create manually by Admin
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clienteId,
      operadorId,
      boxId,
      comisionUsuarioId,
      comisionPorcentaje,
      nombreCompleto,
      whatsapp,
      email,
      dni,
      fechaStr,
      horaInicio,
      horaFin,
      selectedZoneIds,
      valorTotal,
      valorSeña,
      descuentoTipo,
      descuentoValor,
      bonificacion,
      estado,
      observaciones,
      hasOtros,
      otrosTexto,
      otrosPrecio,
      prevTurnoId,
      enviarNotificaciones
    } = body;

    let finalBoxId = boxId ? String(boxId) : null;
    if (!finalBoxId) {
      try {
        const defaultBox = await ensureDefaultBox();
        if (defaultBox) finalBoxId = defaultBox.id;
      } catch (err) {
        console.error('Error resolving default box in POST:', err);
      }
    }

    if (estado !== 'BLOQUEADO' && (!fechaStr || !horaInicio || !horaFin || ((!selectedZoneIds || selectedZoneIds.length === 0) && !hasOtros))) {
      return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 });
    }

    if (estado === 'BLOQUEADO' && (!fechaStr || !horaInicio || !horaFin)) {
      return NextResponse.json({ error: 'Fecha y horarios son requeridos para bloquear' }, { status: 400 });
    }

    // Validation: Past Date/Time Check
    if (isPastDateTime(fechaStr, horaInicio)) {
      return NextResponse.json({ error: 'No es posible agendar turnos con fechas o de horarios anteriores/pasados.' }, { status: 400 });
    }

    // Fetch work hours configuration
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    const workStartStr = startConfig?.value || '10:00';
    const workEndStr = endConfig?.value || '22:00';
    
    // For admin operations, allow flexible scheduling (07:00 to 23:00) so exceptional appointments (e.g. at 13:00 hs or 21:30 hs) are not blocked
    const workStartMinutes = Math.min(timeToMinutes(workStartStr), timeToMinutes('07:00'));
    const workEndMinutes = Math.max(timeToMinutes(workEndStr), timeToMinutes('23:00'));
    
    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = timeToMinutes(horaFin);

    if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
      return NextResponse.json({ error: `El horario seleccionado está fuera del rango horario permitido (07:00 hs a 23:00 hs).` }, { status: 400 });
    }

    // Validation: Overlap Check
    let finalOperadorId = operadorId ? String(operadorId) : null;
    const checkOverlap = await hasOverlappingTurno(fechaStr, horaInicio, horaFin, null, finalBoxId, finalOperadorId);
    if (checkOverlap) {
      const isBlock = checkOverlap.estado === 'BLOQUEADO';
      return NextResponse.json({
        error: isBlock 
          ? 'El horario seleccionado se encuentra bloqueado administrativamente.' 
          : `El horario seleccionado se solapa con otro turno de ${checkOverlap.cliente?.nombreCompleto || 'otro cliente'}.`
      }, { status: 400 });
    }

    let finalClienteId = clienteId ? String(clienteId) : null;
    let clientRecord = null;

    if (finalClienteId) {
      clientRecord = await prisma.cliente.findUnique({
        where: { id: finalClienteId },
        include: { turnos: true }
      });
    }

    // 1. Resolve client if not found by ID or if no ID was provided
    if (!clientRecord) {
      const finalWhatsapp = whatsapp ? normalizeWhatsApp(whatsapp) : null;
      if (dni || email || finalWhatsapp) {
        clientRecord = await prisma.cliente.findFirst({
          where: {
            OR: [
              dni ? { dni } : undefined,
              email ? { email } : undefined,
              finalWhatsapp ? { whatsapp: finalWhatsapp } : undefined
            ].filter(Boolean)
          },
          include: { turnos: true }
        });
      }

      if (!clientRecord) {
        if (!nombreCompleto || !whatsapp || !email) {
          return NextResponse.json({ error: 'Datos de cliente requeridos para nuevo cliente' }, { status: 400 });
        }

        clientRecord = await prisma.cliente.create({
          data: {
            dni: dni || null,
            nombreCompleto,
            whatsapp: finalWhatsapp || normalizeWhatsApp(whatsapp),
            email,
            canalAdquisicion: 'ORGANICO',
            estado: 'ACTIVO',
            ...(enviarNotificaciones !== undefined ? { enviarNotificaciones: Boolean(enviarNotificaciones) } : {})
          },
          include: { turnos: true }
        });
      } else {
        const updateClientData = {};
        if (nombreCompleto && nombreCompleto.trim() && nombreCompleto.trim() !== clientRecord.nombreCompleto) {
          updateClientData.nombreCompleto = nombreCompleto.trim();
          clientRecord.nombreCompleto = nombreCompleto.trim();
        }
        if (email && email.trim() && email.trim() !== clientRecord.email) {
          updateClientData.email = email.trim();
          clientRecord.email = email.trim();
        }
        const cleanWpp = finalWhatsapp || (whatsapp ? normalizeWhatsApp(whatsapp) : null);
        if (cleanWpp && cleanWpp !== clientRecord.whatsapp) {
          updateClientData.whatsapp = cleanWpp;
          clientRecord.whatsapp = cleanWpp;
        }
        if (dni !== undefined && dni !== null && dni.trim() !== (clientRecord.dni || '')) {
          updateClientData.dni = dni.trim() || null;
          clientRecord.dni = dni.trim() || null;
        }
        if (enviarNotificaciones !== undefined && clientRecord.enviarNotificaciones !== Boolean(enviarNotificaciones)) {
          updateClientData.enviarNotificaciones = Boolean(enviarNotificaciones);
          clientRecord.enviarNotificaciones = Boolean(enviarNotificaciones);
        }
        if (clientRecord.estado !== 'ACTIVO') {
          updateClientData.estado = 'ACTIVO';
          clientRecord.estado = 'ACTIVO';
        }

        if (Object.keys(updateClientData).length > 0) {
          await prisma.cliente.update({
            where: { id: clientRecord.id },
            data: updateClientData
          }).catch(err => console.error('Error updating existing client info during turno creation:', err));
        }
      }
      finalClienteId = clientRecord.id;
    }

    // 2. Compute details (bypass zones if BLOQUEADO)
    let computedDuration = 30;
    let zonasJson = '[]';
    let finalValorTotal = valorTotal !== undefined && valorTotal !== '' ? Number(valorTotal) : 0;
    let finalValorSeña = valorSeña !== undefined && valorSeña !== '' ? Number(valorSeña) : 0;

    if (estado === 'BLOQUEADO') {
      const startMin = timeToMinutes(horaInicio);
      const endMin = timeToMinutes(horaFin);
      computedDuration = Math.max(10, endMin - startMin);
    } else {
      let dbZones = [];
      if (selectedZoneIds && selectedZoneIds.length > 0) {
        dbZones = await prisma.zona.findMany({
          where: { id: { in: selectedZoneIds } }
        });
      }
      const parsedZones = dbZones.map(z => ({ id: z.id, nombre: z.nombre, precio: z.precioBase, duracion: z.duracionMinutos }));
      if (hasOtros && otrosTexto) {
        parsedZones.push({ id: 'otros', nombre: `Otros: ${otrosTexto}`, precio: Number(otrosPrecio || 0), duracion: 0 });
      }
      zonasJson = JSON.stringify(parsedZones);
      
      const isNew = clientRecord ? (clientRecord.turnos?.length === 0) : true;
      const coreDetails = calculateTurnDetails(dbZones, isNew);
      
      const startMin = timeToMinutes(horaInicio);
      const endMin = timeToMinutes(horaFin);
      const diffMin = endMin - startMin;

      if (diffMin > 0) {
        computedDuration = diffMin;
      } else if (coreDetails.duracionMinutos > 0) {
        computedDuration = coreDetails.duracionMinutos;
      } else {
        computedDuration = 30;
      }
      if (valorTotal === undefined || valorTotal === '') finalValorTotal = coreDetails.valorTotal;
      if (valorSeña === undefined || valorSeña === '') finalValorSeña = Math.round(finalValorTotal * 0.5);
    }

    const targetDate = new Date(fechaStr + 'T00:00:00');

    // Determine notasGonzalo for the new appointment
    let finalNotasGonzalo = body.notasGonzalo !== undefined 
      ? (typeof body.notasGonzalo === 'string' ? body.notasGonzalo.trim() : body.notasGonzalo)
      : null;

    if (finalNotasGonzalo === null) {
      if (prevTurnoId) {
        const prevTurno = await prisma.turno.findUnique({
          where: { id: String(prevTurnoId) },
          select: { notasGonzalo: true }
        });
        if (prevTurno?.notasGonzalo) {
          finalNotasGonzalo = prevTurno.notasGonzalo;
        }
      }
      if (!finalNotasGonzalo && finalClienteId) {
        const lastTurno = await prisma.turno.findFirst({
          where: {
            clienteId: finalClienteId,
            fecha: { lte: targetDate }
          },
          orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
          select: { notasGonzalo: true }
        });
        if (lastTurno?.notasGonzalo) {
          finalNotasGonzalo = lastTurno.notasGonzalo;
        }
      }
      if (!finalNotasGonzalo && clientRecord?.notasGonzalo) {
        finalNotasGonzalo = clientRecord.notasGonzalo;
      }
    }

    // 4. Resolve default operator (defaults to Gonzalo / primary Admin if not specified)
    if (!finalOperadorId) {
      try {
        const allUsers = await prisma.usuario.findMany();
        const defaultOp = allUsers.find(u => u.nombre?.toLowerCase().includes('gonzalo') || u.usuario?.toLowerCase() === 'gonzalo')
          || allUsers.find(u => u.rol === 'ADMIN')
          || allUsers[0];
        if (defaultOp) {
          finalOperadorId = defaultOp.id;
        }
      } catch (err) {
        console.error('Error resolving default operator:', err);
      }
    }

    // 5. Determine dinero a favor del cliente si tiene saldo acumulado (D-151 / D-170)
    let finalDineroAFavor = 0;
    if (body.dineroAFavor !== undefined && body.dineroAFavor !== null && body.dineroAFavor !== '') {
      finalDineroAFavor = Math.max(0, Number(body.dineroAFavor));
    } else if (Number(clientRecord?.saldoAFavor || 0) > 0) {
      finalDineroAFavor = Number(clientRecord.saldoAFavor);
    }

    const comisionUser = comisionUsuarioId ? String(comisionUsuarioId) : null;
    const comisionPct = comisionUser && comisionPorcentaje !== undefined && comisionPorcentaje !== null ? Number(comisionPorcentaje) : 0;
    const calcComisionMonto = comisionUser && comisionPct > 0 ? Math.round((finalValorTotal * comisionPct) / 100) : 0;

    // Create appointment
    const newTurno = await prisma.turno.create({
      data: {
        clienteId: finalClienteId,
        operadorId: finalOperadorId,
        comisionUsuarioId: comisionUser,
        comisionPorcentaje: comisionUser ? comisionPct : 0,
        comisionMonto: calcComisionMonto,
        boxId: finalBoxId,
        fecha: targetDate,
        horaInicio,
        horaFin,
        duracionMinutos: computedDuration,
        zonas: zonasJson,
        valorTotal: finalValorTotal,
        valorSeña: finalValorSeña,
        saldoPendiente: Math.max(0, finalValorTotal - finalValorSeña),
        bonificacion: Number(bonificacion || 0),
        descuentoTipo: descuentoTipo || 'NINGUNO',
        descuentoValor: Number(descuentoValor || 0),
        estado: estado || 'SEÑADO',
        señaEstado: body.señaEstado || (finalDineroAFavor > 0 ? 'SALDO_A_FAVOR' : null),
        metodoPago: body.metodoPago || 'TRANSFERENCIA',
        montoEfectivo: Math.max(0, Number(body.montoEfectivo) || 0),
        montoTransferencia: Math.max(0, Number(body.montoTransferencia) || 0),
        dineroAFavor: finalDineroAFavor,
        observaciones,
        notasGonzalo: finalNotasGonzalo
      },
      include: {
        cliente: {
          include: {
            turnos: {
              where: { estado: 'REALIZADO' },
              select: { id: true }
            }
          }
        },
        box: true,
        operador: {
          select: {
            id: true,
            nombre: true,
            usuario: true,
            rol: true
          }
        },
        comisionUsuario: {
          select: {
            id: true,
            nombre: true,
            usuario: true,
            comisionTurnoPct: true
          }
        }
      }
    });

    // Descontar saldo a favor utilizado del cliente (D-151 / D-170)
    if (finalDineroAFavor > 0 && finalClienteId) {
      try {
        const clientCurrent = await prisma.cliente.findUnique({
          where: { id: finalClienteId },
          select: { saldoAFavor: true }
        });
        const currentBal = Number(clientCurrent?.saldoAFavor || 0);
        await prisma.cliente.update({
          where: { id: finalClienteId },
          data: {
            saldoAFavor: Math.max(0, currentBal - finalDineroAFavor)
          }
        });
      } catch (saldoErr) {
        console.error('Error updating client saldoAFavor upon appointment creation:', saldoErr);
      }
    }

    if (prevTurnoId) {
      try {
        await prisma.turno.update({
          where: { id: String(prevTurnoId) },
          data: {
            estado: 'REALIZADO',
            subEstado: 'SIGUIENTE_TURNO'
          }
        });
        console.log(`[Turno Create] Previous turno ${prevTurnoId} marked as REALIZADO / SIGUIENTE_TURNO.`);
      } catch (errPrev) {
        console.error('Error updating previous turno to REALIZADO:', errPrev);
      }
    }

    if (body.solicitudId) {
      try {
        await prisma.solicitudAutogestion.update({
          where: { id: String(body.solicitudId) },
          data: { estado: 'AGENDADO' }
        });
        console.log(`[Turno Create] Solicitud autogestión ${body.solicitudId} marked as AGENDADO.`);
      } catch (solErr) {
        console.error('Error updating solicitud autogestión to AGENDADO:', solErr);
      }
    }

    // Si el cliente tenía saldo a favor que se aplicó a este nuevo turno, resetear saldoAFavor
    if (finalClienteId) {
      await prisma.cliente.update({
        where: { id: finalClienteId },
        data: { saldoAFavor: 0 }
      }).catch(err => console.error('Error resetting client saldoAFavor:', err));
    }

    if (body.clientObservaciones !== undefined && body.clientObservaciones !== '' && finalClienteId) {
      await prisma.cliente.update({
        where: { id: finalClienteId },
        data: { observaciones: body.clientObservaciones }
      }).catch(err => console.error('Error updating client observaciones:', err));
      if (newTurno.cliente) {
        newTurno.cliente.observaciones = body.clientObservaciones;
      }
    }

    if (body.notasGonzalo !== undefined && finalClienteId) {
      await prisma.cliente.update({
        where: { id: finalClienteId },
        data: { notasGonzalo: finalNotasGonzalo }
      }).catch(err => console.error('Error updating client notasGonzalo:', err));
      if (newTurno.cliente) {
        newTurno.cliente.notasGonzalo = finalNotasGonzalo;
      }
    }

    // 5. Send confirmation email and WhatsApp if it is a real appointment (not a time block)
    if (newTurno.estado !== 'BLOQUEADO') {
      const clientNotificationsEnabled = newTurno.cliente ? newTurno.cliente.enviarNotificaciones !== false : true;
      const notificationsEnabled = clientNotificationsEnabled;

      // 5.1 Send Email
      if (notificationsEnabled) {
        try {
          await sendConfirmationEmail(
            newTurno.cliente.email,
            newTurno.cliente.nombreCompleto,
            {
              fecha: newTurno.fecha,
              horaInicio: newTurno.horaInicio,
              zonas: newTurno.zonas,
              valorSeña: newTurno.valorSeña,
              valorTotal: newTurno.valorTotal
            }
          );
          await prisma.notificacion.create({
            data: {
              clienteId: newTurno.clienteId,
              turnoId: newTurno.id,
              canal: 'EMAIL',
              mensaje: `¡Tu reserva ha sido confirmada con éxito!\n\nTe esperamos para tu sesión de depilación láser en Paraná 597, Piso 8, Depto 48. Recordá venir afeitado al ras.`,
              estado: 'ENVIADO'
            }
          });
        } catch (mailError) {
          console.error('Failed to send confirmation email on manual create:', mailError);
          await prisma.notificacion.create({
            data: {
              clienteId: newTurno.clienteId,
              turnoId: newTurno.id,
              canal: 'EMAIL',
              mensaje: `Fallo al enviar email de confirmación manual: ${mailError.message}`,
              estado: 'FALLIDO'
            }
          });
        }
      }

      // 5.2 Send WhatsApp confirmation
      if (notificationsEnabled) {
        try {
        const templateConfig = await prisma.configuracion.findUnique({
          where: { key: 'wtsp_confirmation_manual_template' }
        });
        const addressConfig = await prisma.configuracion.findUnique({
          where: { key: 'address' }
        });

        const templateVal = templateConfig?.value || "¡Hola [Nombre]! Tu turno para el día [FechaTurno] a las [Horario] para [Zonas] fue agendado con éxito. Recordá venir afeitado al ras. ¡Te esperamos!";
        const addressVal = addressConfig?.value || "Paraná 597, piso 8, depto 48";

        const msg = parseTemplate(templateVal, newTurno.cliente, newTurno, addressVal);

        await sendWhatsAppMessage(newTurno.cliente.whatsapp, msg);

        // SOLO para clientes nuevos (0 sesiones realizadas en el sistema), enviar imágenes de bienvenida
        const completedSessionsCount = (Number(newTurno.cliente?.sesionesPrevias) || 0) + (newTurno.cliente?.turnos ? newTurno.cliente.turnos.filter(t => t.id !== newTurno.id).length : 0);
        if (completedSessionsCount === 0) {
          sendNewClientWelcomeImages(newTurno.cliente.whatsapp).catch(e => console.error('Error sending welcome images to new client:', e));
        }

        await prisma.notificacion.create({
          data: {
            clienteId: newTurno.clienteId,
            turnoId: newTurno.id,
            canal: 'WHATSAPP',
            mensaje: msg,
            estado: 'ENVIADO'
          }
        });
        console.log(`WhatsApp confirmation automatically sent on manual create to ${newTurno.cliente.nombreCompleto}.`);
      } catch (wppError) {
        console.error('Failed to send WhatsApp confirmation on manual create:', wppError);
        await prisma.notificacion.create({
          data: {
            clienteId: newTurno.clienteId,
            turnoId: newTurno.id,
            canal: 'WHATSAPP',
            mensaje: `Fallo al enviar WhatsApp de confirmación manual: ${wppError.message}`,
            estado: 'FALLIDO'
          }
        });
      }
    }
  }

    return NextResponse.json(newTurno);
  } catch (error) {
    console.error('Error creating manually:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
