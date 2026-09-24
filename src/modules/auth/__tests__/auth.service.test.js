'use strict';

const authService = require('../auth.service');
const User = require('../../user/user.model');
const { RefreshToken, VerificationToken } = require('../auth.model');
const { USER_ROLES } = require('../../../constants/enums');
const { TOKEN_TYPES } = require('../auth.constants');
const {
  buildUserPayload,
  createTestUser,
} = require('../../../../tests/helpers/factories');

describe('AuthService (unit)', () => {
  describe('register', () => {
    it('should register a new customer and return tokens', async () => {
      const payload = buildUserPayload();
      const result = await authService.register(payload);

      expect(result.user.email).toBe(payload.email.toLowerCase());
      expect(result.user.role).toBe(USER_ROLES.CUSTOMER);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      const stored = await RefreshToken.findOne({ userId: result.user.id });
      expect(stored).toBeTruthy();
      expect(stored.revokedAt).toBeNull();
    });

    it('should create an email verification token', async () => {
      const payload = buildUserPayload();
      const result = await authService.register(payload);

      const token = await VerificationToken.findOne({
        userId: result.user.id,
        type: TOKEN_TYPES.EMAIL_VERIFICATION,
      });
      expect(token).toBeTruthy();
      expect(token.consumedAt).toBeNull();
    });

    it('should reject duplicate email', async () => {
      const payload = buildUserPayload();
      await authService.register(payload);
      await expect(authService.register(payload)).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const { user, password } = await createTestUser();
      const result = await authService.login(user.email, password);
      expect(result.user.id).toBe(user.id);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should reject wrong password with 401', async () => {
      const { user } = await createTestUser();
      await expect(
        authService.login(user.email, 'WrongPass123')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should reject unknown email with 401', async () => {
      await expect(
        authService.login('nobody@test.com', 'Password123!')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should reject disabled accounts with 403', async () => {
      const { user, password } = await createTestUser();
      user.isActive = false;
      await user.save();
      await expect(authService.login(user.email, password)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should issue a different refresh token on each login (no collision)', async () => {
      const { user, password } = await createTestUser();
      const first = await authService.login(user.email, password);
      const second = await authService.login(user.email, password);

      expect(first.tokens.refreshToken).not.toBe(second.tokens.refreshToken);

      const count = await RefreshToken.countDocuments({
        userId: user.id,
        revokedAt: null,
      });
      expect(count).toBe(2);
    });
  });

  describe('refresh (rotation)', () => {
    it('should rotate tokens and revoke old one', async () => {
      const { user, password } = await createTestUser();
      const first = await authService.login(user.email, password);

      const second = await authService.refresh(first.tokens.refreshToken);
      expect(second.tokens.refreshToken).not.toBe(first.tokens.refreshToken);

      // Old refresh token should now be revoked → 401
      await expect(
        authService.refresh(first.tokens.refreshToken)
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should reject unknown refresh token', async () => {
      await expect(authService.refresh('bogus.token.here')).rejects.toBeTruthy();
    });

    it('should handle concurrent refresh atomically (only one wins)', async () => {
      const { user, password } = await createTestUser();
      const { tokens } = await authService.login(user.email, password);

      // Fire two refreshes with the SAME token at the same time
      const results = await Promise.allSettled([
        authService.refresh(tokens.refreshToken),
        authService.refresh(tokens.refreshToken),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
    });

    it('should rotate multiple times in a chain', async () => {
      const { user, password } = await createTestUser();
      const first = await authService.login(user.email, password);
      const second = await authService.refresh(first.tokens.refreshToken);
      const third = await authService.refresh(second.tokens.refreshToken);

      expect(third.tokens.refreshToken).toBeDefined();

      // All older tokens are now dead
      await expect(
        authService.refresh(first.tokens.refreshToken)
      ).rejects.toMatchObject({ statusCode: 401 });
      await expect(
        authService.refresh(second.tokens.refreshToken)
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      const { user, password } = await createTestUser();
      const { tokens } = await authService.login(user.email, password);

      await authService.logout(tokens.refreshToken);

      const stored = await RefreshToken.findOne({ revokedAt: { $ne: null } });
      expect(stored).toBeTruthy();

      await expect(
        authService.refresh(tokens.refreshToken)
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should be idempotent for unknown tokens', async () => {
      await expect(authService.logout('unknown.token.here')).resolves.toBe(true);
    });
  });

  describe('logoutAll', () => {
    it('should revoke all active refresh tokens for a user', async () => {
      const { user, password } = await createTestUser();
      await authService.login(user.email, password);
      await authService.login(user.email, password);
      await authService.login(user.email, password);

      await authService.logoutAll(user.id);

      const active = await RefreshToken.countDocuments({
        userId: user.id,
        revokedAt: null,
      });
      expect(active).toBe(0);
    });
  });

  describe('forgot / reset password', () => {
    it('should not reveal whether email exists', async () => {
      const result = await authService.forgotPassword('nobody@test.com');
      expect(result.sent).toBe(true);
      expect(result.resetToken).toBeUndefined();
    });

    it('should return dev resetToken for existing user', async () => {
      const { user } = await createTestUser();
      const result = await authService.forgotPassword(user.email);
      expect(result.sent).toBe(true);
      expect(result.resetToken).toBeDefined();
    });

    it('should reset password with valid token and revoke sessions', async () => {
      const { user, password } = await createTestUser();
      await authService.login(user.email, password); // create a session
      const { resetToken } = await authService.forgotPassword(user.email);

      await authService.resetPassword(resetToken, 'NewPassword456!');

      const reloaded = await User.findById(user.id).select('+passwordHash');
      expect(await reloaded.comparePassword('NewPassword456!')).toBe(true);

      // Token consumed
      const consumed = await VerificationToken.findOne({
        type: TOKEN_TYPES.PASSWORD_RESET,
      });
      expect(consumed.consumedAt).not.toBeNull();

      // All sessions revoked
      const active = await RefreshToken.countDocuments({
        userId: user.id,
        revokedAt: null,
      });
      expect(active).toBe(0);
    });

    it('should reject reused reset token', async () => {
      const { user } = await createTestUser();
      const { resetToken } = await authService.forgotPassword(user.email);
      await authService.resetPassword(resetToken, 'NewPassword456!');
      await expect(
        authService.resetPassword(resetToken, 'Another456!')
      ).rejects.toBeTruthy();
    });

    it('should replace previous unused reset token when requested again', async () => {
      const { user } = await createTestUser();
      const first = await authService.forgotPassword(user.email);
      const second = await authService.forgotPassword(user.email);

      expect(first.resetToken).not.toBe(second.resetToken);

      // Old token should be gone
      await expect(
        authService.resetPassword(first.resetToken, 'NewPass789!')
      ).rejects.toBeTruthy();

      // New token works
      await expect(
        authService.resetPassword(second.resetToken, 'NewPass789!')
      ).resolves.toMatchObject({ reset: true });
    });
  });

  describe('verify email', () => {
    it('should verify email with valid token', async () => {
      const payload = buildUserPayload();
      const { verificationToken } = await authService.register(payload);
      const result = await authService.verifyEmail(verificationToken);
      expect(result.verified).toBe(true);

      const user = await User.findOne({ email: payload.email });
      expect(user.emailVerifiedAt).not.toBeNull();
    });

    it('should reject reused verification token', async () => {
      const payload = buildUserPayload();
      const { verificationToken } = await authService.register(payload);
      await authService.verifyEmail(verificationToken);

      await expect(authService.verifyEmail(verificationToken)).rejects.toBeTruthy();
    });
  });

  describe('resendVerification', () => {
    it('should send a new verification token when unverified', async () => {
      const payload = buildUserPayload();
      const { user } = await authService.register(payload);

      const result = await authService.resendVerification(user.id);
      expect(result.sent).toBe(true);
      expect(result.verificationToken).toBeDefined();
    });

    it('should reject when email already verified', async () => {
      const payload = buildUserPayload();
      const reg = await authService.register(payload);
      await authService.verifyEmail(reg.verificationToken);

      await expect(
        authService.resendVerification(reg.user.id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('sanitizeUser', () => {
    it('should omit passwordHash', async () => {
      const { user } = await createTestUser();
      const clean = authService.sanitizeUser(user);
      expect(clean.passwordHash).toBeUndefined();
      expect(clean.id).toBe(user.id);
    });
  });
});