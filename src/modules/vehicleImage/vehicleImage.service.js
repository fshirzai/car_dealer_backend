'use strict';

const VehicleImage = require('./vehicleImage.model');
const Vehicle = require('../vehicle/vehicle.model');
const ApiError = require('../../utils/ApiError');
const { VEHICLE_IMAGE_SELECT_FIELDS } = require('./vehicleImage.constants');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const assertVehicleExists = async (vehicleId) => {
  const exists = await Vehicle.exists({ _id: vehicleId });
  if (!exists) throw ApiError.notFound('Vehicle not found');
};

const findByIdOrFail = async (id) => {
  const image = await VehicleImage.findById(id).select(VEHICLE_IMAGE_SELECT_FIELDS);
  if (!image) throw ApiError.notFound('Vehicle image not found');
  return image;
};

const listByVehicle = async (vehicleId) => {
  await assertVehicleExists(vehicleId);
  return VehicleImage.find({ vehicleId })
    .select(VEHICLE_IMAGE_SELECT_FIELDS)
    .sort({ sortOrder: 1, createdAt: 1 });
};

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a single image.
 * - First image of a vehicle is automatically primary.
 * - If `isPrimary: true` is passed, previous primary is demoted.
 */
const createImage = async (vehicleId, payload) => {
  await assertVehicleExists(vehicleId);

  const existingCount = await VehicleImage.countDocuments({ vehicleId });
  const becomesPrimary = existingCount === 0 ? true : payload.isPrimary === true;

  if (becomesPrimary && existingCount > 0) {
    await VehicleImage.updateMany(
      { vehicleId, isPrimary: true },
      { $set: { isPrimary: false } }
    );
  }

  const sortOrder = payload.sortOrder !== undefined ? payload.sortOrder : existingCount;

  const image = await VehicleImage.create({
    vehicleId,
    url: payload.url.trim(),
    altText: payload.altText || null,
    sortOrder,
    isPrimary: becomesPrimary,
  });

  return findByIdOrFail(image.id);
};

/**
 * Bulk create. First image in the array (or the first-ever image of the
 * vehicle if the array is empty) becomes primary.
 */
const bulkCreateImages = async (vehicleId, images) => {
  await assertVehicleExists(vehicleId);

  const existingCount = await VehicleImage.countDocuments({ vehicleId });
  const startingOrder = existingCount;

  const docs = images.map((img, index) => ({
    vehicleId,
    url: img.url.trim(),
    altText: img.altText || null,
    sortOrder: img.sortOrder !== undefined ? img.sortOrder : startingOrder + index,
    // First image in the array is primary only if none exists yet
    isPrimary: existingCount === 0 && index === 0,
  }));

  const created = await VehicleImage.insertMany(docs);
  return VehicleImage.find({ _id: { $in: created.map((d) => d._id) } })
    .select(VEHICLE_IMAGE_SELECT_FIELDS)
    .sort({ sortOrder: 1 });
};

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

const updateImage = async (id, payload) => {
  const image = await findByIdOrFail(id);

  if (payload.url !== undefined) image.url = payload.url.trim();
  if (payload.altText !== undefined) image.altText = payload.altText || null;
  if (payload.sortOrder !== undefined) image.sortOrder = payload.sortOrder;

  await image.save();
  return findByIdOrFail(id);
};

const setPrimary = async (id) => {
  const image = await findByIdOrFail(id);

  // Atomic demote of any current primary for the same vehicle
  await VehicleImage.updateMany(
    { vehicleId: image.vehicleId, isPrimary: true, _id: { $ne: image.id } },
    { $set: { isPrimary: false } }
  );

  if (!image.isPrimary) {
    image.isPrimary = true;
    await image.save();
  }

  return findByIdOrFail(id);
};

/**
 * Reorder images by providing an array of image ids in the desired order.
 * Only images belonging to `vehicleId` are accepted.
 */
const reorderImages = async (vehicleId, order) => {
  await assertVehicleExists(vehicleId);

  const images = await VehicleImage.find({ vehicleId }).select('_id');
  const owned = new Set(images.map((i) => i.id.toString()));

  const invalid = order.filter((id) => !owned.has(id));
  if (invalid.length > 0) {
    throw ApiError.badRequest('Some image ids do not belong to this vehicle');
  }

  // Assign incremental sortOrder based on given order
  const ops = order.map((id, index) => ({
    updateOne: {
      filter: { _id: id, vehicleId },
      update: { $set: { sortOrder: index } },
    },
  }));

  await VehicleImage.bulkWrite(ops);

  return listByVehicle(vehicleId);
};

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

/**
 * Delete an image. If it was primary, the next image (by sortOrder) is promoted.
 */
const deleteImage = async (id) => {
  const image = await VehicleImage.findById(id);
  if (!image) throw ApiError.notFound('Vehicle image not found');

  const wasPrimary = image.isPrimary;
  const vehicleId = image.vehicleId;

  await image.deleteOne();

  if (wasPrimary) {
    const next = await VehicleImage.findOne({ vehicleId }).sort({ sortOrder: 1, createdAt: 1 });
    if (next) {
      next.isPrimary = true;
      await next.save();
    }
  }

  return true;
};

/**
 * Delete all images for a vehicle (used for cascade delete).
 */
const deleteByVehicle = async (vehicleId) => {
  const result = await VehicleImage.deleteMany({ vehicleId });
  return result.deletedCount || 0;
};

module.exports = {
  createImage,
  bulkCreateImages,
  listByVehicle,
  updateImage,
  setPrimary,
  reorderImages,
  deleteImage,
  deleteByVehicle,
};