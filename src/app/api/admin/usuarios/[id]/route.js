import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function PUT(request, context) {
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

    const { id } = await context.params;
    const body = await request.json();
    const { nombre, usuario, password, rol, email, telefono } = body;

    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData = {};
    if (nombre !== undefined && nombre.trim()) updateData.nombre = nombre.trim();
    if (rol !== undefined) {
      const validRoles = ['ADMIN', 'OPERADOR', 'RECEPCION'];
      if (validRoles.includes(rol)) updateData.rol = rol;
    }
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (telefono !== undefined) updateData.telefono = telefono ? telefono.trim() : null;

    if (usuario !== undefined && usuario.trim()) {
      const cleanUser = usuario.trim().toLowerCase();
      if (cleanUser !== user.usuario) {
        const existing = await prisma.usuario.findUnique({ where: { usuario: cleanUser } });
        if (existing) {
          return NextResponse.json({ error: 'Ya existe otro usuario con ese nombre de usuario' }, { status: 400 });
        }
        updateData.usuario = cleanUser;
      }
    }

    if (password && password.trim().length >= 4) {
      updateData.password = hashPassword(password.trim());
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ usuario: updated });
  } catch (error) {
    console.error('Error updating usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
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

    const { id } = await context.params;

    // Prevent deleting own account
    if (session.id === id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta de usuario en uso' }, { status: 400 });
    }

    // Prevent deleting the last ADMIN
    const userToDelete = await prisma.usuario.findUnique({ where: { id } });
    if (userToDelete && userToDelete.rol === 'ADMIN') {
      const adminCount = await prisma.usuario.count({ where: { rol: 'ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'No se puede eliminar el único administrador del sistema' }, { status: 400 });
      }
    }

    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting usuario:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
