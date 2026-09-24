'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./sale.service');

const create = asyncHandler(async (req, res) => {
  const sale = await service.createSale(req.body, req.user.id);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(sale, 'Sale created'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listSales(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Sales fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const sale = await service.getSaleById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(sale));
});

const update = asyncHandler(async (req, res) => {
  const sale = await service.updateSale(req.params.id, req.body, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(sale, 'Sale updated'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteSale(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Sale deleted'));
});

module.exports = { create, list, getById, update, remove };