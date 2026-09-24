'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./auditLog.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listLogs(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Audit logs fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const log = await service.getLogById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(log));
});

const listByEntity = asyncHandler(async (req, res) => {
  const logs = await service.listByEntity(
    req.params.entityType,
    req.params.entityId
  );
  res.status(StatusCodes.OK).json(ApiResponse.success(logs));
});

module.exports = { list, getById, listByEntity };