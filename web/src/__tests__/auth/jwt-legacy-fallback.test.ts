import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateToken,
  generateLegacyToken,
  verifyToken,
  verifyLegacyToken,
  isJWTEnabled,
} from '@/lib/auth/jwt';

const USER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ORIGINAL_SECRET = process.env.JWT_SECRET;

describe('JWT vs legacy token auth', () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = ORIGINAL_SECRET;
    }
  });

  describe('when JWT_SECRET is configured', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'a'.repeat(32) + '-test-secret-value';
    });

    it('enables JWT mode', () => {
      expect(isJWTEnabled()).toBe(true);
    });

    it('accepts signed JWT tokens', () => {
      const token = generateToken(USER_ID);
      expect(token).toBeTruthy();
      const payload = verifyToken(token!);
      expect(payload?.sub).toBe(USER_ID);
    });

    it('legacy forge still verifies as legacy (unsigned)', () => {
      const forged = generateLegacyToken(USER_ID);
      expect(verifyLegacyToken(forged)).toBe(USER_ID);
      // JWT verify must reject forgeable base64 tokens
      expect(verifyToken(forged)).toBeNull();
    });
  });

  describe('auth gate contract (getUserFromToken behavior)', () => {
    it('must not accept legacy tokens while JWT is enabled', () => {
      process.env.JWT_SECRET = 'b'.repeat(32) + '-production-like-secret';
      expect(isJWTEnabled()).toBe(true);

      const forged = generateLegacyToken(USER_ID);
      // Mirror the fixed getUserFromToken gate:
      const payload = verifyToken(forged);
      let userId: string | null = null;
      if (payload) {
        userId = payload.sub;
      } else if (!isJWTEnabled()) {
        userId = verifyLegacyToken(forged);
      } else {
        userId = null;
      }
      expect(userId).toBeNull();
    });

    it('may accept legacy tokens only when JWT is disabled', () => {
      delete process.env.JWT_SECRET;
      expect(isJWTEnabled()).toBe(false);

      const forged = generateLegacyToken(USER_ID);
      const payload = verifyToken(forged);
      let userId: string | null = null;
      if (payload) {
        userId = payload.sub;
      } else if (!isJWTEnabled()) {
        userId = verifyLegacyToken(forged);
      } else {
        userId = null;
      }
      expect(userId).toBe(USER_ID);
    });
  });
});
