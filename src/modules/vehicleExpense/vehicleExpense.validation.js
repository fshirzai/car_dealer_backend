'use strict';

const Joi = require('joi');
const { EXPENSE_CATEGORY } = require('../../constants/enums');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const lenientUrl = Joi.string().max(2000).allow(null, '');

const createSchema = {
  body: Joi.object({
    vehicleId: objectId.required(),
    category: Joi.string()
      .valid(...Object.values(EXPENSE_CATEGORY))
      .required(),
    description: Joi.string().min(2).max(500).required(),
    amount: Joi.number().min(0).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    expenseDate: Joi.date().iso(),
    documentUrl: lenientUrl,
    notes: Joi.string().max(2000).allow(null, ''),
  }),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    category: Joi.string().valid(...Object.values(EXPENSE_CATEGORY)),
    description: Joi.string().min(2).max(500),
    amount: Joi.number().min(0),
    currency: Joi.string().length(3).uppercase(),
    expenseDate: Joi.date().iso(),
    documentUrl: lenientUrl,
    notes: Joi.string().max(2000).allow(null, ''),
  }).min(1),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    vehicleId: objectId,
    category: Joi.string().valid(...Object.values(EXPENSE_CATEGORY)),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    search: Joi.string().max(120),
    sort: Joi.string().valid('expenseDate', '-expenseDate', 'createdAt', '-createdAt'),
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
  updateSchema,
  listSchema,
  idParamSchema,
  vehicleIdParamSchema,
};