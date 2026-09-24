'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');

const { Schema } = mongoose;

const vehicleImageSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
      maxlength: 2000,
    },
    altText: { type: String, trim: true, default: null, maxlength: 200 },
    sortOrder: { type: Number, default: 0, min: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

vehicleImageSchema.plugin(baseSchemaPlugin);

// Sorted retrieval per vehicle
vehicleImageSchema.index({ vehicleId: 1, sortOrder: 1 });
// Fast lookup of the primary image
vehicleImageSchema.index({ vehicleId: 1, isPrimary: 1 });

module.exports = mongoose.model('VehicleImage', vehicleImageSchema);