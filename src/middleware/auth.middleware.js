'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../modules/user/user.model');
const { USER_ROLES } = require('../constants/enums');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Authentication token missing');

  const payload = jwt.verify(token, env.jwt.secret);
  const user = await User.findById(payload.sub).select('+passwordHash');

  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');

  req.user = user;
  next();
});

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }
  return next();
};

const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(payload.sub);
    if (user && user.isActive) req.user = user;
  } catch (_e) {
    // ignore — treat as anonymous
  }
  return next();
});

const ROLES = USER_ROLES;

module.exports = { authenticate, authorize, optionalAuthenticate, ROLES };