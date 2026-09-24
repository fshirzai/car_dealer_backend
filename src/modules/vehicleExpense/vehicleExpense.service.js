'use strict';

const VehicleExpense = require('./vehicleExpense.model');
const Vehicle = require('../vehicle/vehicle.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { VEHICLE_STATUS } = require('../../constants/enums');
const { emit } = require('../auditLog/auditLog.utils');
const {
  VEHICLE_EXPENSE_SELECT_FIELDS,
  VEHICLE_EXPENSE_VEHICLE_POPULATE,
  VEHICLE_EXPENSE_CREATED_BY_POPULATE,
} = require('./vehicleExpense.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nullify = (v) => (v === '' || v === undefined ? null : v);

const populateAll = (q) =>
  q
    .populate(VEHICLE_EXPENSE_VEHICLE_POPULATE)
    .populate(VEHICLE_EXPENSE_CREATED_BY_POPULATE);

const findByIdOrFail = async (id) => {
  const expense = await populateAll(
    VehicleExpense.findById(id).select(VEHICLE_EXPENSE_SELECT_FIELDS)
  );
  if (!expense) throw ApiError.notFound('Vehicle expense not found');
  return expense;
};

const createExpense = async (payload, createdById) => {
  const vehicle = await Vehicle.findById(payload.vehicleId).select(
    '_id stockNumber status'
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  if (vehicle.status === VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest(
      'Cannot add an expense to a SOLD vehicle (its cost is frozen)'
    );
  }

  const expense = await VehicleExpense.create({
    vehicleId: vehicle.id,
    category: payload.category,
    description: payload.description.trim(),
    amount: payload.amount,
    currency: payload.currency || 'USD',
    expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
    documentUrl: nullify(payload.documentUrl),
    notes: nullify(payload.notes),
    createdById,
  });

  await emit({
    action: 'CREATE',
    entityType: 'VehicleExpense',
    entityId: expense.id,
    userId: createdById,
    description: `Recorded ${expense.category} expense of $${expense.amount} for vehicle ${vehicle.stockNumber}`,
    newValues: expense.toObject(),
  });

  return findByIdOrFail(expense.id);
};

const listExpenses = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.category) filter.category = query.category;

  if (query.dateFrom || query.dateTo) {
    filter.expenseDate = {};
    if (query.dateFrom) filter.expenseDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.expenseDate.$lte = new Date(query.dateTo);
  }

  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [{ description: { $regex: s, $options: 'i' } }];
  }

  const sort = query.sort || '-expenseDate';

  const [items, total] = await Promise.all([
    populateAll(
      VehicleExpense.find(filter)
        .select(VEHICLE_EXPENSE_SELECT_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
    ),
    VehicleExpense.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getExpenseById = async (id) => findByIdOrFail(id);

const listByVehicle = async (vehicleId) => {
  const exists = await Vehicle.exists({ _id: vehicleId });
  if (!exists) throw ApiError.notFound('Vehicle not found');

  return populateAll(
    VehicleExpense.find({ vehicleId })
      .select(VEHICLE_EXPENSE_SELECT_FIELDS)
      .sort({ expenseDate: -1 })
  );
};

const sumByVehicle = async (vehicleId) => {
  const agg = await VehicleExpense.aggregate([
    { $match: { vehicleId: require('mongoose').Types.ObjectId.createFromHexString(vehicleId) } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const byCategory = {};
  let total = 0;
  agg.forEach((row) => {
    byCategory[row._id] = row.total;
    total += row.total;
  });

  return { total, byCategory };
};

const updateExpense = async (id, payload, actorId = null) => {
  const expense = await VehicleExpense.findById(id);
  if (!expense) throw ApiError.notFound('Vehicle expense not found');

  const vehicle = await Vehicle.findById(expense.vehicleId).select('status');
  if (vehicle && vehicle.status === VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest(
      'Cannot edit an expense for a SOLD vehicle (its cost is frozen)'
    );
  }

  const before = expense.toObject();

  const directFields = ['category', 'description', 'amount', 'currency', 'documentUrl', 'notes'];
  directFields.forEach((key) => {
    if (payload[key] === undefined) return;
    if (key === 'description') {
      expense.description = payload.description.trim();
    } else if (key === 'documentUrl' || key === 'notes') {
      expense[key] = nullify(payload[key]);
    } else {
      expense[key] = payload[key];
    }
  });

  if (payload.expenseDate !== undefined) {
    expense.expenseDate = new Date(payload.expenseDate);
  }

  await expense.save();

  await emit({
    action: 'UPDATE',
    entityType: 'VehicleExpense',
    entityId: expense.id,
    userId: actorId,
    description: `Updated ${expense.category} expense`,
    oldValues: before,
    newValues: expense.toObject(),
  });

  return findByIdOrFail(expense.id);
};

const deleteExpense = async (id, actorId = null) => {
  const expense = await VehicleExpense.findById(id);
  if (!expense) throw ApiError.notFound('Vehicle expense not found');

  const vehicle = await Vehicle.findById(expense.vehicleId).select('status');
  if (vehicle && vehicle.status === VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest(
      'Cannot delete an expense for a SOLD vehicle (its cost is frozen)'
    );
  }

  const snapshot = expense.toObject();
  await expense.deleteOne();

  await emit({
    action: 'DELETE',
    entityType: 'VehicleExpense',
    entityId: id,
    userId: actorId,
    description: `Deleted ${snapshot.category} expense of $${snapshot.amount}`,
    oldValues: snapshot,
  });

  return true;
};

const deleteByVehicle = async (vehicleId) => {
  const result = await VehicleExpense.deleteMany({ vehicleId });
  return result.deletedCount || 0;
};

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  listByVehicle,
  sumByVehicle,
  updateExpense,
  deleteExpense,
  deleteByVehicle,
};