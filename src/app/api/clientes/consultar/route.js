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
      activeTurnos: client.turnos
    });

  } catch (error) {
    console.error('Error in query client:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
