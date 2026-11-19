import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { calculateTurnDetails } from '@/lib/calculations.js';
import { normalizeWhatsApp } from '@/lib/whatsapp.js';
import { cleanupExpiredPendingPayments } from '@/lib/cleanup.js';
import { emailsMatch, findClientByEmail } from '@/lib/emailNormalize.js';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

async function hasOverlappingTurno(fechaStr, horaInicio, horaFin, excludeTurnoId = null) {
  const targetDate = new Date(fechaStr + 'T00:00:00');
  const nextDate = new Date(targetDate);
  nextDate.setDate(targetDate.getDate() + 1);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const dayTurnos = await prisma.turno.findMany({
    where: {
      fecha: {
        gte: targetDate,
        lt: nextDate
      },
      estado: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
      NOT: {
        estado: 'PENDIENTE_PAGO',
        createdAt: { lt: fiveMinutesAgo }
      },
      id: excludeTurnoId ? { not: excludeTurnoId } : undefined
    }
  });

  const newStartMin = timeToMinutes(horaInicio);
  const newEndMin = timeToMinutes(horaFin);

  for (const t of dayTurnos) {
    const startMin = timeToMinutes(t.horaInicio);
    const endMin = timeToMinutes(t.horaFin);
    if (startMin < newEndMin && endMin > newStartMin) {
      return t;
    }
  }

  // Check administrative blocks
  const dayBloqueos = await prisma.bloqueo.findMany({
    where: {
      fecha: {
        gte: targetDate,
        lt: nextDate
      }
    }
  });

  for (const b of dayBloqueos) {
    if (b.esDiaCompleto) return b;
    const bStart = timeToMinutes(b.horaInicio);
    const bEnd = timeToMinutes(b.horaFin);
    if (bStart < newEndMin && bEnd > newStartMin) {
      return b;
    }
  }

  return null;
}

