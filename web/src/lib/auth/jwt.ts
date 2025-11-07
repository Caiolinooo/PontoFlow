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
 */

import crypto from 'crypto';

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
}

// Token expiration: 7 days (same as before)
const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_ISSUER = 'pontoflow';

/**
 * Get JWT secret from environment
 * CRITICAL: This must be set in production!
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[JWT] CRITICAL: JWT_SECRET is not set!');
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (secret.length < 32) {
    console.error('[JWT] WARNING: JWT_SECRET is too short (minimum 32 characters)');
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  return secret;
}

/**
 * Base64URL encode (URL-safe base64)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  // Add padding if necessary
  let padded = str;
  while (padded.length % 4) {
    padded += '=';
  }

  // Replace URL-safe characters
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');

  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Create HMAC-SHA256 signature
 */
function createSignature(data: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return base64UrlEncode(hmac.digest().toString('base64'));
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string): string {
  try {
    const secret = getJWTSecret();
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
      iss: TOKEN_ISSUER
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    // Create signature
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = createSignature(dataToSign, secret);

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
 * Returns payload if valid, null if invalid/expired
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[JWT] Invalid token format: expected 3 parts');
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const secret = getJWTSecret();
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = createSignature(dataToSign, secret);

    // Timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
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
export function migrateLegacyToken(legacyToken: string): string | null {
  try {
    // Decode base64
    let decoded: string;
    try {
      decoded = Buffer.from(legacyToken, 'base64').toString('utf-8');
    } catch (error) {
      // Try browser atob as fallback
      if (typeof atob === 'function') {
        decoded = atob(legacyToken);
      } else {
        console.log('[JWT] Failed to decode legacy token');
        return null;
      }
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
    return generateToken(userId);
  } catch (error) {
    console.error('[JWT] Error migrating legacy token:', error);
    return null;
  }
}
