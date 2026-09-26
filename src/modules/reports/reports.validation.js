'use strict';

const Joi = require('joi');

const dateRangeSchema = {
  query: Joi.object({
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
  }),
};

module.exports = { dateRangeSchema };