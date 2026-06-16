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
