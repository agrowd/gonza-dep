import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json({ success: true });
  const isHttps = request ? (request.headers.get('x-forwarded-proto') === 'https' || request.url?.startsWith('https:')) : false;

  // Clear cookie with dynamic protocol (works seamlessly on both HTTP staging and HTTPS production)
  response.cookies.set({
    name: 'session',
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });

  // Also call Next.js delete for maximum compatibility
  response.cookies.delete('session');

  return response;
}
