'use strict';

const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const addSchema = {
  body: Joi.object({
    vehicleId: objectId.required(),
  }),
};

const toggleSchema = {
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

module.exports = { addSchema, toggleSchema, listSchema, idParamSchema };