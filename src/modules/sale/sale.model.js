'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { SALE_CHANNEL, PAYMENT_STATUS } = require('../../constants/enums');

const { Schema } = mongoose;

const saleSchema = new Schema(
  {
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      unique: true, // one physical vehicle → at most one sale
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // walk-ins have no account
      index: true,
    },
    salePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD', maxlength: 3 },
    saleDate: { type: Date, required: true, default: Date.now },
    channel: {
      type: String,
      enum: Object.values(SALE_CHANNEL),
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    notes: { type: String, trim: true, default: null, maxlength: 2000 },
    invoiceNumber: {
      type: String,
      trim: true,
      default: null,
      maxlength: 60,
      index: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

saleSchema.plugin(baseSchemaPlugin);

saleSchema.index({ saleDate: -1 });
saleSchema.index({ customerId: 1, saleDate: -1 });

module.exports = mongoose.model('Sale', saleSchema);