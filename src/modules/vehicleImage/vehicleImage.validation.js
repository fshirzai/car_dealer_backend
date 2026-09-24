'use strict';

const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

/**
 * Lenient URL validation.
 * Accepts: http(s)://..., data:image/..., relative /path, or any string up to 2000 chars.
 * For images we prefer to be permissive — the browser will fail to load invalid URLs anyway.
 */
const urlField = Joi.string().max(2000).required().messages({
  'string.empty': 'URL is required',
  'string.max': 'URL is too long (max 2000 chars)',
});

const createSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
  body: Joi.object({
    url: urlField,
    altText: Joi.string().max(200).allow(null, ''),
    sortOrder: Joi.number().integer().min(0),
    isPrimary: Joi.boolean(),
  }),
};

const bulkCreateSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
  body: Joi.object({
    images: Joi.array()
      .items(
        Joi.object({
          url: urlField,
          altText: Joi.string().max(200).allow(null, ''),
          sortOrder: Joi.number().integer().min(0),
        })
      )
      .min(1)
      .max(30)
      .required(),
  }),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    url: Joi.string().max(2000),
    altText: Joi.string().max(200).allow(null, ''),
    sortOrder: Joi.number().integer().min(0),
  }).min(1),
};

const reorderSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
  body: Joi.object({
    order: Joi.array().items(objectId).min(1).required(),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

const vehicleIdParamSchema = {
  params: Joi.object({ vehicleId: objectId.required() }),
};

module.exports = {
  createSchema,
  bulkCreateSchema,
  updateSchema,
  reorderSchema,
  idParamSchema,
  vehicleIdParamSchema,
};