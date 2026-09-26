'use strict';

const mongoose = require('mongoose');
const Sale = require('../sale/sale.model');
const Vehicle = require('../vehicle/vehicle.model');
const Purchase = require('../purchase/purchase.model');
const VehicleExpense = require('../vehicleExpense/vehicleExpense.model');
const GeneralExpense = require('../generalExpense/generalExpense.model');
const Order = require('../order/order.model');
const User = require('../user/user.model');
const { VEHICLE_STATUS, ORDER_STATUS, SALE_CHANNEL } = require('../../constants/enums');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const buildDateMatch = (dateFrom, dateTo, field = 'saleDate') => {
  const match = {};
  if (dateFrom || dateTo) {
    match[field] = {};
    if (dateFrom) match[field].$gte = new Date(dateFrom);
    if (dateTo) match[field].$lte = new Date(dateTo);
  }
  return match;
};

/* ------------------------------------------------------------------ */
/* SALES REPORT                                                        */
/* ------------------------------------------------------------------ */
/**
 * Returns:
 *  - summary: total sales, total revenue, avg sale price
 *  - byMonth: array of { month, count, revenue }
 *  - byChannel: { ONLINE, OFFLINE }
 *  - byPaymentStatus: { PAID, PENDING, ... }
 *  - topSales: 5 highest-value sales
 */
const getSalesReport = async ({ dateFrom, dateTo } = {}) => {
  const match = buildDateMatch(dateFrom, dateTo, 'saleDate');

  const [summaryAgg, byMonthAgg, byChannelAgg, byPaymentAgg, topSales] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          revenue: { $sum: '$salePrice' },
          avgPrice: { $avg: '$salePrice' },
        },
      },
    ]),

    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$salePrice' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    Sale.aggregate([
      { $match: match },
      { $group: { _id: '$channel', count: { $sum: 1 }, revenue: { $sum: '$salePrice' } } },
    ]),

    Sale.aggregate([
      { $match: match },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, revenue: { $sum: '$salePrice' } } },
    ]),

    Sale.find(match)
      .sort({ salePrice: -1 })
      .limit(5)
      .populate('vehicleId', 'stockNumber make model year')
      .populate('customerId', 'name email')
      .select('saleNumber salePrice currency saleDate channel')
      .lean(),
  ]);

  const summary = summaryAgg[0] ?? { total: 0, revenue: 0, avgPrice: 0 };

  return {
    summary: {
      totalSales: summary.total,
      totalRevenue: summary.revenue,
      averageSalePrice: Math.round(summary.avgPrice || 0),
    },
    byMonth: byMonthAgg.map((row) => ({
      month: `${row._id.year}-${String(row._id.month).padStart(2, '0')}`,
      count: row.count,
      revenue: row.revenue,
    })),
    byChannel: Object.fromEntries(
      byChannelAgg.map((row) => [row._id, { count: row.count, revenue: row.revenue }])
    ),
    byPaymentStatus: Object.fromEntries(
      byPaymentAgg.map((row) => [row._id, { count: row.count, revenue: row.revenue }])
    ),
    topSales,
  };
};

/* ------------------------------------------------------------------ */
/* INVENTORY REPORT                                                    */
/* ------------------------------------------------------------------ */
/**
 * Returns:
 *  - summary: { total, available, reserved, sold, published, totalCost, totalAskingValue }
 *  - byMake: top makes by count
 *  - byBodyType, byFuelType, byCondition
 *  - aging: vehicles grouped by age bracket (< 30d, 30-60d, 60-90d, > 90d)
 */
