'use strict';

/**
 * Global plugin applied to all schemas to standardize:
 * - toJSON / toObject transformation (id instead of _id, remove __v)
 * - virtuals
 */
const baseSchemaPlugin = (schema) => {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  });
};

module.exports = baseSchemaPlugin;