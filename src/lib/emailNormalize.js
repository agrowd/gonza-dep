/**
 * Utilidades de normalización y búsqueda tolerante de correos electrónicos (D-173).
 *
 * - Ignora mayúsculas/minúsculas y espacios laterales.
 * - Para dominios Gmail / Googlemail, aplica equivalencia canónica sin puntos en el usuario
 *   (ej: "gaston.javier.lanata@gmail.com" === "gastonjavierlanata@gmail.com").
 */

export function normalizeEmailBasic(email) {
  return String(email || '').trim().toLowerCase();
}

export function canonicalizeEmail(email) {
  const cleaned = normalizeEmailBasic(email);
  const atIdx = cleaned.lastIndexOf('@');
  if (atIdx <= 0) return cleaned;

  const local = cleaned.slice(0, atIdx);
  const domain = cleaned.slice(atIdx + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localNoDots = local.replace(/\./g, '');
    return `${localNoDots}@gmail.com`;
  }

  return `${local}@${domain}`;
}

export function emailsMatch(emailA, emailB) {
  const normA = normalizeEmailBasic(emailA);
  const normB = normalizeEmailBasic(emailB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return canonicalizeEmail(normA) === canonicalizeEmail(normB);
}

/**
 * Busca un cliente por correo tolerando mayúsculas, espacios y puntos en cuentas Gmail.
 * Funciona de forma compatible tanto en PostgreSQL (producción/staging) como en SQLite (local).
 */
export async function findClientByEmail(prisma, rawEmail, include = undefined) {
  const cleaned = normalizeEmailBasic(rawEmail);
  if (!cleaned || !cleaned.includes('@')) return null;

  const canonical = canonicalizeEmail(cleaned);
  const isPostgres = Boolean(
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
  );

  // 1. Búsqueda directa exacta (rápida)
  let client = null;
  if (isPostgres) {
    client = await prisma.cliente.findFirst({
      where: {
        email: { equals: cleaned, mode: 'insensitive' }
      },
      ...(include ? { include } : {})
    });
  } else {
    client = await prisma.cliente.findFirst({
      where: {
        email: { equals: cleaned }
      },
      ...(include ? { include } : {})
    });
  }

  if (client) return client;

  // 2. Búsqueda canónica (espacios laterales en BD, mayúsculas en SQLite, y puntos en Gmail)
  if (isPostgres) {
    try {
      const [canonLocal, canonDomain] = canonical.split('@');
      let rows = [];
      if (canonDomain === 'gmail.com') {
        rows = await prisma.$queryRawUnsafe(
          `SELECT id FROM "Cliente"
           WHERE LOWER(TRIM(email)) = $1
              OR (
                LOWER(SPLIT_PART(TRIM(email), '@', 2)) IN ('gmail.com', 'googlemail.com')
                AND REPLACE(LOWER(SPLIT_PART(TRIM(email), '@', 1)), '.', '') = $2
              )
           LIMIT 1`,
          cleaned,
          canonLocal
        );
      } else {
        rows = await prisma.$queryRawUnsafe(
          `SELECT id FROM "Cliente" WHERE LOWER(TRIM(email)) = $1 LIMIT 1`,
          cleaned
        );
      }

      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.id) {
        return await prisma.cliente.findUnique({
          where: { id: rows[0].id },
          ...(include ? { include } : {})
        });
      }
    } catch (pgErr) {
      console.warn('[emailNormalize] PostgreSQL canonical query fallback:', pgErr.message);
    }
  }

  // Fallback universal (SQLite o si el raw query fallara)
  try {
    const candidates = await prisma.cliente.findMany({
      select: { id: true, email: true }
    });
    const matched = candidates.find(c => emailsMatch(c.email, cleaned));
    if (matched) {
      return await prisma.cliente.findUnique({
        where: { id: matched.id },
        ...(include ? { include } : {})
      });
    }
  } catch (fbErr) {
    console.error('[emailNormalize] Fallback lookup error:', fbErr.message);
  }

  return null;
}
