'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');

const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    // V1 always 1 — kept for future bulk purchases
    quantity: { type: Number, default: 1, min: 1, max: 1 },
  },
  { timestamps: true, versionKey: false }
);

cartItemSchema.plugin(baseSchemaPlugin);

// A vehicle can only appear once per customer's cart
cartItemSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });

module.exports = mongoose.model('CartItem', cartItemSchema);