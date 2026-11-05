import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { normalizeWhatsApp } from '@/lib/whatsapp.js';

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'otro correo';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}*@${domain}`;
  }
  const first = local.charAt(0);
  const last = local.charAt(local.length - 1);
  const maskLength = Math.min(Math.max(local.length - 2, 1), 4);
  return `${first}${'*'.repeat(maskLength)}${last}@${domain}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const dni = searchParams.get('dni');
    const whatsapp = searchParams.get('whatsapp');
    const currentEmail = searchParams.get('currentEmail')?.trim().toLowerCase();

    if (!email && !dni && !whatsapp) {
      return NextResponse.json({ error: 'Email, DNI o WhatsApp es requerido' }, { status: 400 });
    }

    // 1. Phone number check (anti-collision with other registered accounts)
    if (whatsapp) {
      const finalWhatsapp = normalizeWhatsApp(whatsapp);
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

      if (existingPhoneClient) {
        const clientEmailLower = (existingPhoneClient.email || '').trim().toLowerCase();
        const isConflict = currentEmail && clientEmailLower !== currentEmail;

        if (isConflict) {
          return NextResponse.json({
            exists: true,
            phoneRegisteredUnderOtherEmail: true,
            registeredEmailMasked: maskEmail(existingPhoneClient.email),
            registeredClientName: (existingPhoneClient.nombreCompleto || '').split(' ')[0] || '',
            error: 'Este número de teléfono ya se encuentra registrado con otro correo electrónico.'
          });
        }

        return NextResponse.json({
          exists: true,
          phoneRegisteredUnderOtherEmail: false,
          client: {
            id: existingPhoneClient.id,
            nombreCompleto: existingPhoneClient.nombreCompleto,
            whatsapp: existingPhoneClient.whatsapp,
            email: existingPhoneClient.email,
            bloqueado: existingPhoneClient.bloqueado
          }
        });
      }

      return NextResponse.json({
        exists: false,
        phoneRegisteredUnderOtherEmail: false
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let client = null;
    if (email) {
      client = await prisma.cliente.findFirst({
        where: {
          OR: [
            { email: { equals: email } },
            { email: { contains: email } }
          ]
        },
        include: {
          turnos: {
            where: {
              estado: {
                in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION']
              },
              fecha: {
                gte: today
              }
            },
            orderBy: [
              { fecha: 'asc' },
              { horaInicio: 'asc' }
            ]
          }
        }
      });
    } else if (dni) {
      client = await prisma.cliente.findUnique({
        where: { dni: dni },
        include: {
          turnos: {
            where: {
              estado: {
                in: ['SEÑADO', 'PENDIENTE_PAGO', 'REPROGRAMADO', 'PENDIENTE_AUTORIZACION']
              },
              fecha: {
                gte: today
              }
            },
            orderBy: [
              { fecha: 'asc' },
              { horaInicio: 'asc' }
            ]
          }
        }
      });
    }

    if (!client) {
      return NextResponse.json({ exists: false });
    }

    if (client.bloqueado) {
      return NextResponse.json({
        exists: true,
        bloqueado: true,
        client: {
          id: client.id,
          nombreCompleto: client.nombreCompleto,
          whatsapp: client.whatsapp,
          email: client.email,
          bloqueado: true
        },
        hasActiveTurno: false,
        activeTurno: null,
        activeTurnos: []
      });
    }

    const hasActiveTurno = client.turnos.length > 0;

    let ultimoTurnoData = null;
    if (!hasActiveTurno) {
      try {
        const ultimoTurno = await prisma.turno.findFirst({
          where: { clienteId: client.id },
          orderBy: [
            { fecha: 'desc' },
            { createdAt: 'desc' }
          ]
        });

        if (ultimoTurno && ultimoTurno.fecha) {
          const now = new Date();
          const offsetBA = -3;
          const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
          const nowLocal = new Date(utcNow + (3600000 * offsetBA));
          const todayZero = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());

          const tDate = new Date(ultimoTurno.fecha);
          const tZero = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
          const diffDays = Math.floor((todayZero.getTime() - tZero.getTime()) / (1000 * 60 * 60 * 24));

          // Si el último turno fue hace menos de 90 días (o fue un turno cancelado reciente/futuro)
          if (diffDays <= 90) {
            let rawZones = [];
            try {
              const parsed = JSON.parse(ultimoTurno.zonas || '[]');
              if (Array.isArray(parsed)) {
                rawZones = parsed;
              } else if (typeof parsed === 'string') {
                rawZones = parsed.split(',').map(s => ({ nombre: s.trim() })).filter(z => z.nombre);
              }
            } catch {
              if (typeof ultimoTurno.zonas === 'string') {
                rawZones = ultimoTurno.zonas.split(',').map(s => ({ nombre: s.trim() })).filter(z => z.nombre);
              }
            }

            if (rawZones.length > 0) {
              const catalogZones = await prisma.zona.findMany();

              const normalize = (str) =>
                (str || '')
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .trim();

              let valorTotalCalculado = 0;
              let valorSeñaCalculado = 0;
              const matchedZoneIds = [];
              const zoneNames = [];

              for (const rz of rawZones) {
                const rawName = (rz.nombre || rz.name || String(rz)).trim();
                const isOtros = rz.id === 'otros' || normalize(rawName).startsWith('otros');

                if (isOtros) {
                  // Valores de Otros sin cambiar
                  const precioOtros = Number(rz.precio || rz.precioBase || 0);
                  valorTotalCalculado += precioOtros;
                  valorSeñaCalculado += Math.round(precioOtros * 0.5);
                  matchedZoneIds.push('otros');
                  zoneNames.push(rawName);
                } else {
                  // Buscar zona normal en catálogo por ID o nombre normalizado
                  const matched = catalogZones.find(cz => cz.id === rz.id) ||
                    catalogZones.find(cz => normalize(cz.nombre) === normalize(rawName));

                  if (matched) {
                    // Valor de zonas normales actualizadas
                    const precioActualizado = Number(matched.precioBase);
                    const señaActualizada = Number(matched.señaBase || (precioActualizado * 0.5));
                    valorTotalCalculado += precioActualizado;
                    valorSeñaCalculado += señaActualizada;
                    matchedZoneIds.push(matched.id);
                    zoneNames.push(matched.nombre);
                  } else {
                    // Si no está en catálogo, mantener precio previo
                    const precioOriginal = Number(rz.precio || rz.precioBase || 0);
                    valorTotalCalculado += precioOriginal;
                    valorSeñaCalculado += Math.round(precioOriginal * 0.5);
                    zoneNames.push(rawName);
                  }
                }
              }

              if (valorSeñaCalculado === 0 && valorTotalCalculado > 0) {
                valorSeñaCalculado = Math.round(valorTotalCalculado * 0.5);
              }

              ultimoTurnoData = {
                id: ultimoTurno.id,
                fecha: ultimoTurno.fecha,
                duracionMinutos: Number(ultimoTurno.duracionMinutos || 30),
                valorTotal: valorTotalCalculado,
                valorSeña: valorSeñaCalculado,
                zonasTexto: zoneNames.join(', '),
                zoneIds: matchedZoneIds,
                diffDays,
                isWithin90Days: true
              };
            }
          }
        }
      } catch (errUltimo) {
        console.error('Error fetching ultimoTurno for client:', errUltimo);
      }
    }

    return NextResponse.json({
      exists: true,
      bloqueado: false,
      client: {
        id: client.id,
        nombreCompleto: client.nombreCompleto,
        whatsapp: client.whatsapp,
        email: client.email,
        bloqueado: false
      },
      hasActiveTurno,
      activeTurno: hasActiveTurno ? client.turnos[0] : null,
      activeTurnos: client.turnos,
      ultimoTurnoData
    });

  } catch (error) {
    console.error('Error in query client:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