export async function POST(request) {
  try {
    await cleanupExpiredPendingPayments();
    const body = await request.json();
    const {
      nombreCompleto,
      whatsapp,
      email,
      dni,
      fechaStr,
      horaInicio,
      selectedZoneIds,
      observaciones,
      fechaNacimiento,
      isRepeatLastZones,
      customDuracion,
      customValorTotal,
      customValorSeña,
      customZonasText,
      cuponCodigo
    } = body;

    if (!nombreCompleto || !whatsapp || !email || !fechaStr || !horaInicio || !selectedZoneIds || selectedZoneIds.length === 0) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios son requeridos.' },
        { status: 400 }
      );
    }

    // Argentina timezone checks
    const now = new Date();
    const offsetBA = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowLocal = new Date(utc + (3600000 * offsetBA));
    const todayStr = nowLocal.toISOString().split('T')[0];

    if (fechaStr <= todayStr) {
      return NextResponse.json({ error: 'No es posible agendar turnos para el mismo día o fechas pasadas.' }, { status: 400 });
    }

    const targetDate = new Date(fechaStr + 'T00:00:00');
    const targetDay = targetDate.getDay(); // 0 = Sunday
    if (targetDay === 0) {
      return NextResponse.json({ error: 'No es posible agendar turnos los domingos.' }, { status: 400 });
    }

    // 1. Fetch zones details from DB
    const normalZoneIds = (selectedZoneIds || []).filter(id => id && id !== 'otros');
    const dbZones = normalZoneIds.length > 0
      ? await prisma.zona.findMany({ where: { id: { in: normalZoneIds } } })
      : [];

    if (!isRepeatLastZones && dbZones.length !== selectedZoneIds.length) {
      return NextResponse.json({ error: 'Alguna de las zonas seleccionadas no es válida.' }, { status: 400 });
    }

    const finalWhatsapp = normalizeWhatsApp(whatsapp);

    // 2. Client deferred creation/update: ONLY created upon reservation confirmation
    let client = await findClientByEmail(prisma, email);

    if (!client && dni) {
      client = await prisma.cliente.findUnique({
        where: { dni: dni.trim() }
      });
    }

    if (client) {
      const updateData = {};
      if (!client.dni && dni) updateData.dni = dni.trim();
      if (client.nombreCompleto !== nombreCompleto.trim()) updateData.nombreCompleto = nombreCompleto.trim();
      if (client.whatsapp !== finalWhatsapp) updateData.whatsapp = finalWhatsapp;
      if (!emailsMatch(client.email, email)) updateData.email = email.trim().toLowerCase();
      if (!client.fechaNacimiento && fechaNacimiento) {
        updateData.fechaNacimiento = new Date(fechaNacimiento);
      }
      if (client.estado !== 'ACTIVO') {
        updateData.estado = 'ACTIVO';
      }

      if (Object.keys(updateData).length > 0) {
        client = await prisma.cliente.update({
          where: { id: client.id },
          data: updateData
        });
      }
    } else {
      // 2.1 Defense against duplicate phone under different email
      const cleanDigits = String(whatsapp).replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
      const last8 = cleanDigits.length >= 8 ? cleanDigits.slice(-8) : cleanDigits;

      const existingPhoneClient = await prisma.cliente.findFirst({
        where: {
          OR: [
            ...(finalWhatsapp ? [{ whatsapp: finalWhatsapp }] : []),
            ...(cleanDigits ? [{ whatsapp: cleanDigits }] : []),
            ...(last10 && last10.length === 10 ? [{ whatsapp: { contains: last10 } }] : []),
            ...(last8 && last8.length === 8 ? [{ whatsapp: { contains: last8 } }] : [])
          ]
        }
      });

      if (existingPhoneClient && !emailsMatch(existingPhoneClient.email, email)) {
        return NextResponse.json({
          error: 'El número de teléfono ingresado ya se encuentra registrado con otro correo electrónico. Por favor, comunicate con nosotros por WhatsApp para gestionar tu turno.',
          phoneConflict: true
        }, { status: 400 });
      }

      client = await prisma.cliente.create({
        data: {
          dni: dni ? dni.trim() : null,
          nombreCompleto: nombreCompleto.trim(),
          whatsapp: finalWhatsapp,
          email: email.trim().toLowerCase(),
          canalAdquisicion: 'ORGANICO',
          estado: 'ACTIVO',
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null
        }
      });
    }

    // 3. Calculate appointment duration & values
    let duracionMinutos = 30;
    let valorTotal = 0;
    let valorSeña = 0;
    let zonasNombres = '';

    if (isRepeatLastZones) {
      duracionMinutos = Number(customDuracion || 30);
      valorTotal = Number(customValorTotal || 0);
      valorSeña = Number(customValorSeña || Math.round(valorTotal * 0.5));
      zonasNombres = customZonasText || (dbZones.map(z => z.nombre).join(', ') || 'Zonas agendadas');
    } else {
      const calcs = calculateTurnDetails(dbZones, false);
      duracionMinutos = calcs.duracionMinutos;
      valorTotal = calcs.valorTotal;
      valorSeña = calcs.valorSeña;
      zonasNombres = dbZones.map(z => z.nombre).join(', ');
    }

    let appliedCuponRecord = null;
    if (cuponCodigo && cuponCodigo.trim()) {
      const cleanCodigo = cuponCodigo.trim().toUpperCase();
      const dbCupon = await prisma.cupon.findUnique({ where: { codigo: cleanCodigo } });
      if (dbCupon && dbCupon.activo && (!dbCupon.fechaVencimiento || new Date(dbCupon.fechaVencimiento) >= new Date()) && dbCupon.usosActuales < dbCupon.usosPermitidos) {
        appliedCuponRecord = dbCupon;
        if (dbCupon.descuentoTipo === 'PORCENTAJE') {
          valorTotal = Math.max(0, Math.round(valorTotal * (1 - (Number(dbCupon.descuentoValor) || 0) / 100)));
        } else {
          valorTotal = Math.max(0, Math.round(valorTotal - (Number(dbCupon.descuentoValor) || 0)));
        }
        valorSeña = Math.round(valorTotal * 0.5);
      }
    } else if (customValorTotal !== undefined && !isNaN(Number(customValorTotal)) && Number(customValorTotal) > 0) {
      valorTotal = Number(customValorTotal);
      valorSeña = customValorSeña !== undefined ? Number(customValorSeña) : Math.round(valorTotal * 0.5);
    }

    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = startMinutes + duracionMinutos;
    const horaFin = minutesToTime(endMinutes);

    // Verify operating hours
    const startConfig = await prisma.configuracion.findUnique({ where: { key: 'work_start' } });
    const endConfig = await prisma.configuracion.findUnique({ where: { key: 'work_end' } });
    const workStartStr = startConfig?.value || '12:30';
    const workEndStr = endConfig?.value || '22:00';

    if (startMinutes < timeToMinutes(workStartStr) || endMinutes > timeToMinutes(workEndStr)) {
      return NextResponse.json({ error: `El horario seleccionado está fuera de atención (${workStartStr} a ${workEndStr} hs).` }, { status: 400 });
    }

    // Overlap check
    const checkOverlap = await hasOverlappingTurno(fechaStr, horaInicio, horaFin);
    if (checkOverlap) {
      return NextResponse.json({ error: 'El horario seleccionado ya no se encuentra disponible. Por favor, elige otro horario o día.' }, { status: 400 });
    }

    // 5. Zone summary is already established in zonasNombres

    // 6. WhatsApp redirection ("Pagar Seña")
    // Retrieve business phone number (Gonzalo: +54 9 11 3251-9008)
    const businessPhoneConfig = await prisma.configuracion.findUnique({ where: { key: 'business_whatsapp' } });
    const businessPhone = businessPhoneConfig?.value || process.env.BUSINESS_WHATSAPP || process.env.ADMIN_WHATSAPP || '5491132519008';
    const cleanPhone = businessPhone.replace(/\D/g, '') || '5491132519008';

    // Format readable date (e.g., 25/10/2026)
    const [y, m, d] = fechaStr.split('-');
    const fechaLegible = `${d}/${m}/${y}`;

    // Exact message template required by Luciano
    const whatsappMessage = `Hola 👋 Quiero reservar este turno:

Nombre: ${client.nombreCompleto}
Fecha: ${fechaLegible}
Horario: ${horaInicio} hs
Zonas: ${zonasNombres}
Duración: ${duracionMinutos} min${appliedCuponRecord ? `\nCupón aplicado: ${appliedCuponRecord.codigo}` : ''}
Total: $${Math.round(valorTotal).toLocaleString('es-AR')}
Seña a abonar: $${Math.round(valorSeña).toLocaleString('es-AR')}

Quedo a la espera de los datos para realizar el pago de la seña y confirmar el turno.`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    // 7. Resolve suggested operator for this request
    let finalOpId = null;
    let finalOpNombre = 'Gonzalo';

    try {
      const nextDateObj = new Date(targetDate);
      nextDateObj.setDate(targetDate.getDate() + 1);
      const existingTurnoOnDay = await prisma.turno.findFirst({
        where: {
          fecha: { gte: targetDate, lt: nextDateObj },
          estado: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
          operadorId: { not: null }
        },
        include: { operador: true }
      });

      if (existingTurnoOnDay?.operador) {
        finalOpId = existingTurnoOnDay.operador.id;
        finalOpNombre = existingTurnoOnDay.operador.nombre || 'Gonzalo';
      } else {
        const clientLastTurno = client?.id ? await prisma.turno.findFirst({
          where: { clienteId: client.id, operadorId: { not: null } },
          orderBy: { fecha: 'desc' },
          include: { operador: true }
        }) : null;

        if (clientLastTurno?.operador) {
          finalOpId = clientLastTurno.operador.id;
          finalOpNombre = clientLastTurno.operador.nombre || 'Gonzalo';
        } else {
          const defaultAdminOp = await prisma.usuario.findFirst({
            where: {
              OR: [
                { nombre: { contains: 'gonzalo', mode: 'insensitive' } },
                { usuario: { contains: 'gonzalo', mode: 'insensitive' } },
                { rol: 'ADMIN' }
              ]
            }
          });
          if (defaultAdminOp) {
            finalOpId = defaultAdminOp.id;
            finalOpNombre = defaultAdminOp.nombre || 'Gonzalo';
          }
        }
      }
    } catch (opErr) {
      console.error('Error resolving operator for autogestion solicitud:', opErr);
    }

    // 8. Save or update queue request (SolicitudAutogestion)
    // Avoid duplicates: if the same client has an existing PENDIENTE request, replace it with the new one
    let savedSolicitud = null;
    try {
      const existingPendingSolicitud = await prisma.solicitudAutogestion.findFirst({
        where: {
          estado: 'PENDIENTE',
          OR: [
            ...(client?.id ? [{ clienteId: client.id }] : []),
            ...(email ? [{ email: email.trim().toLowerCase() }] : []),
            ...(finalWhatsapp ? [{ whatsapp: finalWhatsapp }] : [])
          ]
        }
      });

      const solicitudPayload = {
        clienteId: client?.id || null,
        nombreCompleto: client.nombreCompleto,
        whatsapp: finalWhatsapp,
        email: email.trim().toLowerCase(),
        dni: dni ? dni.trim() : (client.dni || null),
        fecha: targetDate,
        fechaStr,
        horaInicio,
        horaFin,
        duracionMinutos,
        zonas: JSON.stringify(dbZones.map(z => ({ id: z.id, nombre: z.nombre, precio: z.precio, duracion: z.duracion }))),
        zonasTexto: zonasNombres,
        selectedZoneIds: (selectedZoneIds || []).join(','),
        valorTotal,
        valorSeña,
        operadorId: finalOpId,
        operadorNombre: finalOpNombre,
        observaciones: observaciones
          ? (appliedCuponRecord ? `${observaciones.trim()} [Cupón: ${appliedCuponRecord.codigo}]` : observaciones.trim())
          : (appliedCuponRecord ? `[Cupón: ${appliedCuponRecord.codigo}]` : null),
        estado: 'PENDIENTE'
      };

      if (existingPendingSolicitud) {
        savedSolicitud = await prisma.solicitudAutogestion.update({
          where: { id: existingPendingSolicitud.id },
          data: solicitudPayload
        });
        console.log(`[Autogestión] Updated existing pending request ${savedSolicitud.id} for client ${client.nombreCompleto}`);
      } else {
        savedSolicitud = await prisma.solicitudAutogestion.create({
          data: solicitudPayload
        });
        console.log(`[Autogestión] Created new pending request ${savedSolicitud.id} for client ${client.nombreCompleto}`);
      }

      if (appliedCuponRecord) {
        try {
          await prisma.cupon.update({
            where: { id: appliedCuponRecord.id },
            data: { usosActuales: { increment: 1 } }
          });
        } catch (cupErr) {
          console.error('Error incrementing cupon uses:', cupErr);
        }
      }
    } catch (solErr) {
      console.error('Error persisting autogestion solicitud:', solErr);
    }

    // Note: Conforme a la indicación de Luciano, NO se crea el Turno en base de datos
    // para no bloquear el slot en la agenda hasta que el cliente abone efectivamente la seña por WhatsApp.
    return NextResponse.json({
      success: true,
      clienteId: client.id,
      whatsappUrl,
      solicitudId: savedSolicitud?.id || null,
      solicitud: {
        id: savedSolicitud?.id || null,
        nombre: client.nombreCompleto,
        fecha: fechaStr,
        fechaLegible,
        horaInicio,
        horaFin,
        duracionMinutos,
        zonas: zonasNombres,
        valorTotal,
        valorSeña,
        operadorNombre: finalOpNombre
      }
    });
  } catch (error) {
    console.error('Error in create reservation API:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
