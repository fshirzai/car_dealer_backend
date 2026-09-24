'use strict';

const mongoose = require('mongoose');
const { PURCHASE_NUMBER_PREFIX } = require('./purchase.constants');

const { Schema } = mongoose;

const counterSchema = new Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);

const Counter =
  mongoose.models.PurchaseCounter ||
  mongoose.model('PurchaseCounter', counterSchema, 'purchase_counters');

const currentBucket = () => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${PURCHASE_NUMBER_PREFIX}-${ym}`;
};

const generatePurchaseNumber = async () => {
  const bucket = currentBucket();
  const counter = await Counter.findOneAndUpdate(
    { _id: bucket },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const seq = String(counter.seq).padStart(4, '0');
  return `${bucket}-${seq}`;
};

module.exports = { generatePurchaseNumber, Counter };