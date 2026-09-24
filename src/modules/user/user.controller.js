'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const userService = require('./user.service');

const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user.id);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(user, 'User created'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await userService.listUsers(req.query);
  res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Users fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(user));
});

const me = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json(ApiResponse.success(req.user));
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  res.status(StatusCodes.OK).json(ApiResponse.success(user, 'User updated'));
});

const updateOwn = asyncHandler(async (req, res) => {
  const user = await userService.updateOwnProfile(req.user.id, req.body);
  res.status(StatusCodes.OK).json(ApiResponse.success(user, 'Profile updated'));
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Password changed'));
});

const deactivate = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(user, 'User deactivated'));
});

const activate = asyncHandler(async (req, res) => {
  const user = await userService.activateUser(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(user, 'User activated'));
});

const remove = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'User deleted'));
});

module.exports = {
  create,
  list,
  getById,
  me,
  update,
  updateOwn,
  changePassword,
  deactivate,
  activate,
  remove,
};