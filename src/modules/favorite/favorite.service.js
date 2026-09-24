'use strict';

const Favorite = require('./favorite.model');
const Vehicle = require('../vehicle/vehicle.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { VEHICLE_STATUS } = require('../../constants/enums');
const {
  FAVORITE_SELECT_FIELDS,
  FAVORITE_VEHICLE_POPULATE,
} = require('./favorite.constants');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ensures the vehicle exists and is in a state where customers can
 * reasonably interact with it (not SOLD).
 */
const assertVehicleInteractable = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).select(
    '_id status isPublished'
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (vehicle.status === VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest('Cannot interact with a SOLD vehicle');
  }
  return vehicle;
};

/* ------------------------------------------------------------------ */
/* Add / Remove / Toggle                                               */
/* ------------------------------------------------------------------ */

/**
 * Adds a favorite. Idempotent — returns existing if already favorited.
 */
const addFavorite = async (userId, vehicleId) => {
  await assertVehicleInteractable(vehicleId);

  const existing = await Favorite.findOne({ userId, vehicleId });
  if (existing) {
    return Favorite.findById(existing.id)
      .select(FAVORITE_SELECT_FIELDS)
      .populate(FAVORITE_VEHICLE_POPULATE);
  }

  const created = await Favorite.create({ userId, vehicleId });
  return Favorite.findById(created.id)
    .select(FAVORITE_SELECT_FIELDS)
    .populate(FAVORITE_VEHICLE_POPULATE);
};

const removeFavorite = async (userId, vehicleId) => {
  const result = await Favorite.deleteOne({ userId, vehicleId });
  return { removed: result.deletedCount > 0 };
};

const removeFavoriteById = async (userId, favoriteId) => {
  const favorite = await Favorite.findOne({ _id: favoriteId, userId });
  if (!favorite) throw ApiError.notFound('Favorite not found');
  await favorite.deleteOne();
  return true;
};

/**
 * Toggles: if a favorite exists for (userId, vehicleId), it is removed;
 * otherwise it is added.
 */
const toggleFavorite = async (userId, vehicleId) => {
  await assertVehicleInteractable(vehicleId);

  const existing = await Favorite.findOne({ userId, vehicleId });
  if (existing) {
    await existing.deleteOne();
    return { favorited: false };
  }

  await Favorite.create({ userId, vehicleId });
  return { favorited: true };
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listFavorites = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);
  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    Favorite.find({ userId })
      .select(FAVORITE_SELECT_FIELDS)
      .populate(FAVORITE_VEHICLE_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Favorite.countDocuments({ userId }),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const isFavorited = async (userId, vehicleId) => {
  const exists = await Favorite.exists({ userId, vehicleId });
  return Boolean(exists);
};

/* ------------------------------------------------------------------ */
/* Cascade                                                             */
/* ------------------------------------------------------------------ */

/**
 * Removes all favorites for a given vehicle. Used when a vehicle is deleted.
 */
const deleteByVehicle = async (vehicleId) => {
  const result = await Favorite.deleteMany({ vehicleId });
  return result.deletedCount || 0;
};

const deleteByUser = async (userId) => {
  const result = await Favorite.deleteMany({ userId });
  return result.deletedCount || 0;
};

module.exports = {
  addFavorite,
  removeFavorite,
  removeFavoriteById,
  toggleFavorite,
  listFavorites,
  isFavorited,
  deleteByVehicle,
  deleteByUser,
};