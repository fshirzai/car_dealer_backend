'use strict';

const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const createSchema = {
  body: Joi.object({
    userId: objectId.required(),
    fullName: Joi.string().min(2).max(120).required(),
    phone: Joi.string().min(5).max(30).required(),
    address: Joi.string().allow(null, '').max(255),
    city: Joi.string().allow(null, '').max(100),
    country: Joi.string().allow(null, '').max(100),
    notes: Joi.string().allow(null, '').max(1000),
  }),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    fullName: Joi.string().min(2).max(120),
    phone: Joi.string().min(5).max(30),
    address: Joi.string().allow(null, '').max(255),
    city: Joi.string().allow(null, '').max(100),
    country: Joi.string().allow(null, '').max(100),
    notes: Joi.string().allow(null, '').max(1000),
  }).min(1),
};

const updateOwnSchema = {
  body: Joi.object({
    fullName: Joi.string().min(2).max(120),
    phone: Joi.string().min(5).max(30),
    address: Joi.string().allow(null, '').max(255),
    city: Joi.string().allow(null, '').max(100),
    country: Joi.string().allow(null, '').max(100),
  }).min(1),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    city: Joi.string().max(100),
    country: Joi.string().max(100),
    search: Joi.string().max(120),
    sort: Joi.string().valid(
      'createdAt',
      '-createdAt',
      'fullName',
      '-fullName'
    ),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = {
  createSchema,
  updateSchema,
  updateOwnSchema,
  listSchema,
  idParamSchema,
};