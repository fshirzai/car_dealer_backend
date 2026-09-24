'use strict';

const CustomerProfile = require('./customerProfile.model');
const User = require('../user/user.model');
const ApiError = require('../../utils/ApiError');
const { USER_ROLES } = require('../../constants/enums');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const {
  CUSTOMER_PROFILE_SELECT_FIELDS,
  CUSTOMER_PROFILE_POPULATE,
} = require('./customerProfile.constants');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const findByIdOrFail = async (id) => {
  const profile = await CustomerProfile.findById(id)
    .select(CUSTOMER_PROFILE_SELECT_FIELDS)
    .populate(CUSTOMER_PROFILE_POPULATE);
  if (!profile) throw ApiError.notFound('Customer profile not found');
  return profile;
};

/* ------------------------------------------------------------------ */
/* Auto-creation on register                                           */
/* ------------------------------------------------------------------ */

/**
 * Called by auth.service after registering a CUSTOMER.
 * Creates a CustomerProfile using the user's name and phone as defaults.
 * Safe to call multiple times — returns existing profile if present.
 */
const createForUser = async (user) => {
  if (!user || user.role !== USER_ROLES.CUSTOMER) return null;

  const existing = await CustomerProfile.findOne({ userId: user.id });
  if (existing) return existing;

  const profile = await CustomerProfile.create({
    userId: user.id,
    fullName: user.name,
    phone: user.phone || 'N/A', // phone is required; use placeholder if empty
  });

  return profile;
};

/* ------------------------------------------------------------------ */
/* Create (admin)                                                      */
/* ------------------------------------------------------------------ */

const createProfile = async (payload) => {
  const user = await User.findById(payload.userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw ApiError.badRequest('Only CUSTOMER users can have a profile');
  }

  const existing = await CustomerProfile.findOne({ userId: payload.userId });
  if (existing) throw ApiError.conflict('Profile already exists for this user');

  const profile = await CustomerProfile.create(payload);
  return findByIdOrFail(profile.id);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listProfiles = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.city) {
    filter.city = {
      $regex: `^${escapeRegex(query.city)}$`,
      $options: 'i',
    };
  }
  if (query.country) {
    filter.country = {
      $regex: `^${escapeRegex(query.country)}$`,
      $options: 'i',
    };
  }
  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { fullName: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    CustomerProfile.find(filter)
      .select(CUSTOMER_PROFILE_SELECT_FIELDS)
      .populate(CUSTOMER_PROFILE_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    CustomerProfile.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getProfileById = async (id) => findByIdOrFail(id);

const getByUserId = async (userId) => {
  const profile = await CustomerProfile.findOne({ userId })
    .select(CUSTOMER_PROFILE_SELECT_FIELDS)
    .populate(CUSTOMER_PROFILE_POPULATE);
  return profile;
};

/**
 * Self-service: the authenticated session determines the user.
 * Never trust a userId from the request body/URL for this.
 */
const getMyProfile = async (userId) => {
  const profile = await CustomerProfile.findOne({ userId })
    .select(CUSTOMER_PROFILE_SELECT_FIELDS)
    .populate(CUSTOMER_PROFILE_POPULATE);

  if (!profile) {
    // Self-heal: create one if it's missing (e.g. legacy users)
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role !== USER_ROLES.CUSTOMER) {
      throw ApiError.forbidden('Only CUSTOMER users have a customer profile');
    }
    const created = await createForUser(user);
    return findByIdOrFail(created.id);
  }

  return profile;
};

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updateProfile = async (id, payload) => {
  const profile = await CustomerProfile.findById(id);
  if (!profile) throw ApiError.notFound('Customer profile not found');

  Object.assign(profile, payload);
  await profile.save();

  return findByIdOrFail(profile.id);
};

const updateMyProfile = async (userId, payload) => {
  const profile = await CustomerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Customer profile not found');

  // Only allow safe self-edit fields (notes/status remain internal)
  const allowed = ['fullName', 'phone', 'address', 'city', 'country'];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) profile[key] = payload[key];
  });

  await profile.save();
  return findByIdOrFail(profile.id);
};

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

const deleteProfile = async (id) => {
  const profile = await CustomerProfile.findByIdAndDelete(id);
  if (!profile) throw ApiError.notFound('Customer profile not found');
  return true;
};

module.exports = {
  createForUser,
  createProfile,
  listProfiles,
  getProfileById,
  getByUserId,
  getMyProfile,
  updateProfile,
  updateMyProfile,
  deleteProfile,
};