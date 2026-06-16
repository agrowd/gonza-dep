import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import { getWhatsAppStatus, initWhatsAppClient } from '@/lib/whatsapp.js';

export async function GET() {
  try {
    // 1. Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Fetch current status
    const statusInfo = getWhatsAppStatus();

    // 3. Proactively initialize if disconnected
    if (statusInfo.status === 'DISCONNECTED') {
      initWhatsAppClient();
      // Update status info after trigger
      const updated = getWhatsAppStatus();
      return NextResponse.json(updated);
    }

    return NextResponse.json(statusInfo);
  } catch (error) {
    console.error('Error in WhatsApp status API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
