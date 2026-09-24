'use strict';

const Sale = require('./sale.model');
const Vehicle = require('../vehicle/vehicle.model');
const User = require('../user/user.model');
const Order = require('../order/order.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { VEHICLE_STATUS, USER_ROLES } = require('../../constants/enums');
const { generateSaleNumber } = require('./sale.utils');
const { emit } = require('../auditLog/auditLog.utils');
const {
  SALE_SELECT_FIELDS,
  SALE_VEHICLE_POPULATE,
  SALE_CUSTOMER_POPULATE,
  SALE_CREATED_BY_POPULATE,
  SALE_ORDER_POPULATE,
} = require('./sale.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nullify = (v) => (v === '' || v === undefined ? null : v);

const populateAll = (q) =>
  q
    .populate(SALE_VEHICLE_POPULATE)
    .populate(SALE_CUSTOMER_POPULATE)
    .populate(SALE_CREATED_BY_POPULATE)
    .populate(SALE_ORDER_POPULATE);

const findByIdOrFail = async (id) => {
  const sale = await populateAll(Sale.findById(id).select(SALE_SELECT_FIELDS));
  if (!sale) throw ApiError.notFound('Sale not found');
  return sale;
};

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

const createSale = async (payload, createdById) => {
  const vehicle = await Vehicle.findById(payload.vehicleId).select(
    '_id stockNumber status isPublished'
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (vehicle.status === VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest('Vehicle is already SOLD');
  }

  const existing = await Sale.findOne({ vehicleId: vehicle.id });
  if (existing) throw ApiError.conflict('This vehicle already has a sale');

  if (payload.customerId) {
    const customer = await User.findById(payload.customerId).select('_id role');
    if (!customer) throw ApiError.notFound('Customer not found');
    if (customer.role !== USER_ROLES.CUSTOMER) {
      throw ApiError.badRequest('customerId must reference a CUSTOMER user');
    }
  }

  let orderId = null;
  if (payload.orderId) {
    const order = await Order.findById(payload.orderId).select('_id items status');
    if (!order) throw ApiError.notFound('Order not found');
    const hasVehicle = order.items.some(
      (item) => item.vehicleId.toString() === vehicle.id
    );
    if (!hasVehicle) throw ApiError.badRequest('Order does not include this vehicle');
    orderId = order.id;
  }

  const saleNumber = await generateSaleNumber();

  const sale = await Sale.create({
    saleNumber,
    vehicleId: vehicle.id,
    customerId: payload.customerId || null,
    salePrice: payload.salePrice,
    currency: payload.currency || 'USD',
    saleDate: payload.saleDate ? new Date(payload.saleDate) : new Date(),
    channel: payload.channel,
    orderId,
    paymentStatus: payload.paymentStatus,
    notes: nullify(payload.notes),
    invoiceNumber: nullify(payload.invoiceNumber),
    createdById,
  });

  await Vehicle.updateOne(
    { _id: vehicle.id },
    { $set: { status: VEHICLE_STATUS.SOLD, isPublished: false } }
  );

  await emit({
    action: 'SALE_CREATE',
    entityType: 'Sale',
    entityId: sale.id,
    userId: createdById,
    description: `Recorded sale ${saleNumber} of ${vehicle.stockNumber} for $${payload.salePrice}`,
    newValues: sale.toObject(),
  });

  return findByIdOrFail(sale.id);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listSales = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.channel) filter.channel = query.channel;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  if (query.dateFrom || query.dateTo) {
    filter.saleDate = {};
    if (query.dateFrom) filter.saleDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.saleDate.$lte = new Date(query.dateTo);
  }

  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { saleNumber: { $regex: s, $options: 'i' } },
      { invoiceNumber: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-saleDate';

  const [items, total] = await Promise.all([
    populateAll(
      Sale.find(filter).select(SALE_SELECT_FIELDS).sort(sort).skip(skip).limit(limit)
    ),
    Sale.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getSaleById = async (id) => findByIdOrFail(id);

const getByVehicleId = async (vehicleId) =>
  populateAll(Sale.findOne({ vehicleId }).select(SALE_SELECT_FIELDS));

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updateSale = async (id, payload, actorId = null) => {
  const sale = await Sale.findById(id);
  if (!sale) throw ApiError.notFound('Sale not found');

  const before = sale.toObject();

  const directFields = ['salePrice', 'currency', 'paymentStatus', 'notes', 'invoiceNumber'];
  directFields.forEach((key) => {
    if (payload[key] === undefined) return;
    if (key === 'notes' || key === 'invoiceNumber') {
      sale[key] = nullify(payload[key]);
    } else {
      sale[key] = payload[key];
    }
  });

  if (payload.saleDate !== undefined) {
    sale.saleDate = new Date(payload.saleDate);
  }

  await sale.save();

  await emit({
    action: 'UPDATE',
    entityType: 'Sale',
    entityId: sale.id,
    userId: actorId,
    description: `Updated sale ${sale.saleNumber}`,
    oldValues: before,
    newValues: sale.toObject(),
  });

  return findByIdOrFail(sale.id);
};

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

const deleteSale = async (id, actorId = null, { restoreVehicle = true } = {}) => {
  const sale = await Sale.findById(id);
  if (!sale) throw ApiError.notFound('Sale not found');

  const snapshot = sale.toObject();

  if (restoreVehicle) {
    await Vehicle.updateOne(
      { _id: sale.vehicleId, status: VEHICLE_STATUS.SOLD },
      { $set: { status: VEHICLE_STATUS.AVAILABLE, isPublished: true } }
    );
  }

  await sale.deleteOne();

  await emit({
    action: 'DELETE',
    entityType: 'Sale',
    entityId: id,
    userId: actorId,
    description: `Reversed sale ${snapshot.saleNumber} (vehicle restored to AVAILABLE)`,
    oldValues: snapshot,
  });

  return true;
};

/* ------------------------------------------------------------------ */
/* Guards                                                              */
/* ------------------------------------------------------------------ */

const vehicleHasSale = async (vehicleId) => {
  const exists = await Sale.exists({ vehicleId });
  return Boolean(exists);
};

module.exports = {
  createSale,
  listSales,
  getSaleById,
  getByVehicleId,
  updateSale,
  deleteSale,
  vehicleHasSale,
};