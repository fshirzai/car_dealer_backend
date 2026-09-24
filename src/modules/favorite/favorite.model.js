'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');

const { Schema } = mongoose;

const favoriteSchema = new Schema(
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
  },
  { timestamps: true, versionKey: false }
);

favoriteSchema.plugin(baseSchemaPlugin);

// A customer can favorite a vehicle at most once
favoriteSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);