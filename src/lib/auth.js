import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only-123456';

/**
 * Signs a session payload with HMAC-SHA256.
 * @param {Object} payload 
 * @returns {string} Signed token
 */
export function createSessionToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('hex');
  return `${data}.${signature}`;
}

/**
 * Verifies a signed session token.
 * @param {string} token 
 * @returns {Object|null} Verified payload or null
 */
export function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('hex');

  if (signature !== expectedSignature) {
    return null; // Signature mismatch
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    return payload;
  } catch (e) {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days (3 months for operators)

/**
 * Sets or refreshes the session cookie on a NextResponse object.
 * @param {import('next/server').NextResponse} response
 * @param {string} token
 * @param {boolean} isHttps
 */
export function setSessionCookie(response, token, isHttps = true) {
  if (!response || !response.cookies) return response;
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE
  });
  return response;
}
