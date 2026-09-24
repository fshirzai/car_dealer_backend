'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./order.service');

/* ---------------- Customer ---------------- */

const create = asyncHandler(async (req, res) => {
  const order = await service.createOrder(req.user.id, req.body);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(order, 'Order placed'));
});

const listMine = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMyOrders(req.user.id, req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Orders fetched'));
});

const getMine = asyncHandler(async (req, res) => {
  const order = await service.getMyOrder(req.user.id, req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(order));
});

const cancelMine = asyncHandler(async (req, res) => {
  const order = await service.cancelByCustomer(
    req.user.id,
    req.params.id,
    req.body.reason
  );
  res.status(StatusCodes.OK).json(ApiResponse.success(order, 'Order cancelled'));
});

/* ---------------- Staff ---------------- */

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listOrders(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Orders fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const order = await service.getOrderById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(order));
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await service.updateStatus(req.params.id, req.body.status, {
    cancelReason: req.body.cancelReason,
    actorId: req.user.id,
  });
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(order, 'Order status updated'));
});

const updateStaffNotes = asyncHandler(async (req, res) => {
  const order = await service.updateStaffNotes(
    req.params.id,
    req.body.staffNotes,
    req.user.id
  );
  res
    .status(StatusCodes.OK)
    .json(ApiResponse.success(order, 'Staff notes updated'));
});

module.exports = {
  create,
  listMine,
  getMine,
  cancelMine,
  list,
  getById,
  updateStatus,
  updateStaffNotes,
};