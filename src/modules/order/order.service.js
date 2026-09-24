'use strict';

const Order = require('./order.model');
const User = require('../user/user.model');
const Vehicle = require('../vehicle/vehicle.model');
const customerProfileService = require('../customerProfile/customerProfile.service');
const cartItemService = require('../cartItem/cartItem.service');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { ORDER_STATUS, VEHICLE_STATUS } = require('../../constants/enums');
const { generateOrderNumber } = require('./order.utils');
const { emit } = require('../auditLog/auditLog.utils');
const {
  ORDER_SELECT_FIELDS,
  ORDER_CUSTOMER_POPULATE,
  ORDER_ITEM_VEHICLE_POPULATE,
  STAFF_TRANSITIONS,
} = require('./order.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const findByIdOrFail = async (id, { withPopulate = true } = {}) => {
  let q = Order.findById(id).select(ORDER_SELECT_FIELDS);
  if (withPopulate) {
    q = q
      .populate(ORDER_CUSTOMER_POPULATE)
      .populate(ORDER_ITEM_VEHICLE_POPULATE);
  }
  const order = await q;
  if (!order) throw ApiError.notFound('Order not found');
  return order;
};

const toCustomerView = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  delete obj.staffNotes;
  return obj;
};

const buildItemsFromVehicles = async (vehicleIds) => {
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).select(
    'stockNumber make model year trim askingPrice currency status isPublished'
  );

  if (vehicles.length !== vehicleIds.length) {
    const found = new Set(vehicles.map((v) => v.id));
    const missing = vehicleIds.filter((id) => !found.has(id));
    throw ApiError.badRequest(
      `Some vehicles do not exist: ${missing.join(', ')}`
    );
  }

  const notOrderable = vehicles.filter(
    (v) => !v.isPublished || v.status !== VEHICLE_STATUS.AVAILABLE
  );
  if (notOrderable.length > 0) {
    throw ApiError.badRequest(
      `Some vehicles are not available for order: ${notOrderable
        .map((v) => v.stockNumber)
        .join(', ')}`
    );
  }

  const byId = new Map(vehicles.map((v) => [v.id, v]));
  return vehicleIds.map((id) => {
    const v = byId.get(id);
    const name = `${v.make} ${v.model} ${v.year}${
      v.trim ? ` ${v.trim}` : ''
    }`.trim();
    return {
      vehicleId: v.id,
      vehicleName: name,
      vehicleStockNumber: v.stockNumber,
      unitPrice: v.askingPrice,
      currency: v.currency || 'USD',
      quantity: 1,
    };
  });
};

/* ------------------------------------------------------------------ */
/* Create (customer)                                                   */
/* ------------------------------------------------------------------ */

const createOrder = async (customerId, payload) => {
  const [user, profile] = await Promise.all([
    User.findById(customerId).select('name email phone'),
    customerProfileService.getByUserId(customerId),
  ]);

  if (!user) throw ApiError.notFound('User not found');

  const vehicleIds = payload.items.map((i) => i.vehicleId);
  const items = await buildItemsFromVehicles(vehicleIds);

  const customerName = payload.customerName?.trim() || profile?.fullName || user.name;
  const customerPhone = payload.customerPhone?.trim() || profile?.phone || user.phone;
  const customerEmail = (payload.customerEmail || user.email || '').toLowerCase();
  const customerAddress = payload.customerAddress?.trim() || profile?.address || null;

  if (!customerPhone) {
    throw ApiError.badRequest(
      'A phone number is required to place an order (provide in your profile or order)'
    );
  }

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customerId,
    status: ORDER_STATUS.PENDING,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    customerNotes: payload.customerNotes || null,
    items,
  });

  await Promise.all(
    vehicleIds.map((id) => cartItemService.removeFromCart(customerId, id))
  );

  await emit({
    action: 'CREATE',
    entityType: 'Order',
    entityId: order.id,
    userId: customerId,
    description: `Customer placed order ${orderNumber} (${items.length} vehicle${items.length === 1 ? '' : 's'})`,
    newValues: { orderNumber, items: items.map((i) => i.vehicleStockNumber) },
  });

  return findByIdOrFail(order.id);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const listMyOrders = async (customerId, query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = { customerId };
  if (query.status) filter.status = query.status;

  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    Order.find(filter)
      .select(ORDER_SELECT_FIELDS)
      .populate(ORDER_ITEM_VEHICLE_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    items: items.map(toCustomerView),
    meta: buildPaginationMeta(total, page, limit),
  };
};

