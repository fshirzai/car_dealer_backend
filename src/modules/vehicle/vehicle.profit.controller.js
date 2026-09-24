'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./vehicle.profit.service');

const getVehicle = asyncHandler(async (req, res) => {
  const data = await service.getVehicleProfit(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const getReport = asyncHandler(async (req, res) => {
  const data = await service.getProfitReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

module.exports = { getVehicle, getReport };