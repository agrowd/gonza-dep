import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        usuario: true,
        nombre: true,
        rol: true,
        email: true,
        telefono: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error('Error in GET /api/admin/usuarios:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, usuario, password, rol, email, telefono } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    if (!usuario || !usuario.trim()) {
      return NextResponse.json({ error: 'El nombre de usuario es obligatorio' }, { status: 400 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    const cleanUser = usuario.trim().toLowerCase();

    const existing = await prisma.usuario.findUnique({
      where: { usuario: cleanUser }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese nombre de usuario' }, { status: 400 });
    }

    const validRoles = ['ADMIN', 'OPERADOR', 'RECEPCION'];
    const assignedRole = validRoles.includes(rol) ? rol : 'OPERADOR';

    const hashedPassword = hashPassword(password);

    const nuevo = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        usuario: cleanUser,
        password: hashedPassword,
        rol: assignedRole,
        email: email ? email.trim() : null,
        telefono: telefono ? telefono.trim() : null
      },
      select: {
        id: true,
        usuario: true,
        nombre: true,
        rol: true,
        email: true,
        telefono: true,
        createdAt: true
      }
    });

    return NextResponse.json({ usuario: nuevo }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/usuarios:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
