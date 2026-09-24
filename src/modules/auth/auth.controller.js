'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const authService = require('./auth.service');

const ctxFromReq = (req) => ({
  userAgent: req.get('user-agent') || null,
  ipAddress: req.ip || null,
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, ctxFromReq(req));
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(result, 'Registration successful'));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, ctxFromReq(req));
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Login successful'));
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, ctxFromReq(req));
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Token refreshed'));
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken, req.user?.id ?? null);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Logged out'));
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(null, 'Logged out from all devices'));
});

const me = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json(ApiResponse.success(authService.sanitizeUser(req.user)));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(result, 'If that email exists, a reset link was sent'));
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Password reset'));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token);
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Email verified'));
});

const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerification(req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Verification sent'));
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};