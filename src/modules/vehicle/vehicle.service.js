'use strict';

const Vehicle = require('./vehicle.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { VEHICLE_SELECT_FIELDS, VEHICLE_PUBLIC_FIELDS } = require('./vehicle.constants');
const { generateStockNumber } = require('./vehicle.utils');
const { VEHICLE_STATUS } = require('../../constants/enums');
const { emit } = require('../auditLog/auditLog.utils');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nullify = (v) => (v === '' || v === undefined ? null : v);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toPublic = (vehicle) => {
  if (!vehicle) return null;
  const obj = vehicle.toObject ? vehicle.toObject() : vehicle;
  const normalized = {
    ...obj,
    id: obj.id ? String(obj.id) : obj._id ? String(obj._id) : undefined,
  };
  return VEHICLE_PUBLIC_FIELDS.reduce((acc, key) => {
    if (normalized[key] !== undefined) acc[key] = normalized[key];
    return acc;
  }, {});
};

const findByIdOrFail = async (id) => {
  const vehicle = await Vehicle.findById(id).select(VEHICLE_SELECT_FIELDS);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  return vehicle;
};

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

const createVehicle = async (payload, actorId = null) => {
  const stockNumber = await generateStockNumber();

  if (payload.vin) {
    const dup = await Vehicle.findOne({ vin: payload.vin.toUpperCase() });
    if (dup) throw ApiError.conflict('VIN already exists');
  }
  if (payload.engineNumber) {
    const dup = await Vehicle.findOne({
      engineNumber: payload.engineNumber.toUpperCase(),
    });
    if (dup) throw ApiError.conflict('Engine number already exists');
  }

  const doc = await Vehicle.create({
    stockNumber,
    vin: payload.vin ? payload.vin.toUpperCase() : null,
    engineNumber: payload.engineNumber ? payload.engineNumber.toUpperCase() : null,
    make: payload.make.trim(),
    model: payload.model.trim(),
    year: payload.year,
    trim: nullify(payload.trim),
    color: nullify(payload.color),
    bodyType: payload.bodyType,
    fuelType: payload.fuelType,
    transmission: payload.transmission,
    driveType: payload.driveType,
    condition: payload.condition,
    mileage: payload.mileage,
    mileageUnit: payload.mileageUnit,
    description: nullify(payload.description),
    purchasePrice: payload.purchasePrice,
    askingPrice: payload.askingPrice,
    currency: payload.currency || 'USD',
    status: VEHICLE_STATUS.AVAILABLE,
    isPublished: payload.isPublished === true,
  });

  await emit({
    action: 'CREATE',
    entityType: 'Vehicle',
    entityId: doc.id,
    userId: actorId,
    description: `Created vehicle ${doc.stockNumber} — ${doc.make} ${doc.model} (${doc.year})`,
    newValues: doc.toObject(),
  });

  return Vehicle.findById(doc.id).select(VEHICLE_SELECT_FIELDS);
};

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const buildFilter = (query, { publicOnly = false } = {}) => {
  const filter = {};

  if (publicOnly) {
    filter.isPublished = true;
    filter.status = { $in: [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.RESERVED] };
  } else {
    if (query.isPublished !== undefined) filter.isPublished = query.isPublished;
    if (query.status) filter.status = query.status;
  }

  if (query.make) {
    filter.make = { $regex: `^${escapeRegex(query.make)}$`, $options: 'i' };
  }
  if (query.model) {
    filter.model = { $regex: `^${escapeRegex(query.model)}$`, $options: 'i' };
  }
  if (query.yearMin || query.yearMax) {
    filter.year = {};
    if (query.yearMin) filter.year.$gte = query.yearMin;
    if (query.yearMax) filter.year.$lte = query.yearMax;
  }
  if (query.priceMin || query.priceMax) {
    filter.askingPrice = {};
    if (query.priceMin) filter.askingPrice.$gte = query.priceMin;
    if (query.priceMax) filter.askingPrice.$lte = query.priceMax;
  }
  if (query.mileageMax !== undefined) {
    filter.mileage = { $lte: query.mileageMax };
  }
  if (query.bodyType) filter.bodyType = query.bodyType;
  if (query.fuelType) filter.fuelType = query.fuelType;
  if (query.transmission) filter.transmission = query.transmission;
  if (query.driveType) filter.driveType = query.driveType;
  if (query.condition) filter.condition = query.condition;

  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { make: { $regex: s, $options: 'i' } },
      { model: { $regex: s, $options: 'i' } },
      { stockNumber: { $regex: s, $options: 'i' } },
      { vin: { $regex: s, $options: 'i' } },
      { description: { $regex: s, $options: 'i' } },
    ];
  }

  return filter;
};

const listVehicles = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = buildFilter(query);
  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    Vehicle.find(filter)
      .select(VEHICLE_SELECT_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Vehicle.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const listPublicVehicles = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = buildFilter(query, { publicOnly: true });
  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    Vehicle.find(filter).sort(sort).skip(skip).limit(limit),
    Vehicle.countDocuments(filter),
  ]);

  return {
    items: items.map(toPublic),
    meta: buildPaginationMeta(total, page, limit),
  };
};

