'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./seller.service');

const create = asyncHandler(async (req, res) => {
  const seller = await service.createSeller(req.body, req.user.id);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(seller, 'Seller created'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listSellers(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Sellers fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const seller = await service.getSellerById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(seller));
});

const update = asyncHandler(async (req, res) => {
  const seller = await service.updateSeller(req.params.id, req.body, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(seller, 'Seller updated'));
});

const deactivate = asyncHandler(async (req, res) => {
  const seller = await service.deactivateSeller(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(seller, 'Seller deactivated'));
});

const activate = asyncHandler(async (req, res) => {
  const seller = await service.activateSeller(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(seller, 'Seller activated'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteSeller(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Seller deleted'));
});

module.exports = { create, list, getById, update, deactivate, activate, remove };