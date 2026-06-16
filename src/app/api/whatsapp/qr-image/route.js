import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import { getWhatsAppStatus } from '@/lib/whatsapp.js';
import QRCode from 'qrcode';

export async function GET() {
  try {
    // Verify Admin Session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return new Response('No autorizado', { status: 401 });
    }

    const statusInfo = getWhatsAppStatus();
    if (!statusInfo.qr) {
      return new Response('No QR code available', { status: 404 });
    }

    // Generate QR code as image buffer
    const qrBuffer = await QRCode.toBuffer(statusInfo.qr, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#1D1D1D',
        light: '#FFFFFF'
      }
    });

    return new Response(qrBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error generating QR image:', error);
    return new Response('Error interno', { status: 500 });
  }
}
