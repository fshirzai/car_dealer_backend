'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./vehicleImage.service');

/* ---------------- Public ---------------- */

const listPublic = asyncHandler(async (req, res) => {
  const images = await service.listByVehicle(req.params.vehicleId);
  res.status(StatusCodes.OK).json(ApiResponse.success(images, 'Images fetched'));
});

/* ---------------- Staff ---------------- */

const create = asyncHandler(async (req, res) => {
  const image = await service.createImage(req.params.vehicleId, req.body);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(image, 'Image created'));
});

const bulkCreate = asyncHandler(async (req, res) => {
  const images = await service.bulkCreateImages(
    req.params.vehicleId,
    req.body.images
  );
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(images, 'Images created'));
});

const update = asyncHandler(async (req, res) => {
  const image = await service.updateImage(req.params.id, req.body);
  res.status(StatusCodes.OK).json(ApiResponse.success(image, 'Image updated'));
});

const setPrimary = asyncHandler(async (req, res) => {
  const image = await service.setPrimary(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(image, 'Primary image set'));
});

const reorder = asyncHandler(async (req, res) => {
  const images = await service.reorderImages(req.params.vehicleId, req.body.order);
  res.status(StatusCodes.OK).json(ApiResponse.success(images, 'Images reordered'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteImage(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Image deleted'));
});

module.exports = {
  listPublic,
  create,
  bulkCreate,
  update,
  setPrimary,
  reorder,
  remove,
};