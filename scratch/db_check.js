import prisma from './src/lib/db.js';

async function main() {
  const turnos = await prisma.turno.findMany({
    include: { cliente: true }
  });
  console.log("TURNOS_COUNT:", turnos.length);
  console.log("TURNOS:", JSON.stringify(turnos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
