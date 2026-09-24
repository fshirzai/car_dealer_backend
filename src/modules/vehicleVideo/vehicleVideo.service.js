'use strict';

const VehicleVideo = require('./vehicleVideo.model');
const Vehicle = require('../vehicle/vehicle.model');
const ApiError = require('../../utils/ApiError');
const { VEHICLE_VIDEO_SELECT_FIELDS } = require('./vehicleVideo.constants');

const assertVehicleExists = async (vehicleId) => {
  const exists = await Vehicle.exists({ _id: vehicleId });
  if (!exists) throw ApiError.notFound('Vehicle not found');
};

const getByVehicle = async (vehicleId) => {
  const video = await VehicleVideo.findOne({ vehicleId }).select(
    VEHICLE_VIDEO_SELECT_FIELDS
  );
  return video; // may be null
};

/**
 * Upsert — create if none exists, update if one exists.
 * This matches V1's "at most one video per vehicle" rule.
 */
const upsertVideo = async (vehicleId, payload) => {
  await assertVehicleExists(vehicleId);

  const video = await VehicleVideo.findOneAndUpdate(
    { vehicleId },
    {
      $set: {
        url: payload.url.trim(),
        thumbnailUrl: payload.thumbnailUrl ? payload.thumbnailUrl.trim() : null,
        title: payload.title ? payload.title.trim() : null,
      },
      $setOnInsert: { vehicleId },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).select(VEHICLE_VIDEO_SELECT_FIELDS);

  return video;
};

const updateVideo = async (vehicleId, payload) => {
  const video = await VehicleVideo.findOne({ vehicleId });
  if (!video) throw ApiError.notFound('Vehicle video not found');

  if (payload.url !== undefined) video.url = payload.url.trim();
  if (payload.thumbnailUrl !== undefined)
    video.thumbnailUrl = payload.thumbnailUrl ? payload.thumbnailUrl.trim() : null;
  if (payload.title !== undefined)
    video.title = payload.title ? payload.title.trim() : null;

  await video.save();
  return VehicleVideo.findById(video.id).select(VEHICLE_VIDEO_SELECT_FIELDS);
};

const deleteVideo = async (vehicleId) => {
  const result = await VehicleVideo.deleteOne({ vehicleId });
  if (result.deletedCount === 0) {
    throw ApiError.notFound('Vehicle video not found');
  }
  return true;
};

module.exports = {
  getByVehicle,
  upsertVideo,
  updateVideo,
  deleteVideo,
};