const getInventoryReport = async () => {
  const now = new Date();
  const day = 1000 * 60 * 60 * 24;

  const [statusAgg, makeAgg, bodyAgg, fuelAgg, condAgg, costAgg, agingAgg] = await Promise.all([
    Vehicle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    Vehicle.aggregate([
      { $group: { _id: '$make', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    Vehicle.aggregate([
      { $group: { _id: '$bodyType', count: { $sum: 1 } } },
    ]),

    Vehicle.aggregate([
      { $group: { _id: '$fuelType', count: { $sum: 1 } } },
    ]),

    Vehicle.aggregate([
      { $group: { _id: '$condition', count: { $sum: 1 } } },
    ]),

    Vehicle.aggregate([
      { $match: { status: { $ne: VEHICLE_STATUS.SOLD } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$purchasePrice' },
          totalAskingValue: { $sum: '$askingPrice' },
          published: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] },
          },
        },
      },
    ]),

    Vehicle.aggregate([
      { $match: { status: { $ne: VEHICLE_STATUS.SOLD } } },
      {
        $bucket: {
          groupBy: {
            $divide: [{ $subtract: [now, '$createdAt'] }, day],
          },
          boundaries: [0, 30, 60, 90, Infinity],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
  ]);

  const statusMap = Object.fromEntries(statusAgg.map((r) => [r._id, r.count]));
  const costs = costAgg[0] ?? { totalCost: 0, totalAskingValue: 0, published: 0 };

  return {
    summary: {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      available: statusMap[VEHICLE_STATUS.AVAILABLE] || 0,
      reserved: statusMap[VEHICLE_STATUS.RESERVED] || 0,
      sold: statusMap[VEHICLE_STATUS.SOLD] || 0,
      published: costs.published,
      totalCost: costs.totalCost,
      totalAskingValue: costs.totalAskingValue,
      potentialProfit: costs.totalAskingValue - costs.totalCost,
    },
    byMake: makeAgg.map((r) => ({ make: r._id, count: r.count })),
    byBodyType: Object.fromEntries(bodyAgg.map((r) => [r._id, r.count])),
    byFuelType: Object.fromEntries(fuelAgg.map((r) => [r._id, r.count])),
    byCondition: Object.fromEntries(condAgg.map((r) => [r._id, r.count])),
    aging: {
      under30: agingAgg.find((r) => r._id === 0)?.count || 0,
      under60: agingAgg.find((r) => r._id === 30)?.count || 0,
      under90: agingAgg.find((r) => r._id === 60)?.count || 0,
      over90: agingAgg.find((r) => r._id === 90)?.count || 0,
    },
  };
};

/* ------------------------------------------------------------------ */
/* PROFIT REPORT                                                       */
/* ------------------------------------------------------------------ */
/**
 * Aggregate profit using the same logic as the vehicle profit endpoint.
 * Combines sale + purchase + vehicle expenses to compute per-vehicle profit.
 */
const getProfitReport = async ({ dateFrom, dateTo } = {}) => {
  const match = buildDateMatch(dateFrom, dateTo, 'saleDate');

  const items = await Sale.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicleId',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: '$vehicle' },
    {
      $lookup: {
        from: 'purchases',
        localField: 'vehicleId',
        foreignField: 'vehicleId',
        as: 'purchase',
      },
    },
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
            $map: { input: '$expenses', as: 'e', in: { $ifNull: ['$$e.amount', 0] } },
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
        margin: {
          $cond: [
            { $gt: ['$salePrice', 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ['$salePrice', { $add: ['$purchasePrice', '$totalExpenses'] }] },
                    '$salePrice',
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { saleDate: -1 } },
  ]);

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

  totals.avgProfit = totals.count > 0 ? totals.totalGrossProfit / totals.count : 0;
  totals.avgMargin = totals.totalRevenue > 0 ? (totals.totalGrossProfit / totals.totalRevenue) * 100 : 0;

  // Group by month
  const byMonth = {};
  items.forEach((r) => {
    if (!r.saleDate) return;
    const d = new Date(r.saleDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { month: key, revenue: 0, cost: 0, profit: 0, count: 0 };
    byMonth[key].revenue += r.salePrice || 0;
    byMonth[key].cost += r.totalCost || 0;
    byMonth[key].profit += r.grossProfit || 0;
    byMonth[key].count += 1;
  });

  return {
    items: items.map((r) => ({
      saleId: r._id,
      saleNumber: r.saleNumber,
      vehicle: r.vehicle,
      salePrice: r.salePrice,
      purchasePrice: r.purchasePrice,
      totalExpenses: r.totalExpenses,
      totalCost: r.totalCost,
      grossProfit: r.grossProfit,
      margin: r.margin,
      saleDate: r.saleDate,
      channel: r.channel,
    })),
    totals,
    byMonth: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
  };
};

/* ------------------------------------------------------------------ */
/* ORDERS REPORT                                                       */
/* ------------------------------------------------------------------ */
const getOrdersReport = async ({ dateFrom, dateTo } = {}) => {
  const match = buildDateMatch(dateFrom, dateTo, 'createdAt');

  const [statusAgg, byMonthAgg, totalAgg] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    Order.aggregate([
      { $match: match },
      { $count: 'total' },
    ]),
  ]);

  const statusMap = Object.fromEntries(statusAgg.map((r) => [r._id, r.count]));
  const total = totalAgg[0]?.total ?? 0;

  const completed = statusMap[ORDER_STATUS.COMPLETED] || 0;
  const cancelled = statusMap[ORDER_STATUS.CANCELLED] || 0;

  return {
    summary: {
      total,
      pending: statusMap[ORDER_STATUS.PENDING] || 0,
      contacted: statusMap[ORDER_STATUS.CONTACTED] || 0,
      confirmed: statusMap[ORDER_STATUS.CONFIRMED] || 0,
      completed,
      cancelled,
      conversionRate: total > 0 ? (completed / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
    },
    byMonth: byMonthAgg.map((r) => ({
      month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
      count: r.count,
    })),
  };
};

/* ------------------------------------------------------------------ */
/* EXPENSES REPORT                                                     */
/* ------------------------------------------------------------------ */
const getExpensesReport = async ({ dateFrom, dateTo } = {}) => {
  const vehicleMatch = buildDateMatch(dateFrom, dateTo, 'expenseDate');
  const generalMatch = buildDateMatch(dateFrom, dateTo, 'expenseDate');

  const [vehicleAgg, generalAgg] = await Promise.all([
    VehicleExpense.aggregate([
      { $match: vehicleMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    GeneralExpense.aggregate([
      { $match: generalMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const vehicleTotal = vehicleAgg.reduce((s, r) => s + r.total, 0);
  const generalTotal = generalAgg.reduce((s, r) => s + r.total, 0);

  return {
    summary: {
      totalVehicle: vehicleTotal,
      totalGeneral: generalTotal,
      total: vehicleTotal + generalTotal,
    },
    vehicle: vehicleAgg.map((r) => ({ category: r._id, total: r.total, count: r.count })),
    general: generalAgg.map((r) => ({ category: r._id, total: r.total, count: r.count })),
  };
};

/* ------------------------------------------------------------------ */
/* CUSTOMERS REPORT                                                    */
/* ------------------------------------------------------------------ */
const getCustomersReport = async ({ dateFrom, dateTo } = {}) => {
  const [summary, topCustomers] = await Promise.all([
    User.aggregate([
      { $match: { role: 'CUSTOMER' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $ne: ['$emailVerifiedAt', null] }, 1, 0] } },
        },
      },
    ]),

    Sale.aggregate([
      { $match: { customerId: { $ne: null } } },
      {
        $group: {
          _id: '$customerId',
          totalSpent: { $sum: '$salePrice' },
          purchaseCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          customerId: '$_id',
          name: '$user.name',
          email: '$user.email',
          totalSpent: 1,
          purchaseCount: 1,
        },
      },
    ]),
  ]);

  const s = summary[0] ?? { total: 0, active: 0, verified: 0 };

  return {
    summary: {
      totalCustomers: s.total,
      activeCustomers: s.active,
      verifiedCustomers: s.verified,
    },
    topCustomers,
  };
};

module.exports = {
  getSalesReport,
  getInventoryReport,
  getProfitReport,
  getOrdersReport,
  getExpensesReport,
  getCustomersReport,
};