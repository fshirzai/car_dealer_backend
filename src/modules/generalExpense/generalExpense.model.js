'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { GENERAL_EXPENSE_CATEGORY } = require('../../constants/enums');

const { Schema } = mongoose;

const generalExpenseSchema = new Schema(
  {
    category: {
      type: String,
      enum: Object.values(GENERAL_EXPENSE_CATEGORY),
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

generalExpenseSchema.plugin(baseSchemaPlugin);

generalExpenseSchema.index({ expenseDate: -1 });

module.exports = mongoose.model('GeneralExpense', generalExpenseSchema);