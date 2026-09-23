/**
 * JWT Authentication Library
 *
 * Replaces base64 tokens with secure JWT tokens using HMAC-SHA256
 *
 * Security Features:
 * - HMAC-SHA256 signature
 * - Expiration validation
 * - Issuer validation
 * - Type-safe payload
 * - Edge Runtime compatible (No Node.js polyfills needed)
 */

// JWT Header (Base64URL encoded)
interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

// JWT Payload
export interface JWTPayload {
  sub: string; // Subject (user ID)
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration (timestamp)
  iss: string; // Issuer
  // Login-time snapshot claims: let middleware resolve the user without DB roundtrips.
  role?: string;
  tenant_id?: string;
  email?: string;
  name?: string;
}

// Token expiration: 7 days (same as before)
const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_ISSUER = 'pontoflow';

/**
 * Get JWT secret from environment
 * Returns null if not configured (allows fallback to legacy mode)
 */
function getJWTSecret(): string | null {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.warn('[JWT] WARNING: JWT_SECRET is not set! Using legacy base64 tokens (INSECURE)');
    return null;
  }

  if (secret.length < 32) {
    console.error('[JWT] WARNING: JWT_SECRET is too short (minimum 32 characters)');
    return null;
  }

  return secret;
}

/**
 * Check if JWT is enabled (JWT_SECRET is configured)
 */
export function isJWTEnabled(): boolean {
  return getJWTSecret() !== null;
}

/**
 * Base64URL encode (URL-safe base64) - Edge compatible
 */
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  // Optimization for large strings
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode - Edge compatible
 */
function base64UrlDecode(str: string): string {
  let padded = str;
  while (padded.length % 4) {
    padded += '=';
  }
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 */
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const bytes = new Uint8Array(signatureBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Constant time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate JWT token for user
 * Returns null if JWT_SECRET is not configured (caller should use legacy method)
 */
export async function generateToken(
  userId: string,
  claims?: { role?: string; tenant_id?: string; email?: string; name?: string }
): Promise<string | null> {
  try {
    const secret = getJWTSecret();

    // Fallback to legacy mode if no secret configured
    if (!secret) {
      return null;
    }

    const now = Date.now();

    // Create header
    const header: JWTHeader = {
      alg: 'HS256',
      typ: 'JWT'
    };

    // Create payload
    const payload: JWTPayload = {
      sub: userId,
      iat: Math.floor(now / 1000), // JWT standard uses seconds
      exp: Math.floor((now + TOKEN_EXPIRATION_MS) / 1000),
      iss: TOKEN_ISSUER,
      ...claims
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    // Create signature
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = await createSignature(dataToSign, secret);

    // Return complete JWT
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    console.log('[JWT] Generated token for user:', userId);
    return token;
  } catch (error) {
    console.error('[JWT] Error generating token:', error);
    throw error;
  }
}

/**
 * Verify and decode JWT token
 * Returns payload if valid, null if invalid/expired or JWT not configured
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // Check if JWT is enabled
    const secret = getJWTSecret();
    if (!secret) {
      // JWT not configured, caller should use legacy verification
      return null;
    }

    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[JWT] Invalid token format: expected 3 parts');
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await createSignature(dataToSign, secret);

    // Timing-safe comparison to prevent timing attacks
    if (!constantTimeEqual(signature, expectedSignature)) {
      console.log('[JWT] Invalid signature');
      return null;
    }

    // Decode payload
    let payload: JWTPayload;
    try {
      const decodedPayload = base64UrlDecode(encodedPayload);
      payload = JSON.parse(decodedPayload);
    } catch (error) {
      console.log('[JWT] Failed to decode payload:', error);
      return null;
    }

    // Validate payload structure
    if (!payload.sub || !payload.iat || !payload.exp || !payload.iss) {
      console.log('[JWT] Invalid payload structure');
      return null;
    }

    // Verify issuer
    if (payload.iss !== TOKEN_ISSUER) {
      console.log('[JWT] Invalid issuer:', payload.iss);
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.log('[JWT] Token expired');
      return null;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.sub)) {
      console.log('[JWT] Invalid user ID format:', payload.sub);
      return null;
    }

    console.log('[JWT] Token verified for user:', payload.sub);
    return payload;
  } catch (error) {
    console.error('[JWT] Error verifying token:', error);
    return null;
  }
}

/**
 * Check if token is expired (without full verification)
 * Useful for client-side checks
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const [, encodedPayload] = parts;
    const decodedPayload = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(decodedPayload) as JWTPayload;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (error) {
    return true;
  }
}

/**
 * Decode token without verification (unsafe - for debugging only)
 */
export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [, encodedPayload] = parts;
    const decodedPayload = base64UrlDecode(encodedPayload);
    return JSON.parse(decodedPayload) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Migrate old base64 token to JWT
 * Used during migration period (Option B - immediate)
 *
 * @param legacyToken Old base64 token (format: "userId:timestamp")
 * @returns New JWT token or null if invalid
 */
export async function migrateLegacyToken(legacyToken: string): Promise<string | null> {
  try {
    // Decode base64
    let decoded: string;
    try {
      const binary = atob(legacyToken);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      decoded = decoder.decode(bytes);
    } catch (error) {
      console.log('[JWT] Failed to decode legacy token');
      return null;
    }

    // Parse userId from legacy format
    const parts = decoded.split(':');
    if (parts.length !== 2) {
      console.log('[JWT] Invalid legacy token format');
      return null;
    }

    const [userId] = parts;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('[JWT] Invalid user ID in legacy token');
      return null;
    }

    // Generate new JWT
    console.log('[JWT] Migrating legacy token for user:', userId);
    return await generateToken(userId);
  } catch (error) {
    console.error('[JWT] Error migrating legacy token:', error);
    return null;
  }
}

// ==========================================
// LEGACY FALLBACK (Base64 tokens - INSECURE)
// ==========================================
// These functions are used when JWT_SECRET is not configured
// WARNING: These tokens are NOT SECURE and can be easily forged!

/**
 * Generate legacy base64 token (INSECURE - for fallback only)
 * @deprecated Use JWT tokens instead
 */
export function generateLegacyToken(userId: string): string {
  const token = `${userId}:${Date.now()}`;
  return btoa(token);
}

/**
 * Verify legacy base64 token (INSECURE - for fallback only)
 * @deprecated Use JWT tokens instead
 * Returns userId if valid, null if invalid/expired
 */
export function verifyLegacyToken(token: string): string | null {
  try {
    // Decode base64
    let decoded: string;
    try {
      const binary = atob(token);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      decoded = decoder.decode(bytes);
    } catch (error) {
      console.log('[Legacy] Failed to decode base64 token');
      return null;
    }

    // Parse userId and timestamp
    const parts = decoded.split(':');
    if (parts.length !== 2) {
      console.log('[Legacy] Invalid token format');
      return null;
    }

    const [userId, timestamp] = parts;
    const timestampNum = parseInt(timestamp);

    if (!userId || !timestamp || isNaN(timestampNum)) {
      console.log('[Legacy] Invalid token format');
      return null;
    }

    // Check if token is too old (7 days)
    const tokenAge = Date.now() - timestampNum;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    if (tokenAge > maxAge) {
      console.log('[Legacy] Token expired');
      return null;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('[Legacy] Invalid user ID format:', userId);
      return null;
    }

    return userId;
  } catch (error) {
    console.error('[Legacy] Error verifying token:', error);
    return null;
  }
}
