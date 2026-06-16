import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import { logoutWhatsApp } from '@/lib/whatsapp.js';

export async function POST() {
  try {
    // 1. Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Perform logout
    await logoutWhatsApp();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in WhatsApp logout API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
