'use strict';

const Joi = require('joi');
const { PAYMENT_STATUS } = require('../../constants/enums');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

// Lenient URL — accepts full URLs, relative /uploads/... paths, or empty
const lenientUrl = Joi.string().max(2000).allow(null, '');

const createSchema = {
  body: Joi.object({
    vehicleId: objectId.required(),
    sellerId: objectId.required(),
    purchasePrice: Joi.number().min(0).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    purchaseDate: Joi.date().iso(),
    paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    notes: Joi.string().max(2000).allow(null, ''),
    documentUrl: lenientUrl,
  }),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    purchasePrice: Joi.number().min(0),
    currency: Joi.string().length(3).uppercase(),
    purchaseDate: Joi.date().iso(),
    paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    notes: Joi.string().max(2000).allow(null, ''),
    documentUrl: lenientUrl,
  }).min(1),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sellerId: objectId,
    vehicleId: objectId,
    paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    search: Joi.string().max(120),
    sort: Joi.string().valid('purchaseDate', '-purchaseDate', 'createdAt', '-createdAt'),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = { createSchema, updateSchema, listSchema, idParamSchema };