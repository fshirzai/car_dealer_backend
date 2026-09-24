'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./purchase.service');

const create = asyncHandler(async (req, res) => {
  const purchase = await service.createPurchase(req.body, req.user.id);
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(purchase, 'Purchase created'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPurchases(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Purchases fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const purchase = await service.getPurchaseById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(purchase));
});

const update = asyncHandler(async (req, res) => {
  const purchase = await service.updatePurchase(req.params.id, req.body, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(purchase, 'Purchase updated'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deletePurchase(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Purchase deleted'));
});

module.exports = { create, list, getById, update, remove };