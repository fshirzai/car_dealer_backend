'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { PAYMENT_STATUS } = require('../../constants/enums');

const { Schema } = mongoose;

const purchaseSchema = new Schema(
  {
    purchaseNumber: {
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
      unique: true, // one vehicle → one purchase
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    purchasePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD', maxlength: 3 },
    purchaseDate: { type: Date, required: true, default: Date.now },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    notes: { type: String, trim: true, default: null, maxlength: 2000 },
    documentUrl: { type: String, trim: true, default: null, maxlength: 2000 },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

purchaseSchema.plugin(baseSchemaPlugin);

purchaseSchema.index({ sellerId: 1, purchaseDate: -1 });
purchaseSchema.index({ purchaseDate: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);