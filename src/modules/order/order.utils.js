'use strict';

const mongoose = require('mongoose');
const { ORDER_NUMBER_PREFIX } = require('./order.constants');

const { Schema } = mongoose;

/* ------------------------------------------------------------------ */
/* Counter collection — one document per (prefix, bucket)              */
/* ------------------------------------------------------------------ */
const counterSchema = new Schema(
  {
    _id: { type: String }, // e.g. "ORD-202609"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter =
  mongoose.models.OrderCounter ||
  mongoose.model('OrderCounter', counterSchema, 'order_counters');

const currentBucket = () => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${ORDER_NUMBER_PREFIX}-${ym}`;
};

/**
 * Generate a unique order number: ORD-YYYYMM-####
 * Uses an atomic counter (findOneAndUpdate + $inc).
 */
const generateOrderNumber = async () => {
  const bucket = currentBucket();

  const counter = await Counter.findOneAndUpdate(
    { _id: bucket },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const seq = String(counter.seq).padStart(4, '0');
  return `${bucket}-${seq}`;
};

module.exports = { generateOrderNumber, Counter };