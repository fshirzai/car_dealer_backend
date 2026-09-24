'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');

const { Schema } = mongoose;

const customerProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      maxlength: 30,
    },
    address: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null }, // internal notes
  },
  { timestamps: true, versionKey: false }
);

customerProfileSchema.plugin(baseSchemaPlugin);

// Index for admin searches
customerProfileSchema.index({ fullName: 'text', phone: 'text' });

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);