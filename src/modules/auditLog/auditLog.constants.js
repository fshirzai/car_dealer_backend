'use strict';

const AUDIT_LOG_SELECT_FIELDS = '-__v';

const AUDIT_LOG_USER_POPULATE = {
  path: 'userId',
  select: 'name email role',
};

/**
 * Every field listed here is stripped from oldValues/newValues before
 * being persisted. This is the SECURITY GATE — nothing sensitive should
 * ever be written to the audit trail.
 */
const SENSITIVE_FIELDS = Object.freeze([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'token',
  'tokenHash',
  'refreshToken',
  'accessToken',
  'sessionToken',
  'verificationToken',
  'resetToken',
  'secret',
  'providerAccountId',
  'refresh_token',
  'access_token',
  'id_token',
  'session_state',
]);

const ACTION = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PUBLISH: 'PUBLISH',
  UNPUBLISH: 'UNPUBLISH',
  PURCHASE_CREATE: 'PURCHASE_CREATE',
  SALE_CREATE: 'SALE_CREATE',
  ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
});

module.exports = {
  AUDIT_LOG_SELECT_FIELDS,
  AUDIT_LOG_USER_POPULATE,
  SENSITIVE_FIELDS,
  ACTION,
};