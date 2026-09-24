'use strict';

const User = require('./user.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { emit } = require('../auditLog/auditLog.utils');
const { USER_SELECT_FIELDS, USER_SELECT_WITH_PASSWORD } = require('./user.constants');

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

const createUser = async (payload, actorId = null) => {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await User.hashPassword(payload.password);
  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    role: payload.role,
    phone: payload.phone || null,
    image: payload.image || null,
  });

  await emit({
    action: 'CREATE',
    entityType: 'User',
    entityId: user._id,
    userId: actorId,
    description: `Created ${user.role} account: ${user.email}`,
    newValues: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
  });

  return User.findById(user._id).select(USER_SELECT_FIELDS);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listUsers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    User.find(filter).select(USER_SELECT_FIELDS).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select(USER_SELECT_FIELDS);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const getUserByEmail = async (email, withPassword = false) => {
  const query = User.findOne({ email: email.toLowerCase() });
  if (withPassword) query.select(USER_SELECT_WITH_PASSWORD);
  return query;
};

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updateUser = async (id, payload, actor = null) => {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  if (actor && actor.role !== 'ADMIN' && payload.role && payload.role !== user.role) {
    throw ApiError.forbidden('Only admins can change roles');
  }

  const before = user.toObject();
  Object.assign(user, payload);
  await user.save();

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: actor?.id ?? null,
    description: `Updated user ${user.email}`,
    oldValues: {
      name: before.name,
      role: before.role,
      phone: before.phone,
      image: before.image,
      isActive: before.isActive,
    },
    newValues: {
      name: user.name,
      role: user.role,
      phone: user.phone,
      image: user.image,
      isActive: user.isActive,
    },
  });

  return User.findById(user._id).select(USER_SELECT_FIELDS);
};

const updateOwnProfile = async (userId, payload) => {
  const allowed = { name: payload.name, phone: payload.phone, image: payload.image };
  Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k]);

  const user = await User.findByIdAndUpdate(userId, allowed, {
    new: true,
    runValidators: true,
  }).select(USER_SELECT_FIELDS);

  if (!user) throw ApiError.notFound('User not found');

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    description: `User updated own profile`,
    newValues: allowed,
  });

  return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select(USER_SELECT_WITH_PASSWORD);
  if (!user) throw ApiError.notFound('User not found');
  if (!user.passwordHash) throw ApiError.badRequest('Account has no password set');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    description: `User changed password`,
  });

  return true;
};

/* ------------------------------------------------------------------ */
/* Activate / deactivate / delete                                      */
/* ------------------------------------------------------------------ */

const deactivateUser = async (id, actorId = null) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).select(USER_SELECT_FIELDS);
  if (!user) throw ApiError.notFound('User not found');

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: actorId,
    description: `Deactivated user ${user.email}`,
    newValues: { isActive: false },
  });

  return user;
};

const activateUser = async (id, actorId = null) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  ).select(USER_SELECT_FIELDS);
  if (!user) throw ApiError.notFound('User not found');

  await emit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: user.id,
    userId: actorId,
    description: `Activated user ${user.email}`,
    newValues: { isActive: true },
  });

  return user;
};

const deleteUser = async (id, actorId = null) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw ApiError.notFound('User not found');

  await emit({
    action: 'DELETE',
    entityType: 'User',
    entityId: id,
    userId: actorId,
    description: `Deleted user ${user.email}`,
    oldValues: { email: user.email, name: user.name, role: user.role },
  });

  return true;
};

module.exports = {
  createUser,
  listUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  updateOwnProfile,
  changePassword,
  deactivateUser,
  activateUser,
  deleteUser,
};