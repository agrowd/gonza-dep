import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { ensureDefaultService } from '@/app/api/admin/servicios/route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Lista pública de zonas, incluyendo su servicio asociado
export async function GET(request) {
  try {
    await ensureDefaultService();

    let isAdmin = false;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session');
      isAdmin = sessionCookie ? !!verifySessionToken(sessionCookie.value) : false;
    } catch (authErr) {
      isAdmin = false;
    }

    const { searchParams } = new URL(request.url);
    const referer = request.headers.get('referer') || '';
    let isRefererFromAdmin = false;
    try {
      if (referer) {
        const refUrl = new URL(referer);
        isRefererFromAdmin = refUrl.pathname.startsWith('/admin');
      }
    } catch {
      isRefererFromAdmin = referer.includes('/admin/');
    }

    const explicitAutogestion = searchParams.get('autogestion') === 'true' || searchParams.get('public') === 'true';
    const explicitAdminCatalog = searchParams.get('admin') === 'true' || searchParams.get('includeAll') === 'true';

    // Por seguridad (D-194 / ERR-77), GET /api/zonas filtra servicios inactivos o deshabilitados para autogestión POR DEFECTO,
    // incluso si el navegador tiene cookie de sesión admin (ej. iPhone/iOS WebKit ejecutando HTML/JS cacheado viejo en `/`).
    // Solo devuelve el catálogo completo si está autenticado como admin Y solicita explícitamente `?admin=true` o viene de `/admin/*`.
    const allowFullAdminCatalog = isAdmin && !explicitAutogestion && (explicitAdminCatalog || isRefererFromAdmin);
    const isAutogestion = !allowFullAdminCatalog;

    const where = isAutogestion ? {
      servicio: {
        activo: true,
        habilitadoAutogestion: true
      }
    } : {};

    const zonas = await prisma.zona.findMany({
      where,
      include: {
        servicio: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json(zonas, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Cookie, Referer'
      }
    });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json({ error: 'Error al obtener zonas' }, { status: 500 });
  }
}

// POST: Admin crea una nueva zona/tratamiento asociado a un servicio
export async function POST(request) {
  try {
    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, precioBase, duracionMinutos, señaBase, servicioId } = body;

    if (!nombre || precioBase === undefined || duracionMinutos === undefined || señaBase === undefined) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    let targetServicioId = servicioId;
    if (!targetServicioId) {
      const defaultService = await ensureDefaultService();
      targetServicioId = defaultService?.id;
    }

    const newZona = await prisma.zona.create({
      data: {
        nombre: nombre.trim(),
        precioBase: Number(precioBase),
        duracionMinutos: Number(duracionMinutos),
        señaBase: Number(señaBase),
        servicioId: targetServicioId || null
      },
      include: {
        servicio: true
      }
    });

    return NextResponse.json(newZona, { status: 201 });
  } catch (error) {
    console.error('Error creating zone:', error);
    return NextResponse.json({ error: 'Error interno al crear zona' }, { status: 500 });
  }
}
