'use strict';

const Joi = require('joi');
const { SALE_CHANNEL, PAYMENT_STATUS } = require('../../constants/enums');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const createSchema = {
  body: Joi.object({
    vehicleId: objectId.required(),
    customerId: objectId.allow(null, ''),
    salePrice: Joi.number().min(0).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    saleDate: Joi.date().iso(),
    channel: Joi.string()
      .valid(...Object.values(SALE_CHANNEL))
      .required(),
    orderId: objectId.allow(null, ''),
    paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    notes: Joi.string().max(2000).allow(null, ''),
    invoiceNumber: Joi.string().max(60).allow(null, ''),
  }),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    salePrice: Joi.number().min(0),
    currency: Joi.string().length(3).uppercase(),
    saleDate: Joi.date().iso(),
    paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    notes: Joi.string().max(2000).allow(null, ''),
    invoiceNumber: Joi.string().max(60).allow(null, ''),
  }).min(1),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    vehicleId: objectId,
    customerId: objectId,
    channel: Joi.string().valid(...Object.values(SALE_CHANNEL)),
    paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    search: Joi.string().max(120),
    sort: Joi.string().valid('saleDate', '-saleDate', 'createdAt', '-createdAt'),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = { createSchema, updateSchema, listSchema, idParamSchema };