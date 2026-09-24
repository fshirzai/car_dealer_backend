'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { EXPENSE_CATEGORY } = require('../../constants/enums');

const { Schema } = mongoose;

const vehicleExpenseSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORY),
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD', maxlength: 3 },
    expenseDate: { type: Date, required: true, default: Date.now, index: true },
    documentUrl: { type: String, trim: true, default: null, maxlength: 2000 },
    notes: { type: String, trim: true, default: null, maxlength: 2000 },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

vehicleExpenseSchema.plugin(baseSchemaPlugin);

vehicleExpenseSchema.index({ vehicleId: 1, expenseDate: -1 });

module.exports = mongoose.model('VehicleExpense', vehicleExpenseSchema);