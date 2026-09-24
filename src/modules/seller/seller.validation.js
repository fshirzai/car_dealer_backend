'use strict';

const Joi = require('joi');
const { SELLER_TYPE } = require('../../constants/enums');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const createSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    type: Joi.string()
      .valid(...Object.values(SELLER_TYPE))
      .allow(null, ''),
    phone: Joi.string().allow(null, '').max(30),
    email: Joi.string().email().allow(null, '').max(150),
    address: Joi.string().allow(null, '').max(255),
    city: Joi.string().allow(null, '').max(100),
    country: Joi.string().allow(null, '').max(100),
    notes: Joi.string().allow(null, '').max(2000),
    isActive: Joi.boolean(),
  }),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    name: Joi.string().min(2).max(150),
    type: Joi.string()
      .valid(...Object.values(SELLER_TYPE))
      .allow(null, ''),
    phone: Joi.string().allow(null, '').max(30),
    email: Joi.string().email().allow(null, '').max(150),
    address: Joi.string().allow(null, '').max(255),
    city: Joi.string().allow(null, '').max(100),
    country: Joi.string().allow(null, '').max(100),
    notes: Joi.string().allow(null, '').max(2000),
    isActive: Joi.boolean(),
  }).min(1),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    type: Joi.string().valid(...Object.values(SELLER_TYPE)),
    isActive: Joi.boolean(),
    city: Joi.string().max(100),
    country: Joi.string().max(100),
    search: Joi.string().max(150),
    sort: Joi.string().valid(
      'createdAt',
      '-createdAt',
      'name',
      '-name',
      'city',
      '-city'
    ),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = {
  createSchema,
  updateSchema,
  listSchema,
  idParamSchema,
};