'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./cartItem.service');

const add = asyncHandler(async (req, res) => {
  const item = await service.addToCart(req.user.id, req.body.vehicleId);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(item, 'Added to cart'));
});

const remove = asyncHandler(async (req, res) => {
  await service.removeFromCart(req.user.id, req.body.vehicleId);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Removed from cart'));
});

const removeById = asyncHandler(async (req, res) => {
  await service.removeCartItemById(req.user.id, req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Cart item removed'));
});

const clear = asyncHandler(async (req, res) => {
  const result = await service.clearCart(req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Cart cleared'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listCart(req.user.id, req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Cart fetched'));
});

const count = asyncHandler(async (req, res) => {
  const total = await service.countCart(req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success({ count: total }));
});

module.exports = { add, remove, removeById, clear, list, count };