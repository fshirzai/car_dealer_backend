'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./favorite.service');

const add = asyncHandler(async (req, res) => {
  const favorite = await service.addFavorite(req.user.id, req.body.vehicleId);
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(favorite, 'Added to favorites'));
});

const remove = asyncHandler(async (req, res) => {
  await service.removeFavorite(req.user.id, req.body.vehicleId);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Removed from favorites'));
});

const removeById = asyncHandler(async (req, res) => {
  await service.removeFavoriteById(req.user.id, req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Favorite removed'));
});

const toggle = asyncHandler(async (req, res) => {
  const result = await service.toggleFavorite(req.user.id, req.body.vehicleId);
  res.status(StatusCodes.OK).json(ApiResponse.success(result));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listFavorites(req.user.id, req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Favorites fetched'));
});

module.exports = { add, remove, removeById, toggle, list };