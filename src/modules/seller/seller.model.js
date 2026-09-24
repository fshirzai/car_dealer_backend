'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { SELLER_TYPE } = require('../../constants/enums');

const { Schema } = mongoose;

const sellerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Seller name is required'],
      trim: true,
      maxlength: 150,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(SELLER_TYPE),
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: null,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    address: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null, index: true },
    country: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

sellerSchema.plugin(baseSchemaPlugin);

// Text index for search
sellerSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Seller', sellerSchema);