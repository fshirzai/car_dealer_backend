'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./dealershipSettings.service');

const getPublic = asyncHandler(async (_req, res) => {
  const settings = await service.getPublicSettings();
  res.status(StatusCodes.OK).json(ApiResponse.success(settings));
});

const get = asyncHandler(async (_req, res) => {
  const settings = await service.getOrCreate();
  res.status(StatusCodes.OK).json(ApiResponse.success(settings));
});

const upsert = asyncHandler(async (req, res) => {
  const settings = await service.upsertSettings(req.body, req.user.id);
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(settings, 'Dealership settings saved'));
});

const update = asyncHandler(async (req, res) => {
  const settings = await service.updateSettings(req.body, req.user.id);
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(settings, 'Dealership settings updated'));
});

module.exports = { getPublic, get, upsert, update };