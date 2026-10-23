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
    const {
      nombre,
      usuario,
      password,
      rol,
      email,
      telefono,
      activo,
      fechaNacimiento,
      vacacionesInicio,
      vacacionesFin,
      comisionTipo,
      comisionValor
    } = body;

    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData = {};
    if (activo !== undefined) updateData.activo = Boolean(activo);
    if (nombre !== undefined && nombre.trim()) updateData.nombre = nombre.trim();
    if (rol !== undefined) {
      const validRoles = ['ADMIN', 'OPERADOR', 'RECEPCION'];
      if (validRoles.includes(rol)) updateData.rol = rol;
    }
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (telefono !== undefined) updateData.telefono = telefono ? telefono.trim() : null;

    if (fechaNacimiento !== undefined) {
      updateData.fechaNacimiento = fechaNacimiento ? new Date(fechaNacimiento) : null;
    }
    if (vacacionesInicio !== undefined) {
      updateData.vacacionesInicio = vacacionesInicio ? new Date(vacacionesInicio) : null;
    }
    if (vacacionesFin !== undefined) {
      updateData.vacacionesFin = vacacionesFin ? new Date(vacacionesFin) : null;
    }
    if (comisionTipo !== undefined) {
      updateData.comisionTipo = comisionTipo || 'POR_TURNO';
    }
    if (comisionValor !== undefined) {
      updateData.comisionValor = comisionValor !== '' && comisionValor !== null ? Number(comisionValor) : 0;
    }

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
        activo: true,
        email: true,
        telefono: true,
        fechaNacimiento: true,
        vacacionesInicio: true,
        vacacionesFin: true,
        comisionTipo: true,
        comisionValor: true,
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
    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (userToDelete.rol === 'ADMIN') {
      const adminCount = await prisma.usuario.count({ where: { rol: 'ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'No se puede eliminar el único administrador del sistema' }, { status: 400 });
      }
    }

    // Regla de negocio: Si tiene turnos asociados en su historial, no se elimina físicamente: se bloquea/desactiva
    const turnosCount = await prisma.turno.count({ where: { operadorId: id } });

    if (turnosCount > 0) {
      await prisma.usuario.update({
        where: { id },
        data: { activo: false }
      });

      return NextResponse.json({
        success: true,
        action: 'BLOCKED',
        message: `El operador tiene ${turnosCount} turno(s) asociados en el historial. Por integridad de los registros, fue bloqueado y no aparecerá en los selectores al agendar nuevos turnos.`
      });
    }

    // Si NO tiene turnos asociados, se elimina físicamente
    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      action: 'DELETED',
      message: 'Operador eliminado correctamente del sistema.'
    });
  } catch (error) {
    console.error('Error deleting usuario:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
