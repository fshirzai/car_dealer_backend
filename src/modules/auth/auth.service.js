'use strict';

const jwt = require('jsonwebtoken');
const User = require('../user/user.model');
const { RefreshToken, VerificationToken } = require('./auth.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { USER_ROLES } = require('../../constants/enums');
const customerProfileService = require('../customerProfile/customerProfile.service');
const { emit } = require('../auditLog/auditLog.utils');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../../utils/jwt');
const { generateRandomToken, hashToken } = require('../../utils/crypto');
const { TOKEN_TYPES, TOKEN_TTL } = require('./auth.constants');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const buildTokenPayload = (user) => ({
  sub: user.id,
  role: user.role,
  email: user.email,
});

const issueTokenPair = async (user, ctx = {}) => {
  const accessToken = signAccessToken(buildTokenPayload(user));
  const refreshToken = signRefreshToken({ sub: user.id });

  const tokenHash = hashToken(refreshToken);
  const decoded = jwt.decode(refreshToken);

  await RefreshToken.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(decoded.exp * 1000),
    userAgent: ctx.userAgent || null,
    ipAddress: ctx.ipAddress || null,
  });

  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  image: user.image,
  isActive: user.isActive,
  emailVerifiedAt: user.emailVerifiedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/* ------------------------------------------------------------------ */
/* Register                                                            */
/* ------------------------------------------------------------------ */

const register = async (payload, ctx = {}) => {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await User.hashPassword(payload.password);
  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    role: USER_ROLES.CUSTOMER,
    phone: payload.phone || null,
  });

  await customerProfileService.createForUser(user);

  const verificationToken = await createVerificationToken(
    user.id,
    TOKEN_TYPES.EMAIL_VERIFICATION,
    TOKEN_TTL.EMAIL_VERIFICATION_MS
  );

  const tokens = await issueTokenPair(user, ctx);

  await emit({
    action: 'CREATE',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    description: `New customer registered: ${user.email}`,
    newValues: { email: user.email, name: user.name, role: user.role },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return {
    user: sanitizeUser(user),
    tokens,
    verificationToken: env.isProduction ? undefined : verificationToken,
  };
};

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

const login = async (email, password, ctx = {}) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    await emit({
      action: 'LOGIN',
      entityType: 'User',
      description: `Failed login attempt (unknown email): ${email}`,
      newValues: { email, success: false },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');

  if (!user.passwordHash) {
    throw ApiError.badRequest('This account has no password set');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await emit({
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      description: `Failed login attempt (wrong password): ${email}`,
      newValues: { email, success: false },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = await issueTokenPair(user, ctx);

  await emit({
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    description: `User logged in: ${user.email}`,
    newValues: { email: user.email, success: true },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { user: sanitizeUser(user), tokens };
};

/* ------------------------------------------------------------------ */
/* Refresh                                                             */
/* ------------------------------------------------------------------ */

const refresh = async (refreshToken, ctx = {}) => {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );

  if (!stored) {
    throw ApiError.unauthorized('Refresh token expired or revoked');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');

  const newTokens = await issueTokenPair(user, ctx);

  stored.replacedByHash = hashToken(newTokens.refreshToken);
  await stored.save();

  return { user: sanitizeUser(user), tokens: newTokens };
};

/* ------------------------------------------------------------------ */
/* Logout                                                              */
/* ------------------------------------------------------------------ */

const logout = async (refreshToken, userId = null) => {
  const tokenHash = hashToken(refreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (stored && !stored.revokedAt) {
    stored.revokedAt = new Date();
    await stored.save();

    await emit({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: stored.userId,
      userId: userId || stored.userId,
      description: 'User logged out',
    });
  }
  return true;
};

const logoutAll = async (userId) => {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  await emit({
    action: 'LOGOUT',
    entityType: 'User',
    entityId: userId,
    userId,
    description: 'User logged out from all devices',
  });

  return true;
};

/* ------------------------------------------------------------------ */
/* Verification / reset token helpers                                  */
/* ------------------------------------------------------------------ */

const createVerificationToken = async (userId, type, ttlMs) => {
  const raw = generateRandomToken(32);
  const tokenHash = hashToken(raw);

  await VerificationToken.deleteMany({ userId, type, consumedAt: null });

  await VerificationToken.create({
    userId,
    tokenHash,
    type,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return raw;
};

const consumeVerificationToken = async (rawToken, expectedType) => {
  const tokenHash = hashToken(rawToken);

  const record = await VerificationToken.findOneAndUpdate(
    { tokenHash, type: expectedType, consumedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { new: true }
  );

  if (!record) throw ApiError.badRequest('Invalid or expired token');

  return record;
};

/* ------------------------------------------------------------------ */
/* Forgot password                                                     */
/* ------------------------------------------------------------------ */

const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) return { sent: true };

  const raw = await createVerificationToken(
    user.id,
    TOKEN_TYPES.PASSWORD_RESET,
    TOKEN_TTL.PASSWORD_RESET_MS
  );

  return {
    sent: true,
    resetToken: env.isProduction ? undefined : raw,
  };
};

const resetPassword = async (rawToken, newPassword) => {
  const record = await consumeVerificationToken(
    rawToken,
    TOKEN_TYPES.PASSWORD_RESET
  );

  const user = await User.findById(record.userId);
  if (!user) throw ApiError.notFound('User not found');

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await RefreshToken.updateMany(
    { userId: user.id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    description: `Password reset via email for ${user.email}`,
  });

  return { reset: true };
};

/* ------------------------------------------------------------------ */
/* Verify email                                                        */
/* ------------------------------------------------------------------ */

const verifyEmail = async (rawToken) => {
  const record = await consumeVerificationToken(
    rawToken,
    TOKEN_TYPES.EMAIL_VERIFICATION
  );

  const user = await User.findById(record.userId);
  if (!user) throw ApiError.notFound('User not found');

  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await user.save();
  }

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    description: `Email verified for ${user.email}`,
  });

  return { verified: true, email: user.email };
};

/* ------------------------------------------------------------------ */
/* Resend email verification                                           */
/* ------------------------------------------------------------------ */

const resendVerification = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.emailVerifiedAt) throw ApiError.badRequest('Email already verified');

  const raw = await createVerificationToken(
    user.id,
    TOKEN_TYPES.EMAIL_VERIFICATION,
    TOKEN_TTL.EMAIL_VERIFICATION_MS
  );

  return { sent: true, verificationToken: env.isProduction ? undefined : raw };
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  sanitizeUser,
  issueTokenPair,
  createVerificationToken,
  consumeVerificationToken,
};