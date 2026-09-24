'use strict';

const Joi = require('joi');
const { USER_ROLES } = require('../../constants/enums');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID');

const createUserSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(120).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.CUSTOMER),
    phone: Joi.string().allow(null, '').max(30),
    image: Joi.string().uri().allow(null, ''),
  }),
};

const updateUserSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    name: Joi.string().min(2).max(120),
    phone: Joi.string().allow(null, '').max(30),
    image: Joi.string().uri().allow(null, ''),
    isActive: Joi.boolean(),
    role: Joi.string().valid(...Object.values(USER_ROLES)),
    emailVerifiedAt: Joi.date().allow(null),
  }).min(1),
};

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(120),
    phone: Joi.string().allow(null, '').max(30),
    image: Joi.string().uri().allow(null, ''),
  }).min(1),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};

const listUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    role: Joi.string().valid(...Object.values(USER_ROLES)),
    isActive: Joi.boolean(),
    search: Joi.string().max(120),
    sort: Joi.string().valid('createdAt', '-createdAt', 'name', '-name', 'email', '-email'),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  listUsersSchema,
  idParamSchema,
};