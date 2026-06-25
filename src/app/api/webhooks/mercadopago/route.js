import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { mpPayment } from '@/lib/mercadopago.js';
import { sendConfirmationEmail } from '@/lib/email.js';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // MercadoPago sends query params or body depending on the event
    const topic = searchParams.get('topic') || searchParams.get('type');
    const id = searchParams.get('id');

    let paymentId = id;
    let eventType = topic;

    // Check if it's in the body
    try {
      const body = await request.json();
      if (body && body.type) {
        eventType = body.type;
        paymentId = body.data?.id || body.id;
      }
    } catch (e) {
      // Body is empty or not JSON, fallback to query params
    }

    if (eventType === 'payment' && paymentId) {
      console.log(`MercadoPago Webhook: Processing payment ${paymentId}...`);
      
      // Fetch payment details from MercadoPago API
      const payment = await mpPayment.get({ id: paymentId });
      
      const status = payment.status;
      const metadata = payment.metadata;

      // When creating preference, we save the turnoId in metadata: { turno_id: "xxx" }
      const turnoId = metadata?.turno_id;

      if (turnoId && status === 'approved') {
        console.log(`MercadoPago Webhook: Payment approved for Turno ${turnoId}. Amount: $${payment.transaction_amount}`);
        
        // 1. Fetch Turno from DB
        const turno = await prisma.turno.findUnique({
          where: { id: turnoId },
          include: { cliente: true }
        });

        if (turno) {
          // Calculate values
          const valorSeña = payment.transaction_amount || turno.valorSeña;
          const saldoPendiente = Math.max(0, turno.valorTotal - valorSeña);

          // 2. Update Turno in DB
          const updatedTurno = await prisma.turno.update({
            where: { id: turnoId },
            data: {
              estado: 'SEÑADO', // Confirm automatically!
              valorSeña,
              saldoPendiente
            },
            include: {
              cliente: true
            }
          });

          // 3. Create Notification alert in database for Gonzalo/Luciano
          await prisma.notificacion.create({
            data: {
              clienteId: updatedTurno.clienteId,
              turnoId: updatedTurno.id,
              canal: 'WHATSAPP', // log type
              mensaje: `Reserva online confirmada automáticamente para ${updatedTurno.cliente.nombreCompleto} (Seña de $${valorSeña} aprobada).`,
              estado: 'ENVIADO'
            }
          });

          // 4. Send confirmation email to client
          try {
            await sendConfirmationEmail(
              updatedTurno.cliente.email,
              updatedTurno.cliente.nombreCompleto,
              {
                fecha: updatedTurno.fecha,
                horaInicio: updatedTurno.horaInicio,
                zonas: updatedTurno.zonas,
                valorSeña: updatedTurno.valorSeña,
                valorTotal: updatedTurno.valorTotal
              }
            );

            // Log email sending to DB
            await prisma.notificacion.create({
              data: {
                clienteId: updatedTurno.clienteId,
                turnoId: updatedTurno.id,
                canal: 'EMAIL',
                mensaje: `Confirmación de turno enviada por email al confirmarse la seña.`,
                estado: 'ENVIADO'
              }
            });
          } catch (mailError) {
            console.error('Failed to send confirmation email on MP approval:', mailError);
            // Log failure to DB
            await prisma.notificacion.create({
              data: {
                clienteId: updatedTurno.clienteId,
                turnoId: updatedTurno.id,
                canal: 'EMAIL',
                mensaje: `Fallo al enviar email de confirmación: ${mailError.message}`,
                estado: 'FALLIDO'
              }
            });
          }

          console.log(`MercadoPago Webhook: Turno ${turnoId} confirmed automatically as SEÑADO.`);
        } else {
          console.warn(`MercadoPago Webhook: Turno ${turnoId} not found in database.`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error in MercadoPago webhook:', error);
    // Always return 200/201 to MercadoPago to prevent repeated retries on error
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
