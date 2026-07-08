import prisma from './db.js';

export async function cleanupExpiredPendingPayments() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000);
  try {
    const expiredCount = await prisma.turno.deleteMany({
      where: {
        estado: 'PENDIENTE_PAGO',
        createdAt: {
          lt: fifteenMinutesAgo
        },
        observaciones: {
          startsWith: '[ONLINE]'
        }
      }
    });
    if (expiredCount.count > 0) {
      console.log(`[Cleanup] Deleted ${expiredCount.count} expired online pending payment appointments.`);
    }
  } catch (err) {
    console.error('Error cleaning up expired pending payments:', err);
  }
}
