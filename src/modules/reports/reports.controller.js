'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./reports.service');

const sales = asyncHandler(async (req, res) => {
  const data = await service.getSalesReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const inventory = asyncHandler(async (_req, res) => {
  const data = await service.getInventoryReport();
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const profit = asyncHandler(async (req, res) => {
  const data = await service.getProfitReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const orders = asyncHandler(async (req, res) => {
  const data = await service.getOrdersReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const expenses = asyncHandler(async (req, res) => {
  const data = await service.getExpensesReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

const customers = asyncHandler(async (req, res) => {
  const data = await service.getCustomersReport({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  res.status(StatusCodes.OK).json(ApiResponse.success(data));
});

module.exports = { sales, inventory, profit, orders, expenses, customers };