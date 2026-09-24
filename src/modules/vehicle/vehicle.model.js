'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const {
  VEHICLE_STATUS,
  FUEL_TYPE,
  TRANSMISSION,
  DRIVE_TYPE,
  BODY_TYPE,
  VEHICLE_CONDITION,
  MILEAGE_UNIT,
} = require('../../constants/enums');

const { Schema } = mongoose;

const vehicleSchema = new Schema(
  {
    stockNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    vin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: null,
    },
    engineNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: null,
    },
    make: { type: String, required: true, trim: true, index: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, index: true, maxlength: 60 },
    year: { type: Number, required: true, min: 1900, max: 2100, index: true },
    trim: { type: String, trim: true, default: null, maxlength: 60 },
    color: { type: String, trim: true, default: null, maxlength: 40 },
    bodyType: {
      type: String,
      enum: Object.values(BODY_TYPE),
      required: true,
      index: true,
    },
    fuelType: {
      type: String,
      enum: Object.values(FUEL_TYPE),
      required: true,
      index: true,
    },
    transmission: {
      type: String,
      enum: Object.values(TRANSMISSION),
      required: true,
    },
    driveType: {
      type: String,
      enum: Object.values(DRIVE_TYPE),
      required: true,
    },
    condition: {
      type: String,
      enum: Object.values(VEHICLE_CONDITION),
      required: true,
      index: true,
    },
    mileage: { type: Number, required: true, min: 0, index: true },
    mileageUnit: {
      type: String,
      enum: Object.values(MILEAGE_UNIT),
      default: MILEAGE_UNIT.KM,
      required: true,
    },
    description: { type: String, trim: true, default: null, maxlength: 5000 },
    purchasePrice: { type: Number, required: true, min: 0 },
    askingPrice: { type: Number, required: true, min: 0, index: true },
    currency: { type: String, required: true, default: 'USD', maxlength: 3 },
    status: {
      type: String,
      enum: Object.values(VEHICLE_STATUS),
      default: VEHICLE_STATUS.AVAILABLE,
      required: true,
      index: true,
    },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

vehicleSchema.plugin(baseSchemaPlugin);

/* ------------------------------------------------------------------ */
/* Unique indexes that allow multiple nulls                            */
/* ------------------------------------------------------------------ */
/* A plain `unique + sparse` index treats explicit nulls as real       */
/* values → the second doc with `vin: null` fails. A partial index on  */
/* string values allows unlimited nulls while enforcing uniqueness.    */
vehicleSchema.index(
  { vin: 1 },
  {
    unique: true,
    partialFilterExpression: { vin: { $type: 'string' } },
    name: 'vin_unique_non_null',
  }
);

vehicleSchema.index(
  { engineNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { engineNumber: { $type: 'string' } },
    name: 'engineNumber_unique_non_null',
  }
);

/* ------------------------------------------------------------------ */
/* Query indexes                                                       */
/* ------------------------------------------------------------------ */
vehicleSchema.index({ isPublished: 1, status: 1, createdAt: -1 });
vehicleSchema.index({ isPublished: 1, make: 1, model: 1, year: -1 });
vehicleSchema.index({ isPublished: 1, askingPrice: 1 });
vehicleSchema.index({ isPublished: 1, bodyType: 1, fuelType: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);