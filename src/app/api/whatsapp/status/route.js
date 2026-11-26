import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import { getWhatsAppStatus, checkRelayStatus, triggerRelayAction } from '@/lib/whatsapp.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Refresh live status & QR from central ia-gonzadep instance (port 3007)
    await checkRelayStatus(true);

    // 3. Return unified status (never launches a competing local Chromium)
    const statusInfo = getWhatsAppStatus();
    return NextResponse.json(statusInfo);
  } catch (error) {
    console.error('Error in WhatsApp status API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'INITIALIZE';
    const result = await triggerRelayAction(action);
    const statusInfo = getWhatsAppStatus();

    return NextResponse.json({ ...statusInfo, ...result });
  } catch (error) {
    console.error('Error in WhatsApp status POST API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