const getMyOrder = async (customerId, id) => {
  const order = await Order.findOne({ _id: id, customerId })
    .select(ORDER_SELECT_FIELDS)
    .populate(ORDER_ITEM_VEHICLE_POPULATE);
  if (!order) throw ApiError.notFound('Order not found');
  return toCustomerView(order);
};

const listOrders = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { orderNumber: { $regex: s, $options: 'i' } },
      { customerName: { $regex: s, $options: 'i' } },
      { customerPhone: { $regex: s, $options: 'i' } },
      { customerEmail: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    Order.find(filter)
      .select(ORDER_SELECT_FIELDS)
      .populate(ORDER_CUSTOMER_POPULATE)
      .populate(ORDER_ITEM_VEHICLE_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getOrderById = async (id) => findByIdOrFail(id);

/* ------------------------------------------------------------------ */
/* Customer actions                                                    */
/* ------------------------------------------------------------------ */

const cancelByCustomer = async (customerId, id, reason = null) => {
  const order = await Order.findOne({ _id: id, customerId });
  if (!order) throw ApiError.notFound('Order not found');

  if (!order.isCancellableByCustomer()) {
    throw ApiError.badRequest(
      'You can only cancel orders while they are still pending'
    );
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  order.cancelReason = reason || 'Cancelled by customer';
  await order.save();

  await emit({
    action: 'STATUS_CHANGE',
    entityType: 'Order',
    entityId: order.id,
    userId: customerId,
    description: `Customer cancelled order ${order.orderNumber}: ${order.cancelReason}`,
    oldValues: { status: ORDER_STATUS.PENDING },
    newValues: { status: ORDER_STATUS.CANCELLED, cancelReason: order.cancelReason },
  });

  return findByIdOrFail(order.id);
};

/* ------------------------------------------------------------------ */
/* Staff actions                                                       */
/* ------------------------------------------------------------------ */

const updateStatus = async (id, newStatus, { cancelReason, actorId = null } = {}) => {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status === newStatus) {
    return findByIdOrFail(order.id);
  }

  const previousStatus = order.status;
  const allowed = STAFF_TRANSITIONS[previousStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition from ${previousStatus} to ${newStatus}`
    );
  }

  const now = new Date();
  order.status = newStatus;

  switch (newStatus) {
    case ORDER_STATUS.CONTACTED:
      order.contactedAt = now;
      break;
    case ORDER_STATUS.CONFIRMED:
      order.confirmedAt = now;
      break;
    case ORDER_STATUS.CANCELLED:
      order.cancelledAt = now;
      order.cancelReason = cancelReason || order.cancelReason || 'Cancelled by staff';
      break;
    case ORDER_STATUS.COMPLETED:
      order.completedAt = now;
      break;
    default:
      break;
  }

  await order.save();

  if (newStatus === ORDER_STATUS.CONFIRMED) {
    const vehicleIds = order.items.map((i) => i.vehicleId);
    await Vehicle.updateMany(
      { _id: { $in: vehicleIds }, status: VEHICLE_STATUS.AVAILABLE },
      { $set: { status: VEHICLE_STATUS.RESERVED } }
    );
  }

  if (newStatus === ORDER_STATUS.CANCELLED) {
    const vehicleIds = order.items.map((i) => i.vehicleId);
    await Vehicle.updateMany(
      { _id: { $in: vehicleIds }, status: VEHICLE_STATUS.RESERVED },
      { $set: { status: VEHICLE_STATUS.AVAILABLE } }
    );
  }

  await emit({
    action: 'ORDER_STATUS_CHANGE',
    entityType: 'Order',
    entityId: order.id,
    userId: actorId,
    description: `Order ${order.orderNumber} status: ${previousStatus} → ${newStatus}`,
    oldValues: { status: previousStatus },
    newValues: { status: newStatus, cancelReason: order.cancelReason },
  });

  return findByIdOrFail(order.id);
};

const updateStaffNotes = async (id, staffNotes, actorId = null) => {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  order.staffNotes = staffNotes || null;
  await order.save();

  await emit({
    action: 'UPDATE',
    entityType: 'Order',
    entityId: order.id,
    userId: actorId,
    description: `Updated staff notes on order ${order.orderNumber}`,
    newValues: { staffNotes: order.staffNotes },
  });

  return findByIdOrFail(order.id);
};

module.exports = {
  createOrder,
  listMyOrders,
  getMyOrder,
  listOrders,
  getOrderById,
  cancelByCustomer,
  updateStatus,
  updateStaffNotes,
  _buildItemsFromVehicles: buildItemsFromVehicles,
  _toCustomerView: toCustomerView,
};