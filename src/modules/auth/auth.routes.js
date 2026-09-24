'use strict';

const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimit.middleware');
const v = require('./auth.validation');

const router = express.Router();

/* ---------------- Public ---------------- */
router.post('/register', authLimiter, validate(v.registerSchema), controller.register);
router.post('/login', authLimiter, validate(v.loginSchema), controller.login);
router.post('/refresh', validate(v.refreshSchema), controller.refresh);
router.post('/logout', validate(v.logoutSchema), controller.logout);
router.post('/forgot-password', authLimiter, validate(v.forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(v.resetPasswordSchema), controller.resetPassword);
router.post('/verify-email', validate(v.verifyEmailSchema), controller.verifyEmail);

/* ---------------- Authenticated ---------------- */
router.get('/me', authenticate, controller.me);
router.post('/logout-all', authenticate, controller.logoutAll);
router.post('/resend-verification', authenticate, controller.resendVerification);

module.exports = router;