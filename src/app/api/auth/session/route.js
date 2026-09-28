import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, createSessionToken, setSessionCookie } from '@/lib/auth.js';

export async function GET(request) {
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

    const response = NextResponse.json({
      authenticated: true,
      user: {
        usuario: payload.usuario,
        nombre: payload.nombre,
        rol: payload.rol
      }
    });

    // Rolling session: refresh cookie with fresh 90-day expiration
    const isHttps = request?.headers?.get('x-forwarded-proto') === 'https' || request?.url?.startsWith('https:');
    const freshToken = createSessionToken(payload);
    setSessionCookie(response, freshToken, isHttps);

    return response;
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
