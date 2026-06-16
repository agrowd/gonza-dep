import { PrismaClient } from '@prisma/client';

let prisma;

const isPostgres =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') ||
    process.env.DATABASE_URL.startsWith('postgresql://'));

if (isPostgres) {
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const pg = await import('pg');
  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
  prisma = new PrismaClient({ adapter });
}

export default prisma;
