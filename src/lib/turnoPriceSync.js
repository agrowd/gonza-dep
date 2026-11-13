import { calculateTurnDetails } from './calculations.js';

/**
 * Sincroniza los precios de turnos activos futuros (SEÑADO, REPROGRAMADO, PENDIENTE_PAGO, PENDIENTE_AUTORIZACION)
 * según los precios vigentes del catálogo de Zonas.
 *
 * Los turnos históricos (REALIZADO, CANCELADO, NO_ASISTIO) NUNCA se modifican (D-25).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string|null} targetTurnoId Opcional: ID de un turno puntual a sincronizar.
 * @returns {Promise<{ updatedCount: number, updatedTurnos: Array }>}
 */
export async function syncActiveFutureTurnosPrices(prisma, targetTurnoId = null) {
  try {
    const zones = await prisma.zona.findMany();
    if (!zones || zones.length === 0) {
      return { updatedCount: 0, updatedTurnos: [] };
    }

    const whereClause = {
      estado: { in: ['SEÑADO', 'REPROGRAMADO', 'PENDIENTE_PAGO', 'PENDIENTE_AUTORIZACION'] }
    };

    if (targetTurnoId) {
      whereClause.id = targetTurnoId;
    }

    const turnos = await prisma.turno.findMany({
      where: whereClause
    });

    const updatedTurnos = [];

    for (const turno of turnos) {
      let parsedZones = [];
      let isJsonArray = false;
      try {
        if (typeof turno.zonas === 'string') {
          const trimmed = turno.zonas.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            const raw = JSON.parse(trimmed);
            parsedZones = Array.isArray(raw) ? raw : [raw];
            isJsonArray = true;
          } else {
            parsedZones = trimmed.split(',').map(s => ({ nombre: s.trim() }));
          }
        } else if (Array.isArray(turno.zonas)) {
          parsedZones = turno.zonas;
          isJsonArray = true;
        }
      } catch {
        parsedZones = [];
      }

      const matchedZoneObjs = [];
      const matchedZoneIds = new Set();
      let hasOtros = false;
      let otrosTexto = '';
      let otrosPrecio = 0;

      for (const pz of parsedZones) {
        if (!pz) continue;
        const zId = pz.id;
        const zName = typeof pz === 'string' ? pz : (pz.nombre || pz.name || '');

        if (zId === 'otros' || (zName && zName.toLowerCase().startsWith('otros:'))) {
          hasOtros = true;
          otrosTexto = zName;
          otrosPrecio = Number(pz.precio || 0);
          continue;
        }

        const matched = zones.find(z =>
          (zId && String(z.id) === String(zId)) ||
          (zName && z.nombre && z.nombre.trim().toLowerCase() === zName.trim().toLowerCase())
        );

        if (matched && !matchedZoneIds.has(matched.id)) {
          matchedZoneIds.add(matched.id);
          matchedZoneObjs.push(matched);
        }
      }

      // Fallback si no hubo match directo
      if (matchedZoneObjs.length === 0) {
        const fullText = (typeof turno.zonas === 'string' ? turno.zonas : JSON.stringify(turno.zonas || '')).toLowerCase();
        for (const z of zones) {
          if (z.nombre && fullText.includes(z.nombre.toLowerCase().trim())) {
            if (!matchedZoneIds.has(z.id)) {
              matchedZoneIds.add(z.id);
              matchedZoneObjs.push(z);
            }
          }
        }
      }

      const calcs = calculateTurnDetails(matchedZoneObjs, false);
      const currentBaseTotal = calcs.valorTotal + otrosPrecio;

      let newValorTotal = currentBaseTotal;
      let newBonificacion = 0;
      const hasDiscount = turno.descuentoTipo && turno.descuentoTipo !== 'NINGUNO' && turno.descuentoTipo !== 'SIN_DESCUENTO';

      if (hasDiscount) {
        if (turno.descuentoTipo === 'PORCENTAJE' && Number(turno.descuentoValor) > 0) {
          const rawDiscounted = currentBaseTotal * (1 - Number(turno.descuentoValor) / 100);
          newValorTotal = Math.max(0, Math.round(rawDiscounted / 1000) * 1000);
          newBonificacion = Math.max(0, currentBaseTotal - newValorTotal);
        } else if (turno.descuentoTipo === 'PESOS' && Number(turno.descuentoValor) > 0) {
          newBonificacion = Math.min(currentBaseTotal, Number(turno.descuentoValor));
          newValorTotal = Math.max(0, currentBaseTotal - newBonificacion);
        } else if (Number(turno.bonificacion) > 0) {
          const storedBase = Number(turno.valorTotal || 0) + Number(turno.bonificacion || 0);
          if (storedBase > 0) {
            const impliedPct = Math.round((Number(turno.bonificacion) / storedBase) * 100);
            if (impliedPct > 0 && impliedPct < 100) {
              const rawDiscounted = currentBaseTotal * (1 - impliedPct / 100);
              newValorTotal = Math.max(0, Math.round(rawDiscounted / 1000) * 1000);
              newBonificacion = Math.max(0, currentBaseTotal - newValorTotal);
            } else {
              newBonificacion = Math.min(currentBaseTotal, Number(turno.bonificacion));
              newValorTotal = Math.max(0, currentBaseTotal - newBonificacion);
            }
          }
        }
      }

      // Reconstruir array de zonas con los precios de catálogo vigentes
      let newZonasString = turno.zonas;
      if (isJsonArray && matchedZoneObjs.length > 0) {
        const updatedZonasArr = matchedZoneObjs.map(z => ({
          id: z.id,
          nombre: z.nombre,
          precio: z.precioBase,
          duracion: z.duracionMinutos
        }));
        if (hasOtros) {
          updatedZonasArr.push({
            id: 'otros',
            nombre: otrosTexto || 'Otros',
            precio: otrosPrecio,
            duracion: 0
          });
        }
        newZonasString = JSON.stringify(updatedZonasArr);
      }

      const storedValorTotal = Number(turno.valorTotal || 0);
      const storedBonificacion = Number(turno.bonificacion || 0);
      const storedSaldo = Number(turno.saldoPendiente || 0);
      const newSaldo = Math.max(0, newValorTotal - Number(turno.valorSeña || 0));

      const isChanged =
        storedValorTotal !== newValorTotal ||
        storedBonificacion !== newBonificacion ||
        storedSaldo !== newSaldo ||
        newZonasString !== turno.zonas;

      if (isChanged) {
        await prisma.turno.update({
          where: { id: turno.id },
          data: {
            valorTotal: newValorTotal,
            bonificacion: newBonificacion,
            saldoPendiente: newSaldo,
            zonas: newZonasString
          }
        });

        updatedTurnos.push({
          id: turno.id,
          clienteId: turno.clienteId,
          oldTotal: storedValorTotal,
          newTotal: newValorTotal,
          diff: newValorTotal - storedValorTotal
        });
      }
    }

    return { updatedCount: updatedTurnos.length, updatedTurnos };
  } catch (error) {
    console.error('Error in syncActiveFutureTurnosPrices:', error);
    return { updatedCount: 0, updatedTurnos: [], error };
  }
}
