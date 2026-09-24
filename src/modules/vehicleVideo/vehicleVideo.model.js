'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');

const { Schema } = mongoose;

const vehicleVideoSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      unique: true, // at most ONE video per vehicle in V1
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
      maxlength: 2000,
    },
    thumbnailUrl: { type: String, trim: true, default: null, maxlength: 2000 },
    title: { type: String, trim: true, default: null, maxlength: 200 },
  },
  { timestamps: true, versionKey: false }
);

vehicleVideoSchema.plugin(baseSchemaPlugin);

module.exports = mongoose.model('VehicleVideo', vehicleVideoSchema);