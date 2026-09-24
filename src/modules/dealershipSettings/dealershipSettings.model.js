'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { SINGLETON_ID } = require('./dealershipSettings.constants');

const { Schema } = mongoose;

const dealershipSettingsSchema = new Schema(
  {
    _id: { type: String, default: SINGLETON_ID }, // fixed id enforces singleton
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: 200,
    },
    legalName: { type: String, trim: true, default: null, maxlength: 200 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, trim: true, default: null, maxlength: 30 },
    address: { type: String, trim: true, required: true, maxlength: 255 },
    city: { type: String, trim: true, default: null, maxlength: 100 },
    country: { type: String, trim: true, required: true, maxlength: 100 },
    logoUrl: { type: String, trim: true, default: null, maxlength: 2000 },
    websiteUrl: { type: String, trim: true, default: null, maxlength: 2000 },
    defaultCurrency: {
      type: String,
      required: true,
      default: 'USD',
      maxlength: 3,
      uppercase: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kabul',
      maxlength: 60,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    // _id is a string; don't let mongoose auto-generate an ObjectId
    _id: false,
  }
);

dealershipSettingsSchema.plugin(baseSchemaPlugin);

module.exports = mongoose.model('DealershipSettings', dealershipSettingsSchema);