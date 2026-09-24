'use strict';

const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

/**
 * Lenient URL — accepts YouTube, Vimeo, direct mp4, relative paths, etc.
 * We don't enforce `.uri()` because Joi is stricter than browsers and
 * rejects some valid URLs (e.g. without a scheme).
 */
const videoUrlField = Joi.string().max(2000).required().messages({
  'string.empty': 'Video URL is required',
  'string.max': 'Video URL is too long (max 2000 chars)',
});

const optionalUrl = Joi.string().max(2000).allow(null, '');

const upsertSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
  body: Joi.object({
    url: videoUrlField,
    thumbnailUrl: optionalUrl,
    title: Joi.string().max(200).allow(null, ''),
  }),
};

const updateSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
  body: Joi.object({
    url: Joi.string().max(2000),
    thumbnailUrl: optionalUrl,
    title: Joi.string().max(200).allow(null, ''),
  }).min(1),
};

const vehicleIdParamSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
};

module.exports = {
  upsertSchema,
  updateSchema,
  vehicleIdParamSchema,
};