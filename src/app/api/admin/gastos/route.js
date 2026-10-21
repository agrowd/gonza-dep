import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Current date in Argentina UTC-3
    const now = new Date();
    const offsetBuenosAires = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowLocal = new Date(utc + (3600000 * offsetBuenosAires));

    const yearParam = searchParams.get('anio') || searchParams.get('year');
    const monthParam = searchParams.get('mes') || searchParams.get('month');

    const year = yearParam ? parseInt(yearParam, 10) : nowLocal.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : nowLocal.getMonth() + 1; // 1-12

    // Current month bounds
    const monthStr = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const lastDayStr = String(daysInMonth).padStart(2, '0');

    const startOfMonth = new Date(`${year}-${monthStr}-01T00:00:00.000Z`);
    const endOfMonth = new Date(`${year}-${monthStr}-${lastDayStr}T23:59:59.999Z`);

    // Previous month bounds (for comparison)
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const prevLastDayStr = String(daysInPrevMonth).padStart(2, '0');

    const startOfPrevMonth = new Date(`${prevYear}-${prevMonthStr}-01T00:00:00.000Z`);
    const endOfPrevMonth = new Date(`${prevYear}-${prevMonthStr}-${prevLastDayStr}T23:59:59.999Z`);

    // Fetch in parallel:
    // 1. Gastos del mes actual
    // 2. Gastos del mes anterior
    // 3. Turnos realizados en el mes (para saldo de sesión en fecha de turno)
    // 4. Señas cobradas en el mes (en fecha de createdAt)
    // 5. Categorías
    const [
      gastosMes,
      gastosMesAnterior,
      turnosMesFecha,
      turnosMesCreated,
      categorias
    ] = await Promise.all([
      prisma.gasto.findMany({
        where: {
          fecha: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        include: {
          categoria: true
        },
        orderBy: [
          { fecha: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.gasto.findMany({
        where: {
          fecha: {
            gte: startOfPrevMonth,
            lte: endOfPrevMonth
          }
        }
      }),
      prisma.turno.findMany({
        where: {
          fecha: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      prisma.turno.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      prisma.categoriaGasto.findMany({
        orderBy: { nombre: 'asc' }
      })
    ]);

    // Totales de gastos
    const totalGastosMes = gastosMes.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
    const totalGastosMesAnterior = gastosMesAnterior.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

    let variacionPorcentual = 0;
    if (totalGastosMesAnterior > 0) {
      variacionPorcentual = ((totalGastosMes - totalGastosMesAnterior) / totalGastosMesAnterior) * 100;
    } else if (totalGastosMes > 0) {
      variacionPorcentual = 100;
    }

    // Desglose por categoría
    const categoriaMap = {};
    categorias.forEach(cat => {
      categoriaMap[cat.id] = {
        id: cat.id,
        nombre: cat.nombre,
        color: cat.color || '#64748b',
        total: 0,
        cantidad: 0,
        porcentaje: 0
      };
    });

    gastosMes.forEach(g => {
      const catId = g.categoriaId;
      if (!categoriaMap[catId]) {
        categoriaMap[catId] = {
          id: catId,
          nombre: g.categoria?.nombre || 'Sin categoría',
          color: g.categoria?.color || '#64748b',
          total: 0,
          cantidad: 0,
          porcentaje: 0
        };
      }
      categoriaMap[catId].total += (Number(g.monto) || 0);
      categoriaMap[catId].cantidad += 1;
    });

    const desgloseCategorias = Object.values(categoriaMap)
      .map(c => ({
        ...c,
        porcentaje: totalGastosMes > 0 ? Number(((c.total / totalGastosMes) * 100).toFixed(1)) : 0
      }))
      .filter(c => c.total > 0 || c.cantidad > 0)
      .sort((a, b) => b.total - a.total);

    // ==========================================
    // ENTRADAS DEL MES (REVENUE ACCOUNTING RULE)
    // Saldos de turnos realizados: en fecha de sesión
    // Señas: en fecha de creación (createdAt)
    // ==========================================
    const isCompletedSession = (t) => {
      if (!t || t.estado === 'CANCELADO' || t.estado === 'NO_ASISTIO' || t.estado === 'BLOQUEADO') {
        return false;
      }
      return t.estado === 'REALIZADO';
    };

    // Entradas por turnos completados en el mes
    const entradasTurnosMes = turnosMesFecha
      .filter(t => isCompletedSession(t))
      .reduce((acc, t) => acc + Math.max(0, (Number(t.valorTotal) || 0) - (Number(t.valorSeña) || 0) - (Number(t.bonificacion) || 0)), 0);

    // Entradas por señas recibidas en el mes
    const entradasSenasMes = turnosMesCreated
      .filter(t => (Number(t.valorSeña) || 0) > 0 && t.estado !== 'CANCELADO')
      .reduce((acc, t) => acc + (Number(t.valorSeña) || 0), 0);

    const totalEntradasMes = entradasTurnosMes + entradasSenasMes;
    const balanceNeto = totalEntradasMes - totalGastosMes;

    // ==========================================
    // BALANCE DÍA A DÍA
    // ==========================================
    const balanceDiario = [];

    // Mapas diarios
    const gastosPorDia = {};
    gastosMes.forEach(g => {
      const d = new Date(g.fecha);
      const dayNum = d.getUTCDate();
      gastosPorDia[dayNum] = (gastosPorDia[dayNum] || 0) + (Number(g.monto) || 0);
    });

    const entradasTurnosPorDia = {};
    turnosMesFecha
      .filter(t => isCompletedSession(t))
      .forEach(t => {
        const d = new Date(t.fecha);
        const dayNum = d.getUTCDate();
        const neto = Math.max(0, (Number(t.valorTotal) || 0) - (Number(t.valorSeña) || 0) - (Number(t.bonificacion) || 0));
        entradasTurnosPorDia[dayNum] = (entradasTurnosPorDia[dayNum] || 0) + neto;
      });

    const entradasSenasPorDia = {};
    turnosMesCreated
      .filter(t => (Number(t.valorSeña) || 0) > 0 && t.estado !== 'CANCELADO')
      .forEach(t => {
        const d = new Date(t.createdAt);
        const dayNum = d.getUTCDate();
        entradasSenasPorDia[dayNum] = (entradasSenasPorDia[dayNum] || 0) + (Number(t.valorSeña) || 0);
      });

    for (let day = 1; day <= daysInMonth; day++) {
      const g = gastosPorDia[day] || 0;
      const eTurno = entradasTurnosPorDia[day] || 0;
      const eSena = entradasSenasPorDia[day] || 0;
      const eTotal = eTurno + eSena;
      const bal = eTotal - g;

      const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
      balanceDiario.push({
        dia: day,
        fecha: dateStr,
        entradasTurnos: eTurno,
        entradasSenas: eSena,
        entradas: eTotal,
        gastos: g,
        balance: bal
      });
    }

    return NextResponse.json({
      mes: month,
      anio: year,
      totales: {
        totalGastosMes,
        totalGastosMesAnterior,
        variacionPorcentual: Number(variacionPorcentual.toFixed(1)),
        entradasTurnosMes,
        entradasSenasMes,
        totalEntradasMes,
        balanceNeto
      },
      desgloseCategorias,
      gastos: gastosMes.map(g => ({
        id: g.id,
        concepto: g.concepto,
        monto: Number(g.monto) || 0,
        fecha: g.fecha.toISOString().split('T')[0],
        fechaIso: g.fecha.toISOString(),
        categoriaId: g.categoriaId,
        categoriaNombre: g.categoria?.nombre || 'General',
        categoriaColor: g.categoria?.color || '#64748b',
        observaciones: g.observaciones || ''
      })),
      balanceDiario
    });
  } catch (error) {
    console.error('Error in GET /api/admin/gastos:', error);
    return NextResponse.json({ error: 'Error interno del servidor al consultar gastos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { concepto, monto, fecha, categoriaId, observaciones } = body;

    if (!concepto || !concepto.trim()) {
      return NextResponse.json({ error: 'El concepto del gasto es requerido.' }, { status: 400 });
    }

    const numericMonto = parseFloat(monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo.' }, { status: 400 });
    }

    if (!categoriaId) {
      return NextResponse.json({ error: 'Debe seleccionar una categoría para el gasto.' }, { status: 400 });
    }

    const categoryExists = await prisma.categoriaGasto.findUnique({
      where: { id: categoriaId }
    });
    if (!categoryExists) {
      return NextResponse.json({ error: 'La categoría seleccionada no existe.' }, { status: 400 });
    }

    let parsedFecha;
    if (fecha) {
      parsedFecha = new Date(fecha.includes('T') ? fecha : `${fecha}T12:00:00.000Z`);
    } else {
      parsedFecha = new Date();
    }

    const nuevoGasto = await prisma.gasto.create({
      data: {
        concepto: concepto.trim(),
        monto: numericMonto,
        fecha: parsedFecha,
        categoriaId,
        observaciones: observaciones?.trim() || null
      },
      include: {
        categoria: true
      }
    });

    return NextResponse.json({
      gasto: {
        id: nuevoGasto.id,
        concepto: nuevoGasto.concepto,
        monto: nuevoGasto.monto,
        fecha: nuevoGasto.fecha.toISOString().split('T')[0],
        categoriaId: nuevoGasto.categoriaId,
        categoriaNombre: nuevoGasto.categoria?.nombre || 'General',
        categoriaColor: nuevoGasto.categoria?.color || '#64748b',
        observaciones: nuevoGasto.observaciones || ''
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/gastos:', error);
    return NextResponse.json({ error: 'Error al registrar el gasto.' }, { status: 500 });
  }
}
