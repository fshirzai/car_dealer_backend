'use strict';

const Joi = require('joi');
const { ACTION } = require('./auditLog.constants');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(200),
    userId: objectId,
    action: Joi.string().valid(...Object.values(ACTION)),
    entityType: Joi.string().max(80),
    entityId: Joi.string().max(80),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    search: Joi.string().max(120),
    sort: Joi.string().valid('createdAt', '-createdAt'),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

const entityParamSchema = {
  params: Joi.object({
    entityType: Joi.string().max(80).required(),
    entityId: Joi.string().max(80).required(),
  }),
};

module.exports = { listSchema, idParamSchema, entityParamSchema };