'use strict';

const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const addSchema = {
  body: Joi.object({
    vehicleId: objectId.required(),
    // quantity accepted for API symmetry but must be 1 in V1
    quantity: Joi.number().integer().min(1).max(1).default(1),
  }),
};

const removeSchema = {
  body: Joi.object({
    vehicleId: objectId.required(),
  }),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string().valid('createdAt', '-createdAt'),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = { addSchema, removeSchema, listSchema, idParamSchema };