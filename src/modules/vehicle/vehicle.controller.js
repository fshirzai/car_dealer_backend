'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./vehicle.service');

/* ---------------------- Public ---------------------- */

const listPublic = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPublicVehicles(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Vehicles fetched'));
});

const getPublicById = asyncHandler(async (req, res) => {
  const vehicle = await service.getPublicVehicleById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(vehicle));
});

/* ---------------------- Staff ---------------------- */

const create = asyncHandler(async (req, res) => {
  const vehicle = await service.createVehicle(req.body, req.user.id);
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(vehicle, 'Vehicle created'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listVehicles(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Vehicles fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const vehicle = await service.getVehicleById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(vehicle));
});

const update = asyncHandler(async (req, res) => {
  const vehicle = await service.updateVehicle(req.params.id, req.body, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(vehicle, 'Vehicle updated'));
});

const changeStatus = asyncHandler(async (req, res) => {
  const vehicle = await service.changeStatus(
    req.params.id,
    req.body.status,
    req.user.id
  );
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(vehicle, 'Vehicle status updated'));
});

const publish = asyncHandler(async (req, res) => {
  const vehicle = await service.publishVehicle(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(vehicle, 'Vehicle published'));
});

const unpublish = asyncHandler(async (req, res) => {
  const vehicle = await service.unpublishVehicle(req.params.id, req.user.id);
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(vehicle, 'Vehicle unpublished'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteVehicle(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Vehicle deleted'));
});

module.exports = {
  listPublic,
  getPublicById,
  create,
  list,
  getById,
  update,
  changeStatus,
  publish,
  unpublish,
  remove,
};