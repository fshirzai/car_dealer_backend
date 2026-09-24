'use strict';

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../../../utils/jwt');
const { generateRandomToken, hashToken } = require('../../../utils/crypto');

describe('Auth utilities', () => {
  describe('JWT', () => {
    it('should sign and verify access token', () => {
      const token = signAccessToken({ sub: 'u1', role: 'ADMIN' });
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe('u1');
      expect(payload.role).toBe('ADMIN');
    });

    it('should sign and verify refresh token with jti', () => {
      const token = signRefreshToken({ sub: 'u1' });
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe('u1');
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe('string');
    });

    it('should produce unique refresh tokens for same payload in same second', () => {
      const t1 = signRefreshToken({ sub: 'u1' });
      const t2 = signRefreshToken({ sub: 'u1' });
      expect(t1).not.toBe(t2);

      // And their hashes must also differ (this is what the DB index enforces)
      expect(hashToken(t1)).not.toBe(hashToken(t2));
    });

    it('should reject invalid access token', () => {
      expect(() => verifyAccessToken('invalid')).toThrow();
    });

    it('should reject invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid')).toThrow();
    });

    it('should reject access token verified as refresh', () => {
      const token = signAccessToken({ sub: 'u1' });
      expect(() => verifyRefreshToken(token)).toThrow();
    });

    it('should reject refresh token verified as access', () => {
      const token = signRefreshToken({ sub: 'u1' });
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('crypto helpers', () => {
    it('should generate random tokens of correct length', () => {
      const t1 = generateRandomToken(16);
      const t2 = generateRandomToken(16);
      expect(t1).toHaveLength(32); // 16 bytes → 32 hex chars
      expect(t1).not.toBe(t2);
    });

    it('should hash deterministically', () => {
      const h1 = hashToken('abc');
      const h2 = hashToken('abc');
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64); // sha256 → 64 hex chars
    });

    it('should produce different hashes for different inputs', () => {
      expect(hashToken('abc')).not.toBe(hashToken('abcd'));
    });
  });
});