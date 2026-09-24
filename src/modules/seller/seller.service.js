'use strict';

const Seller = require('./seller.model');
const Purchase = require('../purchase/purchase.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { emit } = require('../auditLog/auditLog.utils');
const { SELLER_SELECT_FIELDS } = require('./seller.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeNullable = (v) => (v === '' || v === undefined ? null : v);

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

const createSeller = async (payload, actorId = null) => {
  const data = {
    name: payload.name.trim(),
    type: normalizeNullable(payload.type),
    phone: normalizeNullable(payload.phone),
    email: payload.email ? payload.email.toLowerCase() : null,
    address: normalizeNullable(payload.address),
    city: normalizeNullable(payload.city),
    country: normalizeNullable(payload.country),
    notes: normalizeNullable(payload.notes),
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  };

  const seller = await Seller.create(data);

  await emit({
    action: 'CREATE',
    entityType: 'Seller',
    entityId: seller.id,
    userId: actorId,
    description: `Created seller ${seller.name}`,
    newValues: seller.toObject(),
  });

  return Seller.findById(seller.id).select(SELLER_SELECT_FIELDS);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listSellers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.type) filter.type = query.type;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.city) {
    filter.city = { $regex: `^${escapeRegex(query.city)}$`, $options: 'i' };
  }
  if (query.country) {
    filter.country = { $regex: `^${escapeRegex(query.country)}$`, $options: 'i' };
  }
  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    Seller.find(filter)
      .select(SELLER_SELECT_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Seller.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getSellerById = async (id) => {
  const seller = await Seller.findById(id).select(SELLER_SELECT_FIELDS);
  if (!seller) throw ApiError.notFound('Seller not found');
  return seller;
};

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updateSeller = async (id, payload, actorId = null) => {
  const seller = await Seller.findById(id);
  if (!seller) throw ApiError.notFound('Seller not found');

  const before = seller.toObject();

  const fields = ['name', 'type', 'phone', 'email', 'address', 'city', 'country', 'notes', 'isActive'];

  fields.forEach((key) => {
    if (payload[key] === undefined) return;
    if (key === 'email') {
      seller.email = payload.email ? payload.email.toLowerCase() : null;
    } else if (key === 'name') {
      seller.name = payload.name.trim();
    } else if (key === 'isActive') {
      seller.isActive = payload.isActive;
    } else {
      seller[key] = normalizeNullable(payload[key]);
    }
  });

  await seller.save();

  await emit({
    action: 'UPDATE',
    entityType: 'Seller',
    entityId: seller.id,
    userId: actorId,
    description: `Updated seller ${seller.name}`,
    oldValues: before,
    newValues: seller.toObject(),
  });

  return Seller.findById(seller.id).select(SELLER_SELECT_FIELDS);
};

/* ------------------------------------------------------------------ */
/* Soft-delete / activate                                              */
/* ------------------------------------------------------------------ */

const deactivateSeller = async (id, actorId = null) => {
  const seller = await Seller.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).select(SELLER_SELECT_FIELDS);
  if (!seller) throw ApiError.notFound('Seller not found');

  await emit({
    action: 'UPDATE',
    entityType: 'Seller',
    entityId: seller.id,
    userId: actorId,
    description: `Deactivated seller ${seller.name}`,
    newValues: { isActive: false },
  });

  return seller;
};

const activateSeller = async (id, actorId = null) => {
  const seller = await Seller.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  ).select(SELLER_SELECT_FIELDS);
  if (!seller) throw ApiError.notFound('Seller not found');

  await emit({
    action: 'UPDATE',
    entityType: 'Seller',
    entityId: seller.id,
    userId: actorId,
    description: `Activated seller ${seller.name}`,
    newValues: { isActive: true },
  });

  return seller;
};

/* ------------------------------------------------------------------ */
/* Hard delete                                                         */
/* ------------------------------------------------------------------ */

const deleteSeller = async (id, actorId = null) => {
  const purchaseCount = await Purchase.countDocuments({ sellerId: id });
  if (purchaseCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete: seller has ${purchaseCount} purchase record(s). Deactivate instead.`
    );
  }

  const seller = await Seller.findByIdAndDelete(id);
  if (!seller) throw ApiError.notFound('Seller not found');

  await emit({
    action: 'DELETE',
    entityType: 'Seller',
    entityId: id,
    userId: actorId,
    description: `Deleted seller ${seller.name}`,
    oldValues: seller.toObject(),
  });

  return true;
};

module.exports = {
  createSeller,
  listSellers,
  getSellerById,
  updateSeller,
  deactivateSeller,
  activateSeller,
  deleteSeller,
};