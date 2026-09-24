'use strict';

const Purchase = require('./purchase.model');
const Vehicle = require('../vehicle/vehicle.model');
const Seller = require('../seller/seller.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { generatePurchaseNumber } = require('./purchase.utils');
const { emit } = require('../auditLog/auditLog.utils');
const {
  PURCHASE_SELECT_FIELDS,
  PURCHASE_VEHICLE_POPULATE,
  PURCHASE_SELLER_POPULATE,
  PURCHASE_CREATED_BY_POPULATE,
} = require('./purchase.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nullify = (v) => (v === '' || v === undefined ? null : v);

const populateAll = (q) =>
  q
    .populate(PURCHASE_VEHICLE_POPULATE)
    .populate(PURCHASE_SELLER_POPULATE)
    .populate(PURCHASE_CREATED_BY_POPULATE);

const findByIdOrFail = async (id) => {
  const purchase = await populateAll(
    Purchase.findById(id).select(PURCHASE_SELECT_FIELDS)
  );
  if (!purchase) throw ApiError.notFound('Purchase not found');
  return purchase;
};

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

const createPurchase = async (payload, createdById) => {
  const [vehicle, seller] = await Promise.all([
    Vehicle.findById(payload.vehicleId).select('_id stockNumber'),
    Seller.findById(payload.sellerId).select('_id name isActive'),
  ]);

  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (!seller) throw ApiError.notFound('Seller not found');
  if (!seller.isActive) throw ApiError.badRequest('Seller is inactive');

  const existing = await Purchase.findOne({ vehicleId: vehicle.id });
  if (existing) {
    throw ApiError.conflict('This vehicle already has a purchase record');
  }

  const purchaseNumber = await generatePurchaseNumber();

  const purchase = await Purchase.create({
    purchaseNumber,
    vehicleId: vehicle.id,
    sellerId: seller.id,
    purchasePrice: payload.purchasePrice,
    currency: payload.currency || 'USD',
    purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : new Date(),
    paymentStatus: payload.paymentStatus,
    notes: nullify(payload.notes),
    documentUrl: nullify(payload.documentUrl),
    createdById,
  });

  await emit({
    action: 'PURCHASE_CREATE',
    entityType: 'Purchase',
    entityId: purchase.id,
    userId: createdById,
    description: `Recorded purchase ${purchaseNumber} for ${vehicle.stockNumber} from ${seller.name}`,
    newValues: purchase.toObject(),
  });

  return findByIdOrFail(purchase.id);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listPurchases = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.sellerId) filter.sellerId = query.sellerId;
  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  if (query.dateFrom || query.dateTo) {
    filter.purchaseDate = {};
    if (query.dateFrom) filter.purchaseDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.purchaseDate.$lte = new Date(query.dateTo);
  }

  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { purchaseNumber: { $regex: s, $options: 'i' } },
      { invoiceNumber: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-purchaseDate';

  const [items, total] = await Promise.all([
    populateAll(
      Purchase.find(filter).select(PURCHASE_SELECT_FIELDS).sort(sort).skip(skip).limit(limit)
    ),
    Purchase.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getPurchaseById = async (id) => findByIdOrFail(id);

const getByVehicleId = async (vehicleId) =>
  populateAll(Purchase.findOne({ vehicleId }).select(PURCHASE_SELECT_FIELDS));

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updatePurchase = async (id, payload, actorId = null) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) throw ApiError.notFound('Purchase not found');

  const before = purchase.toObject();

  const directFields = ['purchasePrice', 'currency', 'paymentStatus', 'notes', 'documentUrl'];
  directFields.forEach((key) => {
    if (payload[key] === undefined) return;
    if (key === 'notes' || key === 'documentUrl') {
      purchase[key] = nullify(payload[key]);
    } else {
      purchase[key] = payload[key];
    }
  });

  if (payload.purchaseDate !== undefined) {
    purchase.purchaseDate = new Date(payload.purchaseDate);
  }

  await purchase.save();

  await emit({
    action: 'UPDATE',
    entityType: 'Purchase',
    entityId: purchase.id,
    userId: actorId,
    description: `Updated purchase ${purchase.purchaseNumber}`,
    oldValues: before,
    newValues: purchase.toObject(),
  });

  return findByIdOrFail(purchase.id);
};

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

const deletePurchase = async (id, actorId = null) => {
  const purchase = await Purchase.findByIdAndDelete(id);
  if (!purchase) throw ApiError.notFound('Purchase not found');

  await emit({
    action: 'DELETE',
    entityType: 'Purchase',
    entityId: id,
    userId: actorId,
    description: `Deleted purchase ${purchase.purchaseNumber}`,
    oldValues: purchase.toObject(),
  });

  return true;
};

/* ------------------------------------------------------------------ */
/* Guards                                                              */
/* ------------------------------------------------------------------ */

const vehicleHasPurchase = async (vehicleId) => {
  const exists = await Purchase.exists({ vehicleId });
  return Boolean(exists);
};

const countBySeller = async (sellerId) => Purchase.countDocuments({ sellerId });

module.exports = {
  createPurchase,
  listPurchases,
  getPurchaseById,
  getByVehicleId,
  updatePurchase,
  deletePurchase,
  vehicleHasPurchase,
  countBySeller,
};