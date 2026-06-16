import { NextResponse } from 'next/server';
import prisma from '@/lib/db.js';
import { mpPayment } from '@/lib/mercadopago.js';

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
          await prisma.turno.update({
            where: { id: turnoId },
            data: {
              estado: 'PENDIENTE_AUTORIZACION',
              valorSeña,
              saldoPendiente
            }
          });

          // 3. Create Notification alert in database for Gonzalo/Luciano
          await prisma.notificacion.create({
            data: {
              clienteId: turno.clienteId,
              canal: 'WHATSAPP', // log type
              mensaje: `Nueva reserva online de ${turno.cliente.nombreCompleto} pendiente de autorización (Seña de $${valorSeña} aprobada).`,
              estado: 'ENVIADO' // status in dashboard
            }
          });

          console.log(`MercadoPago Webhook: Turno ${turnoId} updated to PENDIENTE_AUTORIZACION.`);
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
