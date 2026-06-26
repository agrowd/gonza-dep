import prisma from './src/lib/db.js';

async function main() {
  const configs = await prisma.configuracion.findMany();
  console.log("CONFIGS:", JSON.stringify(configs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
