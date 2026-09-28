import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db.js';
import { createSessionToken, setSessionCookie } from '@/lib/auth.js';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request) {
  try {
    const { password, usuario = 'admin' } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Contraseña requerida' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);

    // Find the user (default to 'admin' or specified username)
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { usuario: usuario },
          { rol: 'ADMIN' }
        ]
      }
    });

    if (!user || user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken({
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol
      }
    });

    // Set 90-day persistent session cookie
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https:');
    setSessionCookie(response, token, isHttps);

    return response;
  } catch (error) {
    console.error('Error in quick-reauth API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
