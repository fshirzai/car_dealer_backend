'use strict';

const Joi = require('joi');
const {
  VEHICLE_STATUS,
  FUEL_TYPE,
  TRANSMISSION,
  DRIVE_TYPE,
  BODY_TYPE,
  VEHICLE_CONDITION,
  MILEAGE_UNIT,
} = require('../../constants/enums');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

const baseVehicleBody = {
  vin: Joi.string().max(30).allow(null, ''),
  engineNumber: Joi.string().max(30).allow(null, ''),
  make: Joi.string().min(1).max(60).required(),
  model: Joi.string().min(1).max(60).required(),
  year: Joi.number().integer().min(1900).max(2100).required(),
  trim: Joi.string().max(60).allow(null, ''),
  color: Joi.string().max(40).allow(null, ''),
  bodyType: Joi.string().valid(...Object.values(BODY_TYPE)).required(),
  fuelType: Joi.string().valid(...Object.values(FUEL_TYPE)).required(),
  transmission: Joi.string().valid(...Object.values(TRANSMISSION)).required(),
  driveType: Joi.string().valid(...Object.values(DRIVE_TYPE)).required(),
  condition: Joi.string().valid(...Object.values(VEHICLE_CONDITION)).required(),
  mileage: Joi.number().integer().min(0).required(),
  mileageUnit: Joi.string().valid(...Object.values(MILEAGE_UNIT)).default(MILEAGE_UNIT.KM),
  description: Joi.string().max(5000).allow(null, ''),
  purchasePrice: Joi.number().min(0).required(),
  askingPrice: Joi.number().min(0).required(),
  currency: Joi.string().min(3).max(3).uppercase().default('USD'),
  isPublished: Joi.boolean(),
};

const createSchema = {
  body: Joi.object(baseVehicleBody),
};

const updateSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    vin: Joi.string().max(30).allow(null, ''),
    engineNumber: Joi.string().max(30).allow(null, ''),
    make: Joi.string().min(1).max(60),
    model: Joi.string().min(1).max(60),
    year: Joi.number().integer().min(1900).max(2100),
    trim: Joi.string().max(60).allow(null, ''),
    color: Joi.string().max(40).allow(null, ''),
    bodyType: Joi.string().valid(...Object.values(BODY_TYPE)),
    fuelType: Joi.string().valid(...Object.values(FUEL_TYPE)),
    transmission: Joi.string().valid(...Object.values(TRANSMISSION)),
    driveType: Joi.string().valid(...Object.values(DRIVE_TYPE)),
    condition: Joi.string().valid(...Object.values(VEHICLE_CONDITION)),
    mileage: Joi.number().integer().min(0),
    mileageUnit: Joi.string().valid(...Object.values(MILEAGE_UNIT)),
    description: Joi.string().max(5000).allow(null, ''),
    purchasePrice: Joi.number().min(0),
    askingPrice: Joi.number().min(0),
    currency: Joi.string().min(3).max(3).uppercase(),
    status: Joi.string().valid(...Object.values(VEHICLE_STATUS)),
    isPublished: Joi.boolean(),
  }).min(1),
};

const statusChangeSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    status: Joi.string().valid(...Object.values(VEHICLE_STATUS)).required(),
  }),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    make: Joi.string().max(60),
    model: Joi.string().max(60),
    yearMin: Joi.number().integer().min(1900).max(2100),
    yearMax: Joi.number().integer().min(1900).max(2100),
    priceMin: Joi.number().min(0),
    priceMax: Joi.number().min(0),
    mileageMax: Joi.number().integer().min(0),
    bodyType: Joi.string().valid(...Object.values(BODY_TYPE)),
    fuelType: Joi.string().valid(...Object.values(FUEL_TYPE)),
    transmission: Joi.string().valid(...Object.values(TRANSMISSION)),
    driveType: Joi.string().valid(...Object.values(DRIVE_TYPE)),
    condition: Joi.string().valid(...Object.values(VEHICLE_CONDITION)),
    status: Joi.string().valid(...Object.values(VEHICLE_STATUS)),
    isPublished: Joi.boolean(),
    search: Joi.string().max(120),
    sort: Joi.string().valid(
      'createdAt',
      '-createdAt',
      'askingPrice',
      '-askingPrice',
      'year',
      '-year',
      'mileage',
      '-mileage'
    ),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = {
  createSchema,
  updateSchema,
  statusChangeSchema,
  listSchema,
  idParamSchema,
};