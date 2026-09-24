'use strict';

const TOKEN_TYPES = Object.freeze({
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
});

const TOKEN_TTL = Object.freeze({
  EMAIL_VERIFICATION_MS: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_MS: 60 * 60 * 1000,          // 1 hour
});

module.exports = { TOKEN_TYPES, TOKEN_TTL };