'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { ORDER_STATUS } = require('../../constants/enums');

const { Schema } = mongoose;

/* ------------------------------------------------------------------ */
/* OrderItem (embedded)                                                */
/* ------------------------------------------------------------------ */
const orderItemSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    // Snapshots — immutable at order time
    vehicleName: { type: String, required: true, trim: true },
    vehicleStockNumber: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD', maxlength: 3 },
    quantity: { type: Number, required: true, default: 1, min: 1, max: 1 },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

/* ------------------------------------------------------------------ */
/* Order                                                               */
/* ------------------------------------------------------------------ */
const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      required: true,
      index: true,
    },

    // Customer snapshots — capture at order time
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    customerAddress: { type: String, trim: true, default: null },
    customerNotes: { type: String, trim: true, default: null, maxlength: 2000 },

    // Staff only
    staffNotes: { type: String, trim: true, default: null, maxlength: 2000 },

    // Status timestamps
    contactedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: null, maxlength: 1000 },

    // Items
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least one item',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.plugin(baseSchemaPlugin);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Convenience
orderSchema.virtual('itemCount').get(function () {
  return this.items?.length || 0;
});

orderSchema.methods.isCancellableByCustomer = function () {
  return this.status === ORDER_STATUS.PENDING;
};

orderSchema.methods.isTerminal = function () {
  return [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(this.status);
};

module.exports = mongoose.model('Order', orderSchema);