const getVehicleById = async (id) => findByIdOrFail(id);

const getPublicVehicleById = async (id) => {
  const vehicle = await Vehicle.findOne({
    _id: id,
    isPublished: true,
    status: { $in: [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.RESERVED] },
  });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  return toPublic(vehicle);
};

const getVehicleByStockNumber = async (stockNumber) => {
  const vehicle = await Vehicle.findOne({ stockNumber });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  return vehicle;
};

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updateVehicle = async (id, payload, actorId = null) => {
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  const before = vehicle.toObject();

  if (payload.vin !== undefined) {
    const vin = payload.vin ? payload.vin.toUpperCase() : null;
    if (vin && vin !== vehicle.vin) {
      const dup = await Vehicle.findOne({ vin, _id: { $ne: vehicle.id } });
      if (dup) throw ApiError.conflict('VIN already exists');
    }
    vehicle.vin = vin;
  }

  if (payload.engineNumber !== undefined) {
    const eng = payload.engineNumber ? payload.engineNumber.toUpperCase() : null;
    if (eng && eng !== vehicle.engineNumber) {
      const dup = await Vehicle.findOne({
        engineNumber: eng,
        _id: { $ne: vehicle.id },
      });
      if (dup) throw ApiError.conflict('Engine number already exists');
    }
    vehicle.engineNumber = eng;
  }

  const directFields = [
    'make', 'model', 'year', 'trim', 'color', 'bodyType', 'fuelType',
    'transmission', 'driveType', 'condition', 'mileage', 'mileageUnit',
    'description', 'purchasePrice', 'askingPrice', 'currency', 'status', 'isPublished',
  ];

  directFields.forEach((key) => {
    if (payload[key] === undefined) return;
    if (['make', 'model'].includes(key)) {
      vehicle[key] = payload[key].trim();
    } else if (['trim', 'color', 'description'].includes(key)) {
      vehicle[key] = nullify(payload[key]);
    } else {
      vehicle[key] = payload[key];
    }
  });

  await vehicle.save();

  await emit({
    action: 'UPDATE',
    entityType: 'Vehicle',
    entityId: vehicle.id,
    userId: actorId,
    description: `Updated vehicle ${vehicle.stockNumber}`,
    oldValues: before,
    newValues: vehicle.toObject(),
  });

  return Vehicle.findById(vehicle.id).select(VEHICLE_SELECT_FIELDS);
};

/* ------------------------------------------------------------------ */
/* Status & publish                                                    */
/* ------------------------------------------------------------------ */

const changeStatus = async (id, status, actorId = null) => {
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  if (vehicle.status === VEHICLE_STATUS.SOLD && status !== VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest('A SOLD vehicle cannot be moved to another status');
  }

  const previousStatus = vehicle.status;
  vehicle.status = status;
  await vehicle.save();

  await emit({
    action: 'STATUS_CHANGE',
    entityType: 'Vehicle',
    entityId: vehicle.id,
    userId: actorId,
    description: `Changed status of ${vehicle.stockNumber} from ${previousStatus} to ${status}`,
    oldValues: { status: previousStatus },
    newValues: { status },
  });

  return Vehicle.findById(vehicle.id).select(VEHICLE_SELECT_FIELDS);
};

const publishVehicle = async (id, actorId = null) => {
  const vehicle = await Vehicle.findByIdAndUpdate(
    id,
    { isPublished: true },
    { new: true }
  ).select(VEHICLE_SELECT_FIELDS);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  await emit({
    action: 'PUBLISH',
    entityType: 'Vehicle',
    entityId: vehicle.id,
    userId: actorId,
    description: `Published vehicle ${vehicle.stockNumber}`,
    newValues: { isPublished: true },
  });

  return vehicle;
};

const unpublishVehicle = async (id, actorId = null) => {
  const vehicle = await Vehicle.findByIdAndUpdate(
    id,
    { isPublished: false },
    { new: true }
  ).select(VEHICLE_SELECT_FIELDS);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  await emit({
    action: 'UNPUBLISH',
    entityType: 'Vehicle',
    entityId: vehicle.id,
    userId: actorId,
    description: `Unpublished vehicle ${vehicle.stockNumber}`,
    newValues: { isPublished: false },
  });

  return vehicle;
};

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

const deleteVehicle = async (id, actorId = null) => {
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (vehicle.status === VEHICLE_STATUS.SOLD) {
    throw ApiError.badRequest('Cannot delete a SOLD vehicle');
  }

  const snapshot = vehicle.toObject();
  await vehicle.deleteOne();

  await emit({
    action: 'DELETE',
    entityType: 'Vehicle',
    entityId: id,
    userId: actorId,
    description: `Deleted vehicle ${snapshot.stockNumber}`,
    oldValues: snapshot,
  });

  return true;
};

module.exports = {
  createVehicle,
  listVehicles,
  listPublicVehicles,
  getVehicleById,
  getPublicVehicleById,
  getVehicleByStockNumber,
  updateVehicle,
  changeStatus,
  publishVehicle,
  unpublishVehicle,
  deleteVehicle,
  _toPublic: toPublic,
  _buildFilter: buildFilter,
};