'use strict';

const CartItem = require('./cartItem.model');
const Vehicle = require('../vehicle/vehicle.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { VEHICLE_STATUS } = require('../../constants/enums');
const { emit } = require('../auditLog/auditLog.utils');
const {
  CART_ITEM_SELECT_FIELDS,
  CART_ITEM_VEHICLE_POPULATE,
} = require('./cartItem.constants');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Cart is stricter than favorites: only published + AVAILABLE vehicles
 * can be added. A RESERVED or SOLD or unpublished vehicle is a no-go.
 */
const assertCartableVehicle = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).select(
    '_id status isPublished'
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (!vehicle.isPublished) {
    throw ApiError.badRequest('Vehicle is not available for sale');
  }
  if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) {
    throw ApiError.badRequest(
      `Vehicle cannot be added to cart (status: ${vehicle.status})`
    );
  }
  return vehicle;
};

/* ------------------------------------------------------------------ */
/* Add / Remove                                                        */
/* ------------------------------------------------------------------ */

/**
 * Add a vehicle to the cart. Idempotent — returns existing row if already present.
 */
const addToCart = async (userId, vehicleId) => {
  await assertCartableVehicle(vehicleId);

  const existing = await CartItem.findOne({ userId, vehicleId });
  if (existing) {
    return CartItem.findById(existing.id)
      .select(CART_ITEM_SELECT_FIELDS)
      .populate(CART_ITEM_VEHICLE_POPULATE);
  }

  const created = await CartItem.create({ userId, vehicleId, quantity: 1 });
  return CartItem.findById(created.id)
    .select(CART_ITEM_SELECT_FIELDS)
    .populate(CART_ITEM_VEHICLE_POPULATE);
};

const removeFromCart = async (userId, vehicleId) => {
  const result = await CartItem.deleteOne({ userId, vehicleId });
  return { removed: result.deletedCount > 0 };
};

const removeCartItemById = async (userId, cartItemId) => {
  const item = await CartItem.findOne({ _id: cartItemId, userId });
  if (!item) throw ApiError.notFound('Cart item not found');
  await item.deleteOne();
  return true;
};

const clearCart = async (userId) => {
  const result = await CartItem.deleteMany({ userId });
  return { cleared: result.deletedCount || 0 };
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listCart = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);
  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    CartItem.find({ userId })
      .select(CART_ITEM_SELECT_FIELDS)
      .populate(CART_ITEM_VEHICLE_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    CartItem.countDocuments({ userId }),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const isInCart = async (userId, vehicleId) => {
  const exists = await CartItem.exists({ userId, vehicleId });
  return Boolean(exists);
};

const countCart = async (userId) => {
  return CartItem.countDocuments({ userId });
};

/* ------------------------------------------------------------------ */
/* Cascade                                                             */
/* ------------------------------------------------------------------ */

const deleteByVehicle = async (vehicleId) => {
  const result = await CartItem.deleteMany({ vehicleId });
  return result.deletedCount || 0;
};

const deleteByUser = async (userId) => {
  const result = await CartItem.deleteMany({ userId });
  return result.deletedCount || 0;
};

module.exports = {
  addToCart,
  removeFromCart,
  removeCartItemById,
  clearCart,
  listCart,
  isInCart,
  countCart,
  deleteByVehicle,
  deleteByUser,
};