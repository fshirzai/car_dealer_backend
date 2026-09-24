'use strict';

const mongoose = require('mongoose');
const { STOCK_NUMBER_PREFIX } = require('./vehicle.constants');

const { Schema } = mongoose;

/* ------------------------------------------------------------------ */
/* Counter collection — one document per YYYYMM bucket                 */
/* ------------------------------------------------------------------ */
const counterSchema = new Schema(
  {
    _id: { type: String }, // e.g. "STK-202609"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter =
  mongoose.models.StockCounter ||
  mongoose.model('StockCounter', counterSchema, 'stock_counters');

const currentBucket = () => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${STOCK_NUMBER_PREFIX}-${ym}`;
};

/**
 * Generate a unique stock number: STK-YYYYMM-####
 *
 * Uses an atomic counter (findOneAndUpdate with $inc) so that concurrent
 * calls — even from multiple Node processes — never return the same number.
 */
const generateStockNumber = async () => {
  const bucket = currentBucket();

  const counter = await Counter.findOneAndUpdate(
    { _id: bucket },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const seq = String(counter.seq).padStart(4, '0');
  return `${bucket}-${seq}`;
};

module.exports = { generateStockNumber, Counter };