'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./generalExpense.service');

const create = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(req.body, req.user.id);
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(expense, 'General expense recorded'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listExpenses(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Expenses fetched'));
});

const summary = asyncHandler(async (req, res) => {
  const data = await service.getSummary({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const getById = asyncHandler(async (req, res) => {
  const expense = await service.getExpenseById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(expense));
});

const update = asyncHandler(async (req, res) => {
  const expense = await service.updateExpense(req.params.id, req.body, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(expense, 'Expense updated'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteExpense(req.params.id, req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Expense deleted'));
});

module.exports = { create, list, summary, getById, update, remove };