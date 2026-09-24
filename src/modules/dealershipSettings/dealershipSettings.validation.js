'use strict';

const Joi = require('joi');

// Lenient URL — accepts full URLs or relative /uploads/... paths
const lenientUrl = Joi.string().max(2000).allow(null, '');

const upsertSchema = {
  body: Joi.object({
    businessName: Joi.string().min(2).max(200).required(),
    legalName: Joi.string().max(200).allow(null, ''),
    email: Joi.string().email().max(150).required(),
    phone: Joi.string().max(30).allow(null, ''),
    address: Joi.string().min(2).max(255).required(),
    city: Joi.string().max(100).allow(null, ''),
    country: Joi.string().min(2).max(100).required(),
    logoUrl: lenientUrl,
    websiteUrl: lenientUrl,
    defaultCurrency: Joi.string().length(3).uppercase().default('USD'),
    timezone: Joi.string().max(60).default('Asia/Kabul'),
  }),
};

const patchSchema = {
  body: Joi.object({
    businessName: Joi.string().min(2).max(200),
    legalName: Joi.string().max(200).allow(null, ''),
    email: Joi.string().email().max(150),
    phone: Joi.string().max(30).allow(null, ''),
    address: Joi.string().min(2).max(255),
    city: Joi.string().max(100).allow(null, ''),
    country: Joi.string().min(2).max(100),
    logoUrl: lenientUrl,
    websiteUrl: lenientUrl,
    defaultCurrency: Joi.string().length(3).uppercase(),
    timezone: Joi.string().max(60),
  }).min(1),
};

module.exports = { upsertSchema, patchSchema };