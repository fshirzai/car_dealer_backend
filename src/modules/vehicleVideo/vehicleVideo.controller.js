'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./vehicleVideo.service');

/* ---------------- Public ---------------- */

const getPublic = asyncHandler(async (req, res) => {
  const video = await service.getByVehicle(req.params.vehicleId);
  res.status(StatusCodes.OK).json(ApiResponse.success(video, 'Video fetched'));
});

/* ---------------- Staff ---------------- */

const upsert = asyncHandler(async (req, res) => {
  const video = await service.upsertVideo(req.params.vehicleId, req.body);
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(video, 'Video saved'));
});

const update = asyncHandler(async (req, res) => {
  const video = await service.updateVideo(req.params.vehicleId, req.body);
  res.status(StatusCodes.OK).json(ApiResponse.success(video, 'Video updated'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteVideo(req.params.vehicleId);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Video deleted'));
});

module.exports = { getPublic, upsert, update, remove };