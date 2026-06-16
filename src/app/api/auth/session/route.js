import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = verifySessionToken(sessionCookie.value);

    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        usuario: payload.usuario,
        nombre: payload.nombre,
        rol: payload.rol
      }
    });
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
