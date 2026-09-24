'use strict';

const mongoose = require('mongoose');
const { SALE_NUMBER_PREFIX } = require('./sale.constants');

const { Schema } = mongoose;

const counterSchema = new Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);

const Counter =
  mongoose.models.SaleCounter ||
  mongoose.model('SaleCounter', counterSchema, 'sale_counters');

const currentBucket = () => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${SALE_NUMBER_PREFIX}-${ym}`;
};

const generateSaleNumber = async () => {
  const bucket = currentBucket();
  const counter = await Counter.findOneAndUpdate(
    { _id: bucket },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const seq = String(counter.seq).padStart(4, '0');
  return `${bucket}-${seq}`;
};

module.exports = { generateSaleNumber, Counter };