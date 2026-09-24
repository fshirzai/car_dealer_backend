'use strict';

const Vehicle = require('./vehicle.model');
const Purchase = require('../purchase/purchase.model');
const Sale = require('../sale/sale.model');
const VehicleExpense = require('../vehicleExpense/vehicleExpense.model');
const ApiError = require('../../utils/ApiError');

/**
 * Profit calculation for a single vehicle.
 *
 *   totalCost   = purchasePrice + Σ vehicleExpenses
 *   grossProfit = salePrice - totalCost   (only if a sale exists)
 *
 * Notes:
 *  - GeneralExpense is NEVER included here (dealership-wide, not per-vehicle).
 *  - If no purchase record exists, purchasePrice falls back to the vehicle's
 *    own purchasePrice field (legacy/manual path).
 *  - If no sale exists, salePrice and grossProfit are null.
 */
const getVehicleProfit = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).select(
    '_id stockNumber make model year status currency purchasePrice askingPrice'
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  const [purchase, sale, expenseAgg] = await Promise.all([
    Purchase.findOne({ vehicleId }).select('purchasePrice currency'),
    Sale.findOne({ vehicleId }).select('salePrice currency saleDate channel'),
    VehicleExpense.aggregate([
      { $match: { vehicleId: vehicle._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const purchasePrice = purchase ? purchase.purchasePrice : vehicle.purchasePrice || 0;
  const currency =
    (purchase && purchase.currency) ||
    (sale && sale.currency) ||
    vehicle.currency ||
    'USD';

  const totalExpenses = expenseAgg[0] ? expenseAgg[0].total : 0;
  const totalCost = purchasePrice + totalExpenses;

  const salePrice = sale ? sale.salePrice : null;
  const grossProfit = salePrice === null ? null : salePrice - totalCost;

  return {
    vehicleId: vehicle.id,
    stockNumber: vehicle.stockNumber,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    status: vehicle.status,
    currency,

    purchasePrice,
    totalExpenses,
    totalCost,

    salePrice,
    grossProfit,
    hasSale: sale !== null,
    hasPurchase: purchase !== null,
    saleChannel: sale ? sale.channel : null,
    saleDate: sale ? sale.saleDate : null,
  };
};

/**
 * Aggregate profit report for a date range (based on saleDate).
 * Only includes vehicles with a sale in the given range.
 */
const getProfitReport = async ({ dateFrom, dateTo } = {}) => {
  const match = {};
  if (dateFrom || dateTo) {
    match.saleDate = {};
    if (dateFrom) match.saleDate.$gte = new Date(dateFrom);
    if (dateTo) match.saleDate.$lte = new Date(dateTo);
  }

  const pipeline = [];
  if (Object.keys(match).length > 0) pipeline.push({ $match: match });

  pipeline.push(
    // Join the vehicle to get its purchasePrice fallback
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicleId',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: '$vehicle' },
    // Join purchases to get authoritative purchase price
    {
      $lookup: {
        from: 'purchases',
        localField: 'vehicleId',
        foreignField: 'vehicleId',
        as: 'purchase',
      },
    },
    // Join vehicle expenses and sum them
    {
      $lookup: {
        from: 'vehicleexpenses',
        localField: 'vehicleId',
        foreignField: 'vehicleId',
        as: 'expenses',
      },
    },
    {
      $addFields: {
        purchasePrice: {
          $ifNull: [
            { $arrayElemAt: ['$purchase.purchasePrice', 0] },
            { $ifNull: ['$vehicle.purchasePrice', 0] },
          ],
        },
        totalExpenses: {
          $sum: {
            $map: {
              input: '$expenses',
              as: 'e',
              in: { $ifNull: ['$$e.amount', 0] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        totalCost: { $add: ['$purchasePrice', '$totalExpenses'] },
        grossProfit: {
          $subtract: ['$salePrice', { $add: ['$purchasePrice', '$totalExpenses'] }],
        },
      },
    },
    { $sort: { saleDate: -1 } }
  );

  const items = await Sale.aggregate(pipeline);

  const totals = items.reduce(
    (acc, r) => {
      acc.totalRevenue += r.salePrice || 0;
      acc.totalCost += r.totalCost || 0;
      acc.totalGrossProfit += r.grossProfit || 0;
      acc.count += 1;
      return acc;
    },
    { count: 0, totalRevenue: 0, totalCost: 0, totalGrossProfit: 0 }
  );

  return { items, totals };
};

module.exports = { getVehicleProfit, getProfitReport };