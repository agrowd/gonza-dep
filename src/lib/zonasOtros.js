export const DEFAULT_ZONAS_OTROS = [
  'Pies',
  'Cuello',
  '1/2 Brazo',
  '1/2 Pierna',
  'Cintura',
  'Nuca',
  'Ingle',
  'Hombros',
  'Laterales'
];

export function parseZonasOtrosLista(raw) {
  if (!raw) return [...DEFAULT_ZONAS_OTROS];
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(s => String(s).trim()).filter(Boolean);
    }
  } catch {}
  return [...DEFAULT_ZONAS_OTROS];
